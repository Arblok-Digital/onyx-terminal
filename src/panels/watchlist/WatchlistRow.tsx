/**
 * @file WatchlistRow.tsx
 * @layer panel
 * @desc Single watchlist row. Pure presentation — click handlers passed in.
 * @exposes default WatchlistRow
 * @deps utils/format, core/store/price.store (type only)
 */
import type { TokenSnapshot, ChainId } from "@/core/store/price.store";
import { formatPrice, formatPercent, formatCompact } from "@/utils/format";
import styles from "./Watchlist.module.css";

type Props = {
  address: string;
  chain: ChainId;
  snap: TokenSnapshot | undefined;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
};

export default function WatchlistRow({
  snap,
  active,
  onSelect,
  onRemove,
}: Props) {
  const ch1 = snap?.priceChange1h;
  const ch24 = snap?.priceChange24h;
  const ch1Class =
    ch1 == null ? styles.muted : ch1 >= 0 ? styles.up : styles.down;
  const ch24Class =
    ch24 == null ? styles.muted : ch24 >= 0 ? styles.up : styles.down;

  const symbol = snap?.symbol ?? "···";
  const name = snap?.name ?? "Loading…";
  const initial = symbol.slice(0, 2).toUpperCase();

  return (
    <div
      className={`${styles.row} ${active ? styles.rowActive : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className={styles.symbolCell}>
        {snap?.iconUrl ? (
          <img
            className={styles.icon}
            src={snap.iconUrl}
            alt={symbol}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className={styles.iconPlaceholder}>{initial}</div>
        )}
        <div className={styles.symbolName}>
          <span className={styles.symbol}>{symbol}</span>
          <span className={styles.subtext}>{name}</span>
        </div>
      </div>
      <div className={styles.numeric}>
        {snap?.priceUsd !== undefined ? formatPrice(snap.priceUsd) : "—"}
      </div>
      <div className={`${styles.numeric} ${ch1Class} ${styles.hideMobile}`}>
        {ch1 !== undefined ? formatPercent(ch1) : "—"}
      </div>
      <div className={`${styles.numeric} ${ch24Class} ${styles.hideMobile}`}>
        {ch24 !== undefined ? formatPercent(ch24) : "—"}
      </div>
      <div className={`${styles.numeric} ${styles.muted} ${styles.hideMobile}`}>
        {snap?.volume24h !== undefined ? formatCompact(snap.volume24h) : "—"}
      </div>
      <button
        className={styles.removeBtn}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Remove from watchlist"
        aria-label="Remove from watchlist"
      >
        ×
      </button>
    </div>
  );
}
