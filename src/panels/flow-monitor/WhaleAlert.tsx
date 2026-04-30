import { useEffect, useState, useRef, useCallback } from "react";
import { CONFIG } from "@/core/config";
import { usePriceStore } from "@/core/store/price.store";
import { bus } from "@/core/event-bus";
import { formatAddress, formatUsd, formatCompact } from "@/utils/format";
import { trackWhale, trackSignal, trackUserEvent } from "@/core/analytics";
import ShareButton from "@/components/ShareButton";
import styles from "./FlowMonitor.module.css";

interface WhaleTx {
  id: string;
  address: string;
  token: string;
  netFlow: number;
  buyVolume: number;
  sellVolume: number;
  signal: "STRONG BUY" | "BUY" | "STRONG SELL" | "NEUTRAL";
  confidence: number;
  timestamp: number;
  count: number;
}

interface AggregatedData {
  buyVolume: number;
  sellVolume: number;
  address: string;
  count: number;
}

const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUP_PROGRAM = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const RAYDIUM_PROGRAM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const ORCA_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
const PUMP_FUN_PROGRAM = "6EF8rSdwUbsmJkXN9v6Kkq8uQU4n56AgY1iM37W2nzn";

// Configurable Thresholds (Adjust for production, lower for testing visibility)
const MIN_TX_USD_VALUE = 500; // Original: 5000. Lowered for testing visibility.
const MIN_IMPACT_PERCENT = 0.001; // Original: 0.01 (1%). Lowered for testing visibility (0.1%).
const ANTI_FAKE_MIN_COUNT = 1; // Original: 2. Lowered for testing visibility.
const ANTI_FAKE_MIN_VOLUME = 0; // Original: 10000. Lowered for testing visibility.
const STRONG_BUY_NETFLOW = 10000;
const BUY_NETFLOW = 5000;
const STRONG_SELL_NETFLOW = -10000;
const STRONG_BUY_RATIO = 1.5;
const STRONG_SELL_RATIO = 0.7;

