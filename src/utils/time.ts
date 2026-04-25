/**
 * @file time.ts
 * @layer utils
 * @desc Timestamp helpers: relative time ("3m ago"), HH:MM:SS clock.
 * @exposes formatRelative, formatClock, formatLatency
 * @deps -
 */

/** "3s", "5m", "2h", "1d" — short relative time from past timestamp. */
export function formatRelative(
  past: number | null | undefined,
  now: number = Date.now(),
): string {
  if (past === null || past === undefined) return "—";
  const diff = Math.max(0, now - past);
  const s = Math.round(diff / 1000);
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

/** HH:MM:SS in user's locale (24h). */
export function formatClock(ts: number = Date.now()): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** "120ms" or "1.2s" depending on magnitude. */
export function formatLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
