/**
 * @file price.store.ts
 * @layer store
 * @desc Harga token + metadata realtime. Diisi oleh feeds/dexscreener.ts.
 *       Single source of truth untuk semua harga, watchlist consume dari sini.
 * @exposes usePriceStore, type TokenSnapshot, type ChainId
 * @deps zustand
 */
import { create } from "zustand";

export type ChainId =
  | "solana"
  | "ethereum"
  | "base"
  | "arbitrum"
  | "bsc"
  | "polygon";

/** Buys + sells counts for a single time bucket. */
export type TxnBucket = { buys?: number; sells?: number };

/** External link captured from DexScreener `info`. */
export type TokenLink = { type: string; label?: string; url: string };

/** Normalized snapshot — bentuk standar untuk semua feed. */
export type TokenSnapshot = {
  address: string;
  chain: ChainId;
  symbol: string;
  name: string;
  iconUrl?: string;
  /** Best pair address (highest liquidity) — dipakai untuk chart embed. */
  pairAddress?: string;
  /** DEX name (raydium, orca, uniswap, etc). */
  dexId?: string;
  /** Quote token info (USDC, SOL, WETH, etc). */
  quoteSymbol?: string;
  quoteAddress?: string;

  priceUsd?: number;

  priceChange5m?: number;
  priceChange1h?: number;
  priceChange6h?: number;
  priceChange24h?: number;

  volume5m?: number;
  volume1h?: number;
  volume6h?: number;
  volume24h?: number;

  txns5m?: TxnBucket;
  txns1h?: TxnBucket;
  txns6h?: TxnBucket;
  txns24h?: TxnBucket;

  liquidity?: number;
  fdv?: number;
  marketCap?: number;

  /** Pair creation time (unix ms). */
  pairCreatedAt?: number;

  /** Website / socials (twitter, telegram, discord, etc). */
  links?: TokenLink[];

  /** Unix ms — untuk hitung freshness. */
  updatedAt?: number;
};

type State = {
  /** Keyed by lowercased address. */
  tokens: Record<string, TokenSnapshot>;
  /** Global feed status — true kalau setidaknya satu fetch sukses dalam 30s terakhir. */
  online: boolean;
  /** Last successful refresh (unix ms). */
  lastRefreshAt: number | null;
};

type Actions = {
  upsertSnapshot: (snap: TokenSnapshot) => void;
  upsertMany: (snaps: TokenSnapshot[]) => void;
  removeToken: (address: string) => void;
  setOnline: (online: boolean) => void;
  markRefreshed: () => void;
};

export const usePriceStore = create<State & Actions>((set) => ({
  tokens: {},
  online: false,
  lastRefreshAt: null,

  upsertSnapshot: (snap) =>
    set((s) => ({
      tokens: {
        ...s.tokens,
        [snap.address.toLowerCase()]: {
          ...s.tokens[snap.address.toLowerCase()],
          ...snap,
          updatedAt: snap.updatedAt ?? Date.now(),
        },
      },
    })),

  upsertMany: (snaps) =>
    set((s) => {
      const next = { ...s.tokens };
      const t = Date.now();
      for (const snap of snaps) {
        const key = snap.address.toLowerCase();
        next[key] = { ...next[key], ...snap, updatedAt: snap.updatedAt ?? t };
      }
      return { tokens: next };
    }),

  removeToken: (address) =>
    set((s) => {
      const key = address.toLowerCase();
      if (!(key in s.tokens)) return s;
      const next = { ...s.tokens };
      delete next[key];
      return { tokens: next };
    }),

  setOnline: (online) => set({ online }),

  markRefreshed: () => set({ lastRefreshAt: Date.now(), online: true }),
}));
