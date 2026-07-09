/**
 * @file agentUtils.ts
 * @layer agents
 * @desc Shared utilities for all agents.
 *       Removed broken imports (config/rpcConfig, services/tokenCache, services/agentStats).
 *       Now self-contained with safe number helpers and DexScreener data fetcher.
 *
 * @exposes safeNumber, safePercent, fetchDexScreenerData, DexScreenerData
 */

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

// ── DexScreener Data Fetcher ────────────────────────────────────
// DexScreener is free, no API key needed, 300 req/min limit.
// Used by MarketAgent and FlowIntelligenceAgent for real market data.

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

/**
 * Fetch token data from DexScreener API (no key needed).
 * Picks the pair with highest liquidity.
 */
export async function fetchDexScreenerData(mint: string): Promise<DexScreenerData | null> {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(`[DexScreener] HTTP ${res.status} for ${mint}`);
      return null;
    }

    const data = await res.json();
    const pairs: DexScreenerPair[] = data.pairs ?? [];

    if (pairs.length === 0) return null;

    // Pick pair with highest liquidity
    const best = pairs.reduce((best, p) => {
      const pL = p.liquidity?.usd ?? 0;
      const bL = best.liquidity?.usd ?? 0;
      return pL > bL ? p : best;
    });

    const socials = (best.info?.socials ?? []).map((s) => ({
      type: s.type || s.platform || 'unknown',
      url: s.url || '',
    })).filter((s) => s.url);

    const websites = (best.info?.websites ?? []).map((w) => ({
      label: w.label || 'website',
      url: w.url || '',
    })).filter((w) => w.url);

    return {
      symbol: best.baseToken.symbol,
      name: best.baseToken.name,
      priceUsd: safeNumber(best.priceUsd, 0),
      priceChange5m: safeNumber(best.priceChange?.m5, 0),
      priceChange1h: safeNumber(best.priceChange?.h1, 0),
      priceChange6h: safeNumber(best.priceChange?.h6, 0),
      priceChange24h: safeNumber(best.priceChange?.h24, 0),
      volume5m: safeNumber(best.volume?.m5, 0),
      volume1h: safeNumber(best.volume?.h1, 0),
      volume6h: safeNumber(best.volume?.h6, 0),
      volume24h: safeNumber(best.volume?.h24, 0),
      buys5m: safeNumber(best.txns?.m5?.buys, 0),
      sells5m: safeNumber(best.txns?.m5?.sells, 0),
      buys1h: safeNumber(best.txns?.h1?.buys, 0),
      sells1h: safeNumber(best.txns?.h1?.sells, 0),
      buys6h: safeNumber(best.txns?.h6?.buys, 0),
      sells6h: safeNumber(best.txns?.h6?.sells, 0),
      buys24h: safeNumber(best.txns?.h24?.buys, 0),
      sells24h: safeNumber(best.txns?.h24?.sells, 0),
      liquidityUsd: safeNumber(best.liquidity?.usd, 0),
      fdv: safeNumber(best.fdv, 0),
      marketCap: safeNumber(best.marketCap ?? best.fdv, 0),
      pairCreatedAt: best.pairCreatedAt ?? null,
      socials,
      websites,
    };
  } catch (error) {
    console.warn('[DexScreener] fetch failed for', mint, error);
    return null;
  }
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
