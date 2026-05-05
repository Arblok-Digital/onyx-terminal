import type { TokenSnapshot } from "@/core/store/price.store";

export const MAX_ROWS = 30;
export const POLL_MS = 10_000; // 10 Seconds responsive refresh

export const CHAIN_FILTERS = [
  { id: "all", label: "ALL" },
  { id: "solana", label: "SOLANA" },
  { id: "ethereum", label: "ETH" },
  { id: "base", label: "BASE" },
] as const;

export interface SignalRow {
  snap: TokenSnapshot;
  score: number;
  spike: number;
  buyPct: number;
  hot: boolean;
  change1h: number;
}

/**
 * Composite score logic based on 5m data for responsiveness
 */
export function computeSignal(snap: TokenSnapshot): SignalRow {
  const vol5m = snap.volume5m ?? 0;
  const vol1h = snap.volume1h ?? 0;
  const change1h = snap.priceChange1h ?? 0;

  // Volume Spike: Perbandingan volume 5 menit vs rata-rata 5 menit dalam 1 jam terakhir
  const avg5m = vol1h > 0 ? vol1h / 12 : 1;
  const spike = vol5m / avg5m;

  // Buy Pressure based on 5m transactions
  const buys = snap.txns5m?.buys ?? 0;
  const sells = snap.txns5m?.sells ?? 0;
  const total = buys + sells;
  const buyPct = total > 0 ? buys / total : 0.5;

  // Scoring: Spike factor + Momentum + Buy Intensity
  const score = (spike * 100) + (buyPct * 200) + (change1h * 2);
  const hot = score > 400 || (spike > 3 && buyPct > 0.6);

  return {
    snap,
    score,
    spike,
    buyPct,
    hot,
    change1h,
  };
}