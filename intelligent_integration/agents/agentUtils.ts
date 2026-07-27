/**
 * @file agentUtils.ts
 * @layer agents
 * @desc Shared utilities for all agents.
 *       DexScreener data fetching now consolidated via:
 *         Step 1: Check price.store (shared store, populated by feeds/dexscreener.ts)
 *         Step 2: Fall back to feeds/dexscreener.ts (rate-limited via core/rate-limiter)
 *       No more raw fetch() to DexScreener — single source of truth.
 *
 * @exposes safeNumber, safePercent, fetchDexScreenerData, DexScreenerData
 */

import { usePriceStore } from '@/core/store/price.store';
import type { TokenSnapshot } from '@/core/store/price.store';

// ── Number Helpers (overflow-safe) ──────────────────────────────

/** Safe number conversion */
export function safeNumber(val: unknown, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/** Safe percentage (clamped -10000 to 10000) */
export function safePercent(val: unknown, fallback: number = 0): number {
  return Math.min(Math.max(safeNumber(val, fallback), -10000), 10000);
}

/** Safe divide with fallback */
export function safeDivide(a: number, b: number, fallback: number = 0): number {
  if (b === 0 || !Number.isFinite(b)) return fallback;
  return a / b;
}

/** Clamp value to range */
export function clamp(val: number, min: number = 0, max: number = 1): number {
  return Math.min(Math.max(val, min), max);
}

/** Round to N decimal places */
export function round(val: number, decimals: number = 2): number {
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
}

// ── Cache Helper ────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class SimpleCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private ttl: number;

  constructor(ttl: number = 60_000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.ttl) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, data: T): void {
    if (this.cache.size > 200) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

// ── DexScreener Data Types ──────────────────────────────────────

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd: string;
  priceChange?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  volume?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  txns?: {
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: { label?: string; url?: string }[];
    socials?: { type?: string; platform?: string; url?: string }[];
  };
}

export interface DexScreenerData {
  symbol: string;
  name: string;
  priceUsd: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  volume5m: number;
  volume1h: number;
  volume6h: number;
  volume24h: number;
  buys5m: number;
  sells5m: number;
  buys1h: number;
  sells1h: number;
  buys6h: number;
  sells6h: number;
  buys24h: number;
  sells24h: number;
  liquidityUsd: number;
  fdv: number;
  marketCap: number;
  pairCreatedAt: number | null;
  socials: { type: string; url: string }[];
  websites: { label: string; url: string }[];
}

// ── Converter: TokenSnapshot → DexScreenerData ─────────────────
// Allows agents to consume data from the shared price.store
// without needing a separate raw fetch.

function snapshotToDexScreenerData(snap: TokenSnapshot): DexScreenerData {
  return {
    symbol: snap.symbol,
    name: snap.name,
    priceUsd: snap.priceUsd ?? 0,
    priceChange5m: snap.priceChange5m ?? 0,
    priceChange1h: snap.priceChange1h ?? 0,
    priceChange6h: snap.priceChange6h ?? 0,
    priceChange24h: snap.priceChange24h ?? 0,
    volume5m: snap.volume5m ?? 0,
    volume1h: snap.volume1h ?? 0,
    volume6h: snap.volume6h ?? 0,
    volume24h: snap.volume24h ?? 0,
    buys5m: snap.txns5m?.buys ?? 0,
    sells5m: snap.txns5m?.sells ?? 0,
    buys1h: snap.txns1h?.buys ?? 0,
    sells1h: snap.txns1h?.sells ?? 0,
    buys6h: snap.txns6h?.buys ?? 0,
    sells6h: snap.txns6h?.sells ?? 0,
    buys24h: snap.txns24h?.buys ?? 0,
    sells24h: snap.txns24h?.sells ?? 0,
    liquidityUsd: snap.liquidity ?? 0,
    fdv: snap.fdv ?? 0,
    marketCap: snap.marketCap ?? 0,
    pairCreatedAt: snap.pairCreatedAt ?? null,
    socials: (snap.links ?? [])
      .filter(l => l.type === 'twitter' || l.type === 'telegram' || l.type === 'discord')
      .map(l => ({ type: l.type, url: l.url })),
    websites: (snap.links ?? [])
      .filter(l => l.type === 'website')
      .map(l => ({ label: l.label ?? 'website', url: l.url })),
  };
}

/**
 * Fetch token data from DexScreener — CONSOLIDATED source.
 *
 * Step 1: Read from price.store (shared Zustand store, populated by
 *         feeds/dexscreener.ts polling). If data exists and is <60s fresh,
 *         return it directly — zero network requests.
 *
 * Step 2: Fall back to feeds/dexscreener.ts getTokensBatch() which is
 *         rate-limited via core/rate-limiter.ts. This only happens for
 *         tokens NOT currently on the user's watchlist.
 *
 * No raw fetch() to DexScreener — all network calls go through the
 * rate-limited feed layer.
 */
export async function fetchDexScreenerData(mint: string): Promise<DexScreenerData | null> {
  const addr = mint.toLowerCase();

  // ── Step 1: Try shared price.store first ──────────────────────
  try {
    const { tokens } = usePriceStore.getState();
    const snap = tokens[addr];
    if (snap && snap.updatedAt && Date.now() - snap.updatedAt < 60_000) {
      // Data is fresh enough — convert directly, zero network cost
      return snapshotToDexScreenerData(snap);
    }
  } catch {
    // Store not accessible (e.g. SSR/test) — fall through
  }

  // ── Step 2: Fall back to rate-limited feeds layer ─────────────
  try {
    const { getTokensBatch } = await import('@/feeds/dexscreener');
    const snaps = await getTokensBatch([mint]);
    if (snaps.length > 0) {
      // Also upsert into store so next consumer finds it fresh
      try {
        usePriceStore.getState().upsertMany(snaps);
      } catch { /* non-critical */ }
      return snapshotToDexScreenerData(snaps[0]);
    }
  } catch (e) {
    console.warn('[agentUtils] dexscreener.ts fallback failed:', e);
  }

  return null;
}

// ── Logger Helper ───────────────────────────────────────────────
// Minimal logger that agents can use without Inversify DI

export interface AgentLogger {
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, err?: unknown, ctx?: Record<string, unknown>): void;
  debug(msg: string, ctx?: Record<string, unknown>): void;
}

export const consoleLogger: AgentLogger = {
  info: (msg, ctx) => console.info(`[INFO] ${msg}`, ctx ?? ''),
  warn: (msg, ctx) => console.warn(`[WARN] ${msg}`, ctx ?? ''),
  error: (msg, err, ctx) => console.error(`[ERROR] ${msg}`, err ?? '', ctx ?? ''),
  debug: (msg, ctx) => console.debug(`[DEBUG] ${msg}`, ctx ?? ''),
};
