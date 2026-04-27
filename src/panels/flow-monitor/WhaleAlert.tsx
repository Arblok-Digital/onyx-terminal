import { useEffect, useState, useRef, useCallback } from "react";
import { CONFIG } from "@/core/config";
import { usePriceStore } from "@/core/store/price.store";
import { formatAddress, formatUsd } from "@/utils/format";
import ShareButton from "@/components/ShareButton";
import styles from "./FlowMonitor.module.css";

interface WhaleTx {
  id: string;
  token: string;
  type: "BUY" | "SELL";
  amount: number;
  wallet: string;
  age: string;
  mcap: number;
  impact: "WHALE" | "ACCUM" | "MID";
  signature: string;
  timestamp: number;
}

const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUP_PROGRAM = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const RAYDIUM_PROGRAM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const ORCA_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
const PUMP_FUN_PROGRAM = "6EF8rSdwUbsmJkXN9v6Kkq8uQU4n56AgY1iM37W2nzn";
const SHARE_URL = "https://onyx-terminal-v1.vercel.app";

export default function WhaleAlert() {
  const [alerts, setAlerts] = useState<WhaleTx[]>([]);
  const [isLive, setIsLive] = useState(!!CONFIG.HELIUS_API_KEY);
  const [wsStatus, setWsStatus] = useState<"LIVE" | "RECONNECTING" | "OFFLINE">(
    CONFIG.HELIUS_API_KEY ? "RECONNECTING" : "OFFLINE"
  );
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ambil harga SOL realtime dari global store
  const solPrice = usePriceStore(
    (s) => s.tokens[SOL_MINT.toLowerCase()]?.priceUsd || 86
  );

  // Mock Data Generator (Keep for offline)
  const generateMock = (): WhaleTx => ({
    id: Math.random().toString(36).substr(2, 9),
    token: ["SOL", "JUP", "RAY", "BONK", "TRUMP"][Math.floor(Math.random() * 5)],
    type: Math.random() > 0.5 ? "BUY" : "SELL",
    amount: 5000 + Math.random() * 150000,
    wallet: "7xKX...v9Wp",
    age: "2m",
    mcap: 1000000,
    impact: "ACCUM",
    signature: "5UzB...3xYz",
    timestamp: Date.now(),
  });

  const fetchTransactionDetail = useCallback(async (signature: string) => {
    try {
      const response = await fetch(
        `https://api.helius.xyz/v0/transactions/?api-key=${CONFIG.HELIUS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: [signature] })
        }
      );
      const data = await response.json();
      const tx = data[0];
      if (!tx) return;

      // Ambil SOL price paling fresh dari store saat fungsi dipanggil
      const currentSolPrice = usePriceStore.getState().tokens[SOL_MINT.toLowerCase()]?.priceUsd || 200;
      
      const tokenTransfer = tx.tokenTransfers?.find((t: any) => t.mint !== SOL_MINT);
      const nativeTransfer = tx.nativeTransfers?.[0];
      
      const mint = tokenTransfer?.mint || SOL_MINT;
      const snap = usePriceStore.getState().tokens[mint.toLowerCase()];
      
      // Mcap Detection
      const mcap = snap?.marketCap || snap?.fdv || 0;
      const tokenSym = snap?.symbol || "SOL";

      let amountUsd = 0;
      
      // PRIORITAS: Pake nilai SOL yang ditransaksikan buat dapet USD value paling akurat buat koin micin
      if (nativeTransfer) {
        amountUsd = (nativeTransfer.amount / 1e9) * currentSolPrice;
      } else if (tokenTransfer) {
        const price = snap?.priceUsd || 0;
        amountUsd = (tokenTransfer.tokenAmount || 0) * price;
      }

      // Threshold diturunkan ke $500 sesuai permintaan untuk koin baru
      if (amountUsd > 500) {
        const ratio = mcap > 0 ? amountUsd / mcap : 0;
        let impactLabel: "WHALE" | "ACCUM" | "MID" = "MID";
        
        // Logic Persepsi: 
        // WHALE: Beli > 1% dari total Market Cap
        // ACCUM: Beli nominal besar (> $1000) tapi cap sudah gede
        if (ratio > 0.01) impactLabel = "WHALE"; 
        else if (amountUsd > 1000) impactLabel = "ACCUM";

        const newTx: WhaleTx = {
          id: signature,
          token: tokenSym,
          type: tx.type === "SELL" ? "SELL" : "BUY",
          amount: amountUsd,
          wallet: formatAddress(tx.feePayer),
          age: "NOW",
          mcap,
          impact: impactLabel,
          signature,
          timestamp: Date.now()
        };
        setAlerts(prev => [newTx, ...prev].slice(0, 40));
      }
    } catch (err) {
      console.error("Helius Detail Fetch Error", err);
    }
  }, [solPrice]);

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
          const isSwap = logs.some(l => l.includes('Swap') || l.includes('Buy'));
          if (isSwap) fetchTransactionDetail(signature);
        }
      } catch (err) { console.error("WS Parse Error", err); }
    };

    ws.onerror = () => setWsStatus("RECONNECTING");
    ws.onclose = () => {
      setWsStatus("RECONNECTING");
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    };
  }, [fetchTransactionDetail]); // fetchTransactionDetail sekarang stable

  useEffect(() => {
    if (!CONFIG.HELIUS_API_KEY) {
      const interval = setInterval(() => {
        setAlerts(prev => [generateMock(), ...prev].slice(0, 50));
      }, 4000);
      return () => clearInterval(interval);
    }

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
      {!isLive && (
        <div className={styles.banner}>
          ⚠️ Add VITE_HELIUS_API_KEY for live whale data
        </div>
      )}
      
      <table className={styles.table}>
        <thead>
          <tr>
            <th>TOKEN</th>
            <th>TYPE</th>
            <th>AMOUNT</th>
            <th>MCAP</th>
            <th>IMPACT</th>
            <th>WALLET</th>
            <th>TX</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((tx) => {
            const shareText = `🚨 WHALE ALERT\n` +
              `🪙 Token: ${tx.token}\n` +
              `⚡ Type: ${tx.type}\n` +
              `💰 Amount: ${formatUsd(tx.amount)}\n` +
              `👛 Wallet: ${tx.wallet}\n\n` +
              `Tracked on Onyx Terminal 👁\n` +
              `#OnyxTerminal #WhaleAlert #SolanaGems`;

            return (
              <tr key={tx.id} className={styles.row}>
              <td className={styles.mono}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {tx.token}
                  <ShareButton text={shareText} url={SHARE_URL} />
                </div>
              </td>
              <td>
                <span className={tx.type === "BUY" ? styles.textGreen : styles.textRed}>
                  {tx.type}
                </span>
              </td>
              <td>
                <div className={styles.amtCell}>
                  <span className={styles.mono}>{formatUsd(tx.amount)}</span>
                </div>
              </td>
              <td className={styles.miniMono}>{tx.mcap > 0 ? formatCompact(tx.mcap) : "—"}</td>
              <td>
                <span className={`${styles.badge} ${tx.impact === 'WHALE' ? styles.badgeWhale : tx.impact === 'ACCUM' ? styles.badgeMid : styles.badgeLarge}`}>
                  {tx.impact}
                </span>
              </td>
              <td className={styles.mono}>{tx.wallet}</td>
              <td>
                <a href={`https://solscan.io/tx/${tx.signature}`} target="_blank" className={styles.txLink}>
                  ↗
                </a>
              </td>
            </tr>
            );
          })}
          {alerts.length === 0 && (
            <tr>
              <td colSpan={5} className={styles.empty}>
                Waiting for big fish...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}