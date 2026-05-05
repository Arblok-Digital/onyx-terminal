/**
 * @file dexscreener.ts
 * @layer feeds
 * @desc DexScreener polling: harga, volume, trending, search token.
 *       Tanpa API key. Rate limit: 300 req/min — dijaga rate-limiter.
 * @exposes getTokensBatch, subscribePrices, searchTokens
 * @deps core/rate-limiter, core/store/price.store, core/event-bus, utils/chain
 */
import { scheduleRequest, POLL_INTERVALS } from "@/core/rate-limiter";
import { usePriceStore } from "@/core/store/price.store";
import type { TokenSnapshot } from "@/core/store/price.store";
import { normalizeChain } from "@/utils/chain";
import { bus } from "@/core/event-bus";
import { useUIStore } from "@/core/store/ui.store";

const HOST = "api.dexscreener.com";
const BASE = `https://${HOST}/latest/dex`;

/* --------------------------- raw API types --------------------------- */
type RawTxnBucket = { buys?: number; sells?: number };
type RawSocial = { type?: string; platform?: string; url?: string; handle?: string };
type RawWebsite = { label?: string; url?: string };

type RawPair = {
  chainId: string;
  dexId?: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken?: { address: string; name: string; symbol: string };
  priceUsd?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  volume?: { m5?: number; h1?: number; h6?: number; h24?: number };
  txns?: {
    m5?: RawTxnBucket;
    h1?: RawTxnBucket;
    h6?: RawTxnBucket;
    h24?: RawTxnBucket;
  };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: RawWebsite[];
    socials?: RawSocial[];
  };
};

type TokensResponse = { pairs: RawPair[] | null };
type SearchResponse = { pairs: RawPair[] | null };

/* --------------------------- helpers --------------------------- */

function pickBestPair(pairs: RawPair[], targetAddr: string): RawPair | null {
  const target = targetAddr.toLowerCase();
  const matched = pairs.filter(
    (p) => p.baseToken.address.toLowerCase() === target,
  );
  if (matched.length === 0) return null;
  return matched.reduce((best, p) => {
    const bL = best.liquidity?.usd ?? 0;
    const pL = p.liquidity?.usd ?? 0;
    return pL > bL ? p : best;
  });
}

function buildLinks(pair: RawPair): TokenSnapshot["links"] {
  const out: NonNullable<TokenSnapshot["links"]> = [];
  for (const w of pair.info?.websites ?? []) {
    if (w.url) out.push({ type: "website", label: w.label, url: w.url });
  }
  for (const s of pair.info?.socials ?? []) {
    const type = (s.type || s.platform || "").toLowerCase();
    if (s.url) out.push({ type, url: s.url });
  }
  return out.length > 0 ? out : undefined;
}

function pairToSnapshot(pair: RawPair): TokenSnapshot {
  return {
    address: pair.baseToken.address,
    chain: normalizeChain(pair.chainId),
    symbol: pair.baseToken.symbol,
    name: pair.baseToken.name,
    iconUrl: pair.info?.imageUrl,
    pairAddress: pair.pairAddress,
    dexId: pair.dexId,
    quoteSymbol: pair.quoteToken?.symbol,
    quoteAddress: pair.quoteToken?.address,

    priceUsd: pair.priceUsd ? Number(pair.priceUsd) : undefined,

    priceChange5m: pair.priceChange?.m5,
    priceChange1h: pair.priceChange?.h1,
    priceChange6h: pair.priceChange?.h6,
    priceChange24h: pair.priceChange?.h24,

    volume5m: pair.volume?.m5,
    volume1h: pair.volume?.h1,
    volume6h: pair.volume?.h6,
    volume24h: pair.volume?.h24,

    txns5m: pair.txns?.m5,
    txns1h: pair.txns?.h1,
    txns6h: pair.txns?.h6,
    txns24h: pair.txns?.h24,

    liquidity: pair.liquidity?.usd,
    fdv: pair.fdv,
    marketCap: pair.marketCap ?? pair.fdv,

    pairCreatedAt: pair.pairCreatedAt,
    links: buildLinks(pair),

    updatedAt: Date.now(),
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const t0 = performance.now();
  const res = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    bus.emit("feed:status", { source: HOST, status: "degraded" });
    throw new Error(`DexScreener ${res.status}: ${res.statusText}`);
  }
  const dt = performance.now() - t0;
  bus.emit("feed:latency", { source: HOST, ms: dt });
  useUIStore.getState().setLatency(dt);
  return (await res.json()) as T;
}

