/**
 * @file shimmer.tsx
 * @layer ui
 * @desc Shimmer loading placeholder — animated pulse skeleton for async content.
 * @exposes Shimmer, ShimmerRow, ShimmerTable
 * @deps none
 */
import styles from "./shimmer.module.css";

export function Shimmer({ width, height = 16 }: { width?: number | string; height?: number }) {
  return (
    <div
      className={styles.shimmer}
      style={{ width: width ?? "100%", height }}
      aria-hidden="true"
    />
  );
}

export function ShimmerRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className={styles.row} aria-hidden="true">
      {Array.from({ length: cols }, (_, i) => (
        <Shimmer key={i} width={`${60 + Math.random() * 30}%`} />
      ))}
    </div>
  );
}

export function ShimmerTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className={styles.table} aria-label="Loading content">
      {/* header */}
      <div className={styles.header} aria-hidden="true">
        {Array.from({ length: cols }, (_, i) => (
          <Shimmer key={`h-${i}`} width={`${50 + Math.random() * 40}%`} height={14} />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }, (_, i) => (
        <ShimmerRow key={`r-${i}`} cols={cols} />
      ))}
    </div>
  );
}

export function ShimmerInfo() {
  return (
    <div className={styles.infoContainer} aria-label="Loading token info">
      {/* Hero section */}
      <div className={styles.hero}>
        <Shimmer width={48} height={48} />
        <div className={styles.heroText}>
          <Shimmer width={140} height={20} />
          <Shimmer width={80} height={14} />
        </div>
        <Shimmer width={100} height={24} />
      </div>
      {/* Section rows */}
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={styles.section}>
          <Shimmer width={`${30 + Math.random() * 40}%`} height={16} />
          <div className={styles.sectionBody}>
            <ShimmerRow cols={2} />
            <ShimmerRow cols={2} />
            <ShimmerRow cols={2} />
          </div>
        </div>
      ))}
    </div>
  );
}