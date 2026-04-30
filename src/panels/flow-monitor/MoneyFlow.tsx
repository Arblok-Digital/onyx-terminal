import { useEffect, useState, useMemo } from "react";
import { formatCompact } from "@/utils/format";
import { subscribePrices, getLatestProfiles } from "@/feeds/dexscreener";
import { usePriceList } from "@/hooks/usePrice";
import { usePriceStore } from "@/core/store/price.store";
import { bus } from "@/core/event-bus";
import { trackUserEvent, trackSwap } from "@/core/analytics";
import ShareButton from "@/components/ShareButton";
import styles from "./FlowMonitor.module.css";

const SHARE_URL = "https://onyx-terminal-v1.vercel.app";

interface FlowData {
  address: string;
  chain: string;
  symbol: string;
  netFlow: number;
  buyVol: number;
  sellVol: number;
  ratio: number; // 0 to 100
  velocity: number; // Activity score
}

export default function MoneyFlow() {
  const [monitoredAddresses, setMonitoredAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const lastRefreshAt = usePriceStore((s) => s.lastRefreshAt);

  const targetMints = [
    "So11111111111111111111111111111111111111112", // SOL
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // JUP
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"  // BONK
  ];

  // Data consumption dari Global Store
  const snapshots = usePriceList(monitoredAddresses);

  const flows = useMemo(() => {
    return snapshots
      .filter((token) => token.chain === "solana")
      .map((token) => {
        const totalVol = token.volume5m || 0;
        const liquidity = token.liquidity || 1; // Avoid division by zero
        const buys = token.txns5m?.buys || 0;
        const sells = token.txns5m?.sells || 0;
        const totalTx = buys + sells;

        const buyRatio = totalTx > 0 ? buys / totalTx : 0.5;
        const buyVol = totalVol * buyRatio;
        const sellVol = totalVol * (1 - buyRatio);
        
        // Logic Velocity/Liquidity: Seberapa besar vol 5m dibanding total pool
        const velocityScore = (totalVol / liquidity) * 100;

        return {
          address: token.address,
          chain: token.chain,
          symbol: token.symbol,
          netFlow: buyVol - sellVol,
          buyVol,
          sellVol,
          ratio: buyRatio * 100,
          velocity: velocityScore,
        };
      })
      .sort((a, b) => Math.abs(b.netFlow) - Math.abs(a.netFlow));
  }, [snapshots]);

  useEffect(() => {
    const initDiscovery = async () => {
      try {
        // Temukan koin baru yang sedang trending di Solana
        const latest = await getLatestProfiles();
        const solanaMints = latest
          .filter(p => p.chainId === 'solana')
          .slice(0, 15)
          .map(p => p.tokenAddress);

        const allMints = Array.from(new Set([...targetMints, ...solanaMints]));
        setMonitoredAddresses(allMints);
      } catch (e) { 
        setMonitoredAddresses(targetMints);
      } finally {
        setLoading(false);
      }
    };

    initDiscovery();
  }, []);

  // Life-cycle management: Subscribe ke feed DexScreener sesuai pola global
  useEffect(() => {
    if (monitoredAddresses.length === 0) return;
    
    const unsubscribe = subscribePrices(
      () => monitoredAddresses,
      300000 // Perketat refresh ke 5 menit (300.000 ms)
    );

    return () => unsubscribe();
  }, [monitoredAddresses]);

  return (
    <div className={styles.tabContent}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>TOKEN (SOL)</th>
            <th>NET FLOW (5M)</th>
            <th>ACTIVITY (V/L)</th>
            <th className={styles.right}>5M TREND (BUY/SELL)</th>
          </tr>
        </thead>
        <tbody>
          {loading && snapshots.length === 0 && (
            <tr>
              <td colSpan={3} className={styles.empty}>
                Calculating money flows...
              </td>
            </tr>
          )}
          {flows.map((f) => {
            const shareText = `📊 ${f.symbol}\n` +
              `� 5m Net Flow: ${f.netFlow > 0 ? "+" : ""}${formatCompact(f.netFlow)}\n` +
              `🟢 5m Buy Vol: ${formatCompact(f.buyVol)}\n` +
              `🔴 5m Sell Vol: ${formatCompact(f.sellVol)}\n` +
              `📈 5m Buy Ratio: ${f.ratio.toFixed(0)}%\n\n` +
              `Tracked on Onyx Terminal 👁\n` +
              `#OnyxTerminal #MoneyFlow #Solana`;

            return (
              <tr 
                key={f.address} 
                className={styles.row}
                onClick={() => {
                  bus.emit("token:select", { 
                    address: f.address, 
                    symbol: f.symbol,
                    chain: f.chain 
                  });
                  
                  // Track user klik koin dan arahkan pipeline ke Swap
                  trackUserEvent("token_inspect", { symbol: f.symbol, address: f.address });
                }}
              >
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
                <span className={styles.mono} style={{ color: f.velocity > 10 ? '#f39c12' : '#6b7280' }}>
                  {f.velocity.toFixed(1)}%
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