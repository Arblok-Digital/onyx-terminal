/**
 * @file discover.config.ts
 * @layer panel
 * @desc Constants + scoring math for Discover panel: chain filter chips,
 *       poll interval, signal score formula. Pure functions only.
 * @exposes CHAIN_FILTERS, POLL_MS, MAX_ROWS, computeSignal, type SignalRow
 * @deps core/store/price.store
 */
import type { ChainId, TokenSnapshot } from "@/core/store/price.store";

export const POLL_MS = 30_000;
export const MAX_ROWS = 30;

export const CHAIN_FILTERS: { id: "all" | ChainId; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "solana", label: "SOL" },
  { id: "ethereum", label: "ETH" },
  { id: "base", label: "BASE" },
  { id: "bsc", label: "BSC" },
];

export type SignalRow = {
  snap: TokenSnapshot;
  spike: number;
  buyPct: number;
  change1h: number;
  score: number;
  hot: boolean;
};

/**
 * Composite score from existing snapshot fields.
 *  - spike  = vol1h / avg-hour (vol24h/24)
 *  - buyPct = buys / (buys+sells), 24H bucket
 *  - momentum = abs(priceChange1h)
 *  - liquidity weight = log10(liquidity)
 */
export function computeSignal(snap: TokenSnapshot): SignalRow {
  const ch1h = snap.priceChange1h ?? 0;
  const vol1h = snap.volume1h ?? 0;
  const vol24h = snap.volume24h ?? 0;
  const vol6h = snap.volume6h ?? 0;
  const avg1h =
    vol24h > 0 ? vol24h / 24 : vol6h > 0 ? vol6h / 6 : 0;
  const spike = avg1h > 0 ? vol1h / avg1h : 0;

  const buys = snap.txns24h?.buys ?? 0;
  const sells = snap.txns24h?.sells ?? 0;
  const total = buys + sells;
  const buyPct = total > 0 ? buys / total : 0.5;

  const liq = Math.max(snap.liquidity ?? 100, 100);
  const liqW = Math.log10(liq);

  const score = Math.round(
    spike * (0.5 + buyPct) * liqW * (1 + Math.abs(ch1h) / 100),
  );

  return {
    snap,
    spike,
    buyPct,
    change1h: ch1h,
    score,
    hot: score >= 50 || spike >= 3,
  };
}
