import { useEffect, useState, useMemo } from "react";
import { usePriceStore } from "@/core/store/price.store";
import { bus } from "@/core/event-bus";
import { formatUsd } from "@/utils/format";
import { trackSignal, trackUserEvent } from "@/core/analytics";
import styles from "./FlowMonitor.module.css";

interface WhaleTx {
  id: string;
  address: string;
  token: string;
  netFlow: number;
  buyVolume: number;
  sellVolume: number;
  signal: "ACCUMULATION" | "WHALE ENTRY" | "DISTRIBUTION" | "MOMENTUM";
  confidence: number;
  timestamp: number;
  count: number;
}

export default function WhaleAlert() {
  const tokens = usePriceStore((s) => s.tokens);
  
  const alerts = useMemo<WhaleTx[]>(() => {
    const list: WhaleTx[] = [];
    Object.values(tokens).forEach((t) => {
      const vol5m = t.volume5m || 0;
      const priceChange5m = t.priceChange5m || 0;
      const txns = t.txns5m || { buys: 0, sells: 0 };
      const totalTx = txns.buys + txns.sells;

      const HIGH_VOL_THRESHOLD = 5000;
      let signal: WhaleTx["signal"] | null = null;

      if (vol5m > HIGH_VOL_THRESHOLD && Math.abs(priceChange5m) < 1) {
        signal = "ACCUMULATION";
      } else if (vol5m > HIGH_VOL_THRESHOLD && priceChange5m > 3) {
        signal = "WHALE ENTRY";
      } else if (vol5m > HIGH_VOL_THRESHOLD && priceChange5m < -3) {
        signal = "DISTRIBUTION";
      } else if (totalTx > 10 && (txns.buys / totalTx) > 0.8) {
        signal = "MOMENTUM";
      }

      if (signal) {
        const buyRatio = totalTx > 0 ? txns.buys / totalTx : 0.5;
        const buyVol = vol5m * buyRatio;
        const sellVol = vol5m * (1 - buyRatio);

        list.push({
          id: t.address,
          address: t.address,
          token: t.symbol,
          netFlow: buyVol - sellVol,
          buyVolume: buyVol,
          sellVolume: sellVol,
          signal,
          confidence: Math.min(1, vol5m / 50000),
          timestamp: Date.now(),
          count: totalTx
        });
      }
    });
    return list.sort((a, b) => b.buyVolume - a.buyVolume).slice(0, 20);
  }, [tokens]);

  return (
    <div className={styles.tabContent}>
      <div style={{ padding: '8px 12px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2ecc71', boxShadow: '0 0 8px #2ecc71' }} />
        <span style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Pattern Scanner: Active</span>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>TOKEN</th>
            <th>PATTERN</th>
            <th>5M VOL</th>
            <th>CONFIDENCE</th>
            <th>ACTIVITY</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((tx) => (
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
                <span className={tx.signal === "WHALE ENTRY" || tx.signal === "ACCUMULATION" ? styles.textGreen : styles.textRed}>
                  {tx.signal}
                </span>
              </td>
              <td>
                <div className={styles.mono}>{formatUsd(tx.buyVolume + tx.sellVolume)}</div>
              </td>
              <td>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${tx.confidence * 100}%`, backgroundColor: 'var(--accent)' }} />
                </div>
              </td>
              <td className={styles.mono}>{tx.count} txns</td>
            </tr>
          ))}
          {alerts.length === 0 && (
            <tr>
              <td colSpan={6} className={styles.empty}>
                Scanning market patterns...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}