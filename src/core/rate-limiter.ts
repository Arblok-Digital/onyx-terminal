/**
 * @file rate-limiter.ts
 * @layer core
 * @desc Smart per-host queue. Biar gak kena rate limit DexScreener (300/min)
 *       atau GeckoTerminal (30/min). Setiap host punya antrian + min interval.
 * @exposes POLL_INTERVALS, scheduleRequest, getHostStats
 * @deps -
 */

/** Polling intervals in milliseconds. Single source of truth. */
export const POLL_INTERVALS = {
  PRICE_FAST: 5_000, // visible token in viewport
  PRICE_SLOW: 30_000, // off-viewport tokens
  TRENDING: 30_000,
  NEW_LISTINGS: 15_000,
  POOL_DATA: 60_000,
  PORTFOLIO: 300_000,
} as const;

/** Minimum gap between two requests to the same host (ms). */
const HOST_INTERVALS: Record<string, number> = {
  "api.dexscreener.com": 220, // 300 req/min → safe at 220ms
  "api.geckoterminal.com": 2100, // 30 req/min → safe at 2100ms
  "public-api.birdeye.so": 1100,
  "api.helius.xyz": 200,
  "api.jup.ag": 200,
  "api.solscan.io": 600,
};

type Job<T> = {
  exec: () => Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
};

const queues = new Map<string, Job<unknown>[]>();
const lastRun = new Map<string, number>();
const draining = new Set<string>();
const stats = new Map<
  string,
  { queued: number; lastLatencyMs: number; errors: number }
>();

function getInterval(host: string): number {
  return HOST_INTERVALS[host] ?? 250;
}

async function drain(host: string): Promise<void> {
  if (draining.has(host)) return;
  draining.add(host);
  try {
    const queue = queues.get(host);
    if (!queue) return;
    while (queue.length > 0) {
      const interval = getInterval(host);
      const now = Date.now();
      const last = lastRun.get(host) ?? 0;
      const wait = Math.max(0, last + interval - now);
      if (wait > 0) {
        await new Promise<void>((r) => setTimeout(r, wait));
      }
      const job = queue.shift();
      if (!job) break;
      lastRun.set(host, Date.now());
      const t0 = performance.now();
      try {
        const out = await job.exec();
        const dt = performance.now() - t0;
        const stat = stats.get(host) ?? {
          queued: 0,
          lastLatencyMs: 0,
          errors: 0,
        };
        stats.set(host, { ...stat, lastLatencyMs: dt });
        job.resolve(out);
      } catch (err) {
        const stat = stats.get(host) ?? {
          queued: 0,
          lastLatencyMs: 0,
          errors: 0,
        };
        stats.set(host, { ...stat, errors: stat.errors + 1 });
        job.reject(err);
      }
    }
  } finally {
    draining.delete(host);
  }
}

/** Queue an async job behind the host's rate limit. */
export function scheduleRequest<T>(
  host: string,
  exec: () => Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const queue = (queues.get(host) ?? []) as Job<unknown>[];
    queue.push({
      exec: exec as () => Promise<unknown>,
      resolve: resolve as (v: unknown) => void,
      reject,
    });
    queues.set(host, queue);
    const stat = stats.get(host) ?? {
      queued: 0,
      lastLatencyMs: 0,
      errors: 0,
    };
    stats.set(host, { ...stat, queued: queue.length });
    void drain(host);
  });
}

export function getHostStats(host: string) {
  return (
    stats.get(host) ?? { queued: 0, lastLatencyMs: 0, errors: 0 }
  );
}
