/**
 * @file StatusBar.tsx
 * @layer ui
 * @desc Bottom status bar — chain selector, connection state, latency, clock.
 * @exposes default StatusBar
 * @deps core/store/ui.store, core/store/price.store, utils/time
 */
import { useEffect, useState } from "react";
import { useUIStore } from "@/core/store/ui.store";
import { usePriceStore } from "@/core/store/price.store";
import type { ChainId } from "@/core/store/price.store";
import { CHAIN_LABELS } from "@/utils/chain";
import { formatClock, formatLatency, formatRelative } from "@/utils/time";
import styles from "./StatusBar.module.css";

const CHAINS: ChainId[] = ["solana", "ethereum", "base", "arbitrum"];

export default function StatusBar() {
  const activeChain = useUIStore((s) => s.activeChain);
  const setActiveChain = useUIStore((s) => s.setActiveChain);
  const latencyMs = useUIStore((s) => s.latencyMs);
  const online = usePriceStore((s) => s.online);
  const lastRefresh = usePriceStore((s) => s.lastRefreshAt);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const status: "online" | "degraded" | "offline" = !online
    ? "offline"
    : lastRefresh && now - lastRefresh > 30_000
      ? "degraded"
      : "online";

  const dotClass =
    status === "online"
      ? styles.dotOnline
      : status === "degraded"
        ? styles.dotDegraded
        : styles.dotOffline;

  return (
    <div className={styles.bar} role="status">
      <div className={styles.cell}>
        <span className={styles.label}>Chain</span>
        <select
          className={styles.chainSelect}
          value={activeChain}
          onChange={(e) => setActiveChain(e.target.value as ChainId)}
          aria-label="Active chain"
        >
          {CHAINS.map((c) => (
            <option key={c} value={c}>
              {CHAIN_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.divider} />

      <div className={styles.cell}>
        <span className={`${styles.dot} ${dotClass}`} aria-hidden="true" />
        <span className={styles.value}>{status}</span>
      </div>

      <div className={styles.cell}>
        <span className={styles.label}>Feed</span>
        <span className={styles.value}>DexScreener</span>
      </div>

      <div className={styles.cell}>
        <span className={styles.label}>Lat</span>
        <span className={styles.value}>{formatLatency(latencyMs)}</span>
      </div>

      <div className={styles.cell}>
        <span className={styles.label}>Last</span>
        <span className={styles.value}>{formatRelative(lastRefresh, now)}</span>
      </div>

      <div className={styles.spacer} />

      <div className={styles.help}>
        Drag panel header to move
        <span className={styles.kbd}>?</span>
        for help
      </div>

      <div className={styles.divider} />

      <div className={styles.cell}>
        <span className={styles.value}>{formatClock(now)}</span>
        <span className={styles.label}>UTC{getUtcOffset()}</span>
      </div>
    </div>
  );
}

function getUtcOffset(): string {
  const m = -new Date().getTimezoneOffset();
  const sign = m >= 0 ? "+" : "-";
  const h = Math.floor(Math.abs(m) / 60);
  return `${sign}${h}`;
}
