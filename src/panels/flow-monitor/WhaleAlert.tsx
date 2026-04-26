import { useEffect, useState, useRef } from "react";
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
  signature: string;
  timestamp: number;
}

const SOL_MINT = "So11111111111111111111111111111111111111112";
const SHARE_URL = "https://onyx-terminal-v1.vercel.app";

export default function WhaleAlert() {
  const [alerts, setAlerts] = useState<WhaleTx[]>([]);
  const [isLive, setIsLive] = useState(!!CONFIG.HELIUS_API_KEY);
  const wsRef = useRef<WebSocket | null>(null);

  // Ambil harga SOL realtime dari global store
  const solPrice = usePriceStore(
    (s) => s.tokens[SOL_MINT.toLowerCase()]?.priceUsd || 86
  );

  // Mock Data Generator
  const generateMock = (): WhaleTx => ({
    id: Math.random().toString(36).substr(2, 9),
    token: ["SOL", "JUP", "RAY", "BONK", "TRUMP"][Math.floor(Math.random() * 5)],
    type: Math.random() > 0.5 ? "BUY" : "SELL",
    amount: 5000 + Math.random() * 150000,
    wallet: "7xKX...v9Wp",
    age: "2m",
    signature: "5UzB...3xYz",
    timestamp: Date.now(),
  });

  useEffect(() => {
    if (!CONFIG.HELIUS_API_KEY) {
      const interval = setInterval(() => {
        setAlerts(prev => [generateMock(), ...prev].slice(0, 50));
      }, 4000);
      return () => clearInterval(interval);
    }

    // Helius WebSocket Implementation
    const wsUrl = `wss://mainnet.helius-rpc.com/?api-key=${CONFIG.HELIUS_API_KEY}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "transactionSubscribe",
        params: [{
          accountInclude: [
            "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
            "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
            "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"
          ]
        }]
      }));
    };

    ws.onmessage = (e) => {
      try {
        const response = JSON.parse(e.data);
        const result = response.params?.result;
        if (!result || result.transaction?.meta?.err) return;

        const meta = result.transaction.meta;
        const idx = PostBalIndex(meta);
        const safeIdx = idx !== -1 ? idx : 0;
        const preBal = meta.preBalances[safeIdx];
        const postBal = meta.postBalances[safeIdx];
        
        // Kalkulasi nilai USD menggunakan harga realtime dari store
        const solDiff = Math.abs(postBal - preBal) / 1e9;
        const usdValue = solDiff * solPrice; 

        if (usdValue > 5000) {
          const isSell = postBal < preBal;
          const newTx: WhaleTx = {
            id: result.signature,
            token: "SOL",
            type: isSell ? "SELL" : "BUY",
            amount: usdValue,
            wallet: formatAddress(result.transaction.message.accountKeys[0]),
            age: "NOW",
            signature: result.signature,
            timestamp: Date.now()
          };
          setAlerts(prev => [newTx, ...prev].slice(0, 40));
        }
      } catch (err) {
        console.error("WS Parse Error", err);
      }
    };
    
    // Helper untuk mencari index balance yang berubah
    function PostBalIndex(meta: any) {
      return meta.postBalances.findIndex((b: number, i: number) => b !== meta.preBalances[i]);
    }

    ws.onerror = () => setIsLive(false);
    ws.onclose = () => {
      setTimeout(() => {
        // Auto reconnect logic could go here
      }, 5000);
    };

    return () => ws.close();
  }, []);

  const getBadgeClass = (amt: number) => {
    if (amt >= 100000) return styles.badgeMega;
    if (amt >= 50000) return styles.badgeWhale;
    if (amt >= 10000) return styles.badgeLarge;
    return styles.badgeMid;
  };

  const getBadgeLabel = (amt: number) => {
    if (amt >= 100000) return "MEGA";
    if (amt >= 50000) return "WHALE";
    if (amt >= 10000) return "LARGE";
    return "MID";
  };

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
                  <span className={`${styles.badge} ${getBadgeClass(tx.amount)}`}>
                    {getBadgeLabel(tx.amount)}
                  </span>
                </div>
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