/* --------------------------- public API --------------------------- */

/** 
 * Batch fetch token addresses dengan Parallel Chunking.
 * DexScreener punya limit 30 PAIRS total per request. 
 * Kita bagi per 10 koin agar koin mecin tidak tertutup koin besar (SOL/BONK).
 */
export async function getTokensBatch(addresses: string[]): Promise<TokenSnapshot[]> {
  const CHUNK_SIZE = 10;
  const uniqueAddrs = Array.from(new Set(addresses.filter(Boolean)));
  if (uniqueAddrs.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueAddrs.length; i += CHUNK_SIZE) {
    chunks.push(uniqueAddrs.slice(i, i + CHUNK_SIZE));
  }

  // Jalankan semua chunk secara PARALEL untuk menghindari bottleneck
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const url = `${BASE}/tokens/${chunk.join(",")}`;
      try {
        const data = await scheduleRequest(HOST, () => fetchJson<TokensResponse>(url));
        const pairs = data.pairs ?? [];
        
        const chunkSnaps: TokenSnapshot[] = [];
        for (const addr of chunk) {
          const best = pickBestPair(pairs, addr);
          if (best) chunkSnaps.push(pairToSnapshot(best));
        }
        return chunkSnaps;
      } catch (e) {
        console.warn(`[dexscreener] Chunk fetch failed for: ${chunk[0]}...`, e);
        return [];
      }
    })
  );

  return results.flat();
}

/* --------------------------- token profiles (new listings) --------------------------- */

export type TokenProfile = {
  chainId: string;
  tokenAddress: string;
  icon?: string;
  description?: string;
  url?: string;
};

type RawProfile = {
  url?: string;
  chainId?: string;
  tokenAddress?: string;
  icon?: string;
  description?: string;
};

/** Latest token profiles from DexScreener — ~30 newest globally. */
export async function getLatestProfiles(): Promise<TokenProfile[]> {
  const url = `https://${HOST}/token-profiles/latest/v1`;
  const data = await scheduleRequest(HOST, () => fetchJson<RawProfile[]>(url));
  if (!Array.isArray(data)) return [];
  return data
    .filter((p) => p.tokenAddress && p.chainId)
    .map((p) => ({
      chainId: p.chainId as string,
      tokenAddress: p.tokenAddress as string,
      icon: p.icon,
      description: p.description,
      url: p.url,
    }));
}

/** Search by symbol or address (used by Cmd+K). Returns top 12 pairs. */
export async function searchTokens(query: string): Promise<TokenSnapshot[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${BASE}/search?q=${encodeURIComponent(q)}`;
  const data = await scheduleRequest(HOST, () =>
    fetchJson<SearchResponse>(url),
  );
  const pairs = data.pairs ?? [];
  return pairs.slice(0, 12).map(pairToSnapshot);
}

/**
 * Start polling a list of token addresses on PRICE_FAST cadence.
 * Pushes results into priceStore. Returns an unsubscribe fn.
 *
 * The address list is *captured by reference* — pass a getter so updates
 * to the watchlist are picked up on each tick.
 */
export function subscribePrices(
  getAddresses: () => string[],
  interval: number = POLL_INTERVALS.PRICE_FAST,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function tick() {
    if (stopped) return;
    const addrs = getAddresses();
    if (addrs.length > 0) {
      try {
        const snaps = await getTokensBatch(addrs);
        if (snaps.length > 0) {
          usePriceStore.getState().upsertMany(snaps);
          usePriceStore.getState().markRefreshed();
          bus.emit("feed:status", { source: HOST, status: "online" });
        }
      } catch (err) {
        bus.emit("feed:status", { source: HOST, status: "degraded" });
        // Swallow — next tick will retry. Logging is panel concern.
        console.warn("[dexscreener] tick failed", err);
      }
    }
    if (!stopped) {
      timer = setTimeout(tick, interval);
    }
  }

  // Kick off immediately
  void tick();

  return () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
  };
}