export default function WhaleAlert() {
  const [alerts, setAlerts] = useState<WhaleTx[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [wsStatus, setWsStatus] = useState<"LIVE" | "RECONNECTING" | "OFFLINE">(
    CONFIG.HELIUS_API_KEY ? "RECONNECTING" : "OFFLINE"
  );
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchRef = useRef<number>(0);
  
  // Store untuk agregasi 30 detik
  const aggregationMap = useRef<Map<string, AggregatedData>>(new Map());

  const getSolPrice = () => usePriceStore.getState().tokens[SOL_MINT.toLowerCase()]?.priceUsd || 150;

  // FIX: Pindahkan logic fetch ke luar useCallback dependency solPrice 
  // agar WebSocket tidak reconnect terus menerus.
  const processTransaction = async (signature: string) => {
    if (!signature) return;
    
    // Rate Limit Guard untuk Free Tier: Maksimal 1 request tiap 1.5 detik
    const now = Date.now();
    if (now - lastFetchRef.current < 1500) return;
    lastFetchRef.current = now;

    try {
      const response = await fetch(
        `https://api.helius.xyz/v0/transactions/?api-key=${CONFIG.HELIUS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: [signature] })
        }
      );
      
      if (response.status === 429) {
        console.warn("[Whale] Helius API Rate Limited! ⚠️");
        return;
      }

      const data = await response.json();
      const tx = data[0];
      if (!tx) return;

      const currentSolPrice = getSolPrice();
      const tokenTransfer = tx.tokenTransfers?.find((t: any) => t.mint !== SOL_MINT);
      const nativeTransfer = tx.nativeTransfers?.find((n: any) => n.amount > 1e7);
      
      const mint = tokenTransfer?.mint || SOL_MINT;
      const snap = usePriceStore.getState().tokens[mint.toLowerCase()];
      const liquidity = snap?.liquidity || 0;
      const tokenSym = snap?.symbol || tokenTransfer?.symbol || "TOKEN";

      let amountUsd = 0;
      if (nativeTransfer) {
        amountUsd = (nativeTransfer.amount / 1e9) * currentSolPrice;
      } else if (tokenTransfer) {
        const price = snap?.priceUsd || 0;
        amountUsd = (tokenTransfer.tokenAmount || 0) * price;
        if (amountUsd === 0 && tx.nativeTransfers?.[0]) {
          amountUsd = (tx.nativeTransfers[0].amount / 1e9) * currentSolPrice;
        }
      }

      // 1. Abaikan transaksi di bawah MIN_TX_USD_VALUE
      if (amountUsd < MIN_TX_USD_VALUE) {
        console.log(`[Whale] Ignored TX: ${tokenSym} | ${formatUsd(amountUsd)} (Below ${formatUsd(MIN_TX_USD_VALUE)})`);
        return;
      }

      // 2. Hitung impact, abaikan jika < 1%
      const impact = liquidity > 0 ? amountUsd / liquidity : 1; // Default to 1 if no liquidity to avoid division by zero and always pass
      if (impact < MIN_IMPACT_PERCENT && liquidity > 0) { // Only filter if liquidity is known
        console.log(`[Whale] Ignored TX: ${tokenSym} | ${formatUsd(amountUsd)} (Impact ${impact.toFixed(4)}% < ${MIN_IMPACT_PERCENT * 100}%)`);
        return;
      }

      // 3. Tentukan arah: BUY jika SOL masuk (User bayar SOL), SELL sebaliknya
      const isBuy = tx.nativeTransfers?.some((n: any) => n.fromUserAccount === tx.feePayer);
      
      // 4. Agregasi data per token
      const current = aggregationMap.current.get(tokenSym) || { buyVolume: 0, sellVolume: 0, count: 0, address: mint };
      if (isBuy) current.buyVolume += amountUsd;
      else current.sellVolume += amountUsd;
      current.count += 1;
      current.address = mint; // Update address to ensure we have it

      aggregationMap.current.set(tokenSym, current);
      console.log(`[Aggregator] Added ${tokenSym}: +${formatUsd(amountUsd)} (${isBuy ? 'BUY' : 'SELL'})`);
    } catch (err) {
      console.error("[Whale] Process Error:", err);
    }
  };

  // 5. Processor interval 30 detik
  useEffect(() => {
    const interval = setInterval(() => {
      if (aggregationMap.current.size === 0) return;

      const newSignals: WhaleTx[] = [];
      aggregationMap.current.forEach((data, token) => {
        // 7. Filter anti fake
        const totalVol = data.buyVolume + data.sellVolume;
        if (data.count < ANTI_FAKE_MIN_COUNT && totalVol < ANTI_FAKE_MIN_VOLUME) {
          console.log(`[Aggregator] Ignored Signal: ${token} (Anti-fake filter: count=${data.count}, vol=${formatUsd(totalVol)})`);
          return;
        }

        const netFlow = data.buyVolume - data.sellVolume;
        const ratio = data.sellVolume > 0 ? data.buyVolume / data.sellVolume : data.buyVolume > 0 ? 2 : 1;

        // 6. Tentukan Signal
        let signal: WhaleTx["signal"] = "NEUTRAL";
        if (netFlow > STRONG_BUY_NETFLOW && ratio > STRONG_BUY_RATIO) signal = "STRONG BUY";
        else if (netFlow > BUY_NETFLOW) signal = "BUY";
        else if (netFlow < STRONG_SELL_NETFLOW && ratio < STRONG_SELL_RATIO) signal = "STRONG SELL";


        if (signal === "NEUTRAL") return;

        // 9. Confidence
        const confidence = Math.min(1, (Math.abs(netFlow) / 20000) + (data.count / 10));

        newSignals.push({
          id: `${token}-${Date.now()}`,
          address: data.address,
          token,
          netFlow,
          buyVolume: data.buyVolume,
          sellVolume: data.sellVolume,
          signal,
          confidence,
          timestamp: Date.now(),
          count: data.count
        });

        // Kirim ke analytics
        trackSignal(signal, token);
        trackWhale("AGGREGATED", signal, { token, netFlow, ratio, confidence }); // Added token to metadata
      });

      if (newSignals.length > 0) {
        setAlerts(prev => [...newSignals, ...prev].slice(0, 50));
      }
      aggregationMap.current.clear();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!CONFIG.HELIUS_API_KEY) return;

    // Guard: Jangan buat koneksi baru kalau sedang menyambung
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const wsUrl = `wss://mainnet.helius-rpc.com/?api-key=${CONFIG.HELIUS_API_KEY}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Helius WS Connected ✅');
      setWsStatus("LIVE");
      setIsLive(true);
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'logsSubscribe',
        params: [
          { mentions: [JUP_PROGRAM, RAYDIUM_PROGRAM, ORCA_PROGRAM, PUMP_FUN_PROGRAM] },
          { commitment: 'confirmed' }
        ]
      }));
    };

    ws.onmessage = (e) => {
      try {
        const response = JSON.parse(e.data);
        if (response.params?.result?.value?.logs) {
          const logs = response.params.result.value.logs as string[];
          const signature = response.params.result.value.signature;
          
          // Cari indikasi aktivitas DEX di log
          const isSwap = logs.some(l => 
            l.toLowerCase().includes('swap') || 
            l.toLowerCase().includes('buy') ||
            l.toLowerCase().includes('sell') ||
            l.toLowerCase().includes('instruction: route') || // Jupiter
            l.toLowerCase().includes('instruction: swap')
          );
          
          if (isSwap && signature) {
            console.log(`[Whale] Swap log detected! Analyzing: ${signature.slice(0,8)}...`);
            processTransaction(signature);
          }
        }
      } catch (err) { console.error("WS Parse Error", err); }
    };
    ws.onerror = () => setWsStatus("RECONNECTING");
    ws.onclose = () => {
      setWsStatus("RECONNECTING");
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    };
  }, []); // Kosongkan dependency agar koneksi WS stabil

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectWebSocket]);

  return (
    <div className={styles.tabContent}>
      <div style={{ padding: '8px 12px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
        <div 
          style={{ 
            width: '8px', height: '8px', borderRadius: '50%', 
            backgroundColor: isLive ? '#2ecc71' : '#e74c3c',
            boxShadow: isLive ? '0 0 8px #2ecc71' : 'none'
          }} 
        />
        <span style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>System Status: {isLive ? 'Live Connection' : 'Reconnecting...'}</span>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>TOKEN</th>
            <th>SIGNAL</th>
            <th>NET FLOW</th>
            <th>BUY/SELL VOL</th>
            <th>CONFIDENCE</th>
            <th>ACTIVITY</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((tx) => {
            return (
              <tr 
                key={tx.id} 
                className={styles.row} 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  bus.emit("token:select", { 
                    address: tx.address, 
                    symbol: tx.token,
                    chain: 'solana'
                  });
                  trackUserEvent("whale_inspect", { symbol: tx.token, address: tx.address });
                }}
              >
              <td className={styles.bold}>{tx.token}</td>
              <td>
                <span className={tx.signal.includes("BUY") ? styles.textGreen : styles.textRed}>
                  {tx.signal}
                </span>
              </td>
              <td>
                <span className={tx.netFlow > 0 ? styles.textGreen : styles.textRed}>
                  {tx.netFlow > 0 ? "+" : ""}{formatUsd(tx.netFlow)}
                </span>
              </td>
              <td>
                <div className={styles.miniMono}>{formatUsd(tx.buyVolume)} / {formatUsd(tx.sellVolume)}</div>
              </td>
              <td>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${tx.confidence * 100}%`, backgroundColor: 'var(--accent)' }} />
                </div>
              </td>
              <td className={styles.mono}>{tx.count} txns</td>
            </tr>
            );
          })}
          {alerts.length === 0 && (
            <tr>
              <td colSpan={6} className={styles.empty}>
                Waiting for big fish...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}