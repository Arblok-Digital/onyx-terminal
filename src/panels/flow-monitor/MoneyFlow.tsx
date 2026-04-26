import { useEffect, useState } from "react";
import { formatUsd, formatCompact } from "@/utils/format";
import { getTokensBatch } from "@/feeds/dexscreener";
import ShareButton from "@/components/ShareButton";
import styles from "./FlowMonitor.module.css";

const SHARE_URL = "https://onyx-terminal-v1.vercel.app";

interface FlowData {
  symbol: string;
  netFlow: number;
  buyVol: number;
  sellVol: number;
  ratio: number; // 0 to 100
}

export default function MoneyFlow() {
  const [flows, setFlows] = useState<FlowData[]>([]);
  const [loading, setLoading] = useState(true);

  const targetMints = [
    "So11111111111111111111111111111111111111112", // SOL
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // JUP
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // RAY
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"  // BONK
  ];

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        const data = await getTokensBatch(targetMints);
        const mapped = data.map(token => {
          const totalVol = token.volume24h || 0;
          const buys = token.txns24h?.buys || 0;
          const sells = token.txns24h?.sells || 0;
          const totalTx = buys + sells;
          
          const buyRatio = totalTx > 0 ? buys / totalTx : 0.5;
          const buyVol = totalVol * buyRatio;
          const sellVol = totalVol * (1 - buyRatio);

          return {
            symbol: token.symbol,
            netFlow: buyVol - sellVol,
            buyVol,
            sellVol,
            ratio: buyRatio * 100
          };
        });
        setFlows(mapped);
      } catch (e) {
        console.error("Flow fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFlows();
    const interval = setInterval(fetchFlows, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.tabContent}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>TOKEN</th>
            <th>NET FLOW</th>
            <th className={styles.right}>TREND (BUY/SELL)</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={3} className={styles.empty}>
                Calculating money flows...
              </td>
            </tr>
          )}
          {flows.map((f) => {
            const shareText = `📊 ${f.symbol}\n` +
              `💧 Net Flow: ${f.netFlow > 0 ? "+" : ""}${formatCompact(f.netFlow)}\n` +
              `🟢 Buy Vol: ${formatCompact(f.buyVol)}\n` +
              `🔴 Sell Vol: ${formatCompact(f.sellVol)}\n` +
              `📈 Buy Ratio: ${f.ratio.toFixed(0)}%\n\n` +
              `Tracked on Onyx Terminal 👁\n` +
              `#OnyxTerminal #MoneyFlow #Solana`;

            return (
              <tr key={f.symbol} className={styles.row}>
              <td className={styles.bold}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {f.symbol}
                  <ShareButton text={shareText} url={SHARE_URL} />
                </div>
              </td>
              <td>
                <span className={`${styles.mono} ${f.netFlow > 0 ? styles.textGreen : styles.textRed}`}>
                  {f.netFlow > 0 ? "+" : ""}{formatCompact(f.netFlow)}
                </span>
              </td>
              <td>
                <div className={styles.flowContainer}>
                  <div className={styles.flowMetrics}>
                    <span className={styles.miniMono}>{formatCompact(f.buyVol)}</span>
                    <span className={styles.miniMono}>{formatCompact(f.sellVol)}</span>
                  </div>
                  <div className={styles.barTrack}>
                    <div 
                      className={styles.barFill} 
                      style={{ 
                        width: `${f.ratio}%`,
                        backgroundColor: f.ratio > 50 ? "var(--accent-green)" : "var(--accent-red)"
                      }} 
                    />
                  </div>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}