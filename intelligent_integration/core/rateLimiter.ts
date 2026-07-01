/**
 * @file rateLimiter.ts
 * @layer core
 * @desc Token-bucket rate limiter for AI provider API calls.
 *       Prevents hitting API rate limits by controlling request throughput
 *       per provider (9Router, OpenRouter, etc.).
 *
 * @usage
 *   const limiter = new RateLimiter({
 *       tokensPerInterval: 10,
 *       intervalMs: 60_000,      // 10 requests per minute
 *   });
 *
 *   await limiter.wait();        // Blocks until a token is available
 *   await api.call();
 *
 * @exposes RateLimiter, RateLimiterOptions
 */

export interface RateLimiterOptions {
    /** Maximum requests allowed per interval (default: 10) */
    tokensPerInterval: number;
    /** Interval window in milliseconds (default: 60s) */
    intervalMs: number;
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
    tokensPerInterval: 10,
    intervalMs: 60_000,
};

export interface RateLimiterStats {
    name: string;
    availableTokens: number;
    maxTokens: number;
    intervalMs: number;
    lastRefill: string | null;
    waitingCount: number;
}

/**
 * Token-bucket rate limiter.
 *
 * Tokens are replenished at a steady rate over the interval.
 * `wait()` blocks until a token is available.
 * `tryAcquire()` returns immediately with boolean success.
 */
export class RateLimiter {
    public readonly name: string;
    private options: RateLimiterOptions;
    private tokens: number;
    private lastRefill: number;
    private waiting: Array<{ resolve: () => void; timer: ReturnType<typeof setTimeout> }> = [];

    constructor(name: string, options?: Partial<RateLimiterOptions>) {
        this.name = name;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.tokens = this.options.tokensPerInterval;
        this.lastRefill = Date.now();
    }

    /**
     * Wait for a token to become available.
     * If tokens are available, returns immediately.
     * If not, queues the request until a token is refilled.
     */
    async wait(): Promise<void> {
        this.refill();

        if (this.tokens > 0) {
            this.tokens--;
            return;
        }

        // No tokens available — queue until next refill tick
        return new Promise<void>((resolve) => {
            const timeUntilRefill = this.options.intervalMs;
            const timer = setTimeout(() => {
                this.removeFromWaiting(resolve, timer);
                this.tokens = Math.max(0, this.tokens - 1);
                resolve();
            }, timeUntilRefill);
            this.waiting.push({ resolve, timer });
        });
    }

    /**
     * Try to acquire a token without blocking.
     * @returns true if token acquired, false if rate limited
     */
    tryAcquire(): boolean {
        this.refill();

        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }

        return false;
    }

    /**
     * Get current stats for monitoring/logging.
     */
    getStats(): RateLimiterStats {
        this.refill();
        return {
            name: this.name,
            availableTokens: this.tokens,
            maxTokens: this.options.tokensPerInterval,
            intervalMs: this.options.intervalMs,
            lastRefill: new Date(this.lastRefill).toISOString(),
            waitingCount: this.waiting.length,
        };
    }

    /**
     * Reset the rate limiter — clears tokens and waiting queue.
     */
    reset(): void {
        // Clear all pending waiters
        for (const { resolve, timer } of this.waiting) {
            clearTimeout(timer);
            resolve();
        }
        this.waiting = [];
        this.tokens = this.options.tokensPerInterval;
        this.lastRefill = Date.now();
    }

    // ── Private ──────────────────────────────────────────────

    private refill(): void {
        const now = Date.now();
        const elapsed = now - this.lastRefill;

        if (elapsed < this.options.intervalMs) return;

        const intervalsPassed = Math.floor(elapsed / this.options.intervalMs);
        if (intervalsPassed > 0) {
            this.tokens = Math.min(
                this.options.tokensPerInterval,
                this.tokens + intervalsPassed * this.options.tokensPerInterval
            );
            this.lastRefill = now;

            // Drain waiting queue
            while (this.waiting.length > 0 && this.tokens > 0) {
                const waiter = this.waiting.shift()!;
                clearTimeout(waiter.timer);
                this.tokens--;
                waiter.resolve();
            }
        }
    }

    private removeFromWaiting(
        resolve: () => void,
        timer: ReturnType<typeof setTimeout>
    ): void {
        const idx = this.waiting.findIndex((w) => w.resolve === resolve);
        if (idx !== -1) {
            this.waiting.splice(idx, 1);
            clearTimeout(timer);
        }
    }
}