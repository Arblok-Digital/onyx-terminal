/**
 * @file Ticker.tsx
 * @layer ui
 * @desc Top ticker bar — SOL price (anchor) + top movers from watchlist.
 *       Click any item → emits token:select event (Chart picks it up).
 * @exposes default Ticker
 * @deps hooks/usePrice, panels/watchlist/watchlist.store, core/event-bus
 */
import { useMemo } from "react";
import { useWatchlistStore } from "@/panels/watchlist/watchlist.store";
import { usePriceFor, useTopMovers } from "@/hooks/usePrice";
import { bus } from "@/core/event-bus";
import { formatPrice, formatPercent } from "@/utils/format";
import styles from "./Ticker.module.css";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export default function Ticker() {
  const entries = useWatchlistStore((s) => s.entries);
  const sol = usePriceFor(SOL_MINT);

  const watchedAddrs = useMemo(() => entries.map((e) => e.address), [entries]);
  const movers = useTopMovers(watchedAddrs, 6).filter(
    (m) => m.address.toLowerCase() !== SOL_MINT.toLowerCase(),
  );

  const select = (address: string, chain: string, symbol?: string) => {
    bus.emit("token:select", { address, chain, symbol });
  };

  return (
    <div className={styles.bar} role="status" aria-label="Market ticker">
      <div className={styles.brand}>
        <span className={styles.logo}>◇</span>
        <div>
          <div className={styles.brandName}>ONYX</div>
          <div className={styles.brandSub}>Terminal</div>
        </div>
      </div>

      {sol && (
        <>
          <div
            className={styles.item}
            onClick={() => select(sol.address, sol.chain, sol.symbol)}
            role="button"
            tabIndex={0}
          >
            <span className={styles.tag}>SOL</span>
            <span className={styles.price}>{formatPrice(sol.priceUsd)}</span>
            <span
              className={
                (sol.priceChange24h ?? 0) >= 0 ? styles.up : styles.down
              }
            >
              {sol.priceChange24h !== undefined
                ? formatPercent(sol.priceChange24h)
                : "—"}
            </span>
          </div>
          <div className={styles.divider} />
        </>
      )}

      <div className={styles.scroller}>
        {movers.length === 0 ? (
          <span className={styles.muted}>fetching market data…</span>
        ) : (
          movers.map((t) => (
            <div
              key={t.address}
              className={styles.item}
              onClick={() => select(t.address, t.chain, t.symbol)}
              role="button"
              tabIndex={0}
              title={t.name}
            >
              <span className={styles.symbol}>{t.symbol}</span>
              <span className={styles.price}>{formatPrice(t.priceUsd)}</span>
              <span
                className={
                  (t.priceChange1h ?? 0) >= 0 ? styles.up : styles.down
                }
              >
                {t.priceChange1h !== undefined
                  ? formatPercent(t.priceChange1h)
                  : "—"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
