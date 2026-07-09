/**
 * @file rpcRateLimiter.ts
 * @layer utils
 * @desc Simple RPC rate limiter with retry logic for 429 responses.
 *       Uses a shared token-bucket so all consumers are throttled together.
 */

const RATE_LIMIT_CONFIG = {
  maxRequestsPerSecond: 5,
  maxRetries: 3,
  maxQueueSize: 50, // Maksimal antrian untuk mencegah OOM
};

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  url: string;
  options: RequestInit;
  retriesLeft: number;
}

class RpcRateLimiter {
  private tokens: number = RATE_LIMIT_CONFIG.maxRequestsPerSecond;
  private lastRefill: number = Date.now();
  private queue: PendingRequest[] = [];
  private processing = false;

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed >= 1000) {
      this.tokens = RATE_LIMIT_CONFIG.maxRequestsPerSecond;
      this.lastRefill = now;
    }
  }

  /**
   * Fetch with rate limiting + retry on 429.
   */
  async fetch(url: string, options: RequestInit): Promise<Response> {
    return new Promise((resolve, reject) => {
      // Cegah OOM: reject kalo queue udah penuh
      if (this.queue.length >= RATE_LIMIT_CONFIG.maxQueueSize) {
        reject(new Error(`[RpcRateLimiter] Queue full (max ${RATE_LIMIT_CONFIG.maxQueueSize}). Try again later.`));
        return;
      }
      this.queue.push({ resolve, reject, url, options, retriesLeft: RATE_LIMIT_CONFIG.maxRetries });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      this.refill();

      if (this.tokens <= 0) {
        // Wait until next refill
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }

      const request = this.queue.shift()!;
      this.tokens--;

      try {
        const response = await fetch(request.url, request.options);
        
        if (response.status === 429 && request.retriesLeft > 0) {
          // Rate limited — retry with backoff
          const backoffMs = Math.pow(2, RATE_LIMIT_CONFIG.maxRetries - request.retriesLeft + 1) * 200;
          console.warn(`[RPC Limiter] 429 on ${request.url.slice(0, 50)}..., retrying in ${backoffMs}ms`);
          await new Promise((r) => setTimeout(r, backoffMs));
          this.queue.push({
            ...request,
            retriesLeft: request.retriesLeft - 1,
          });
        } else {
          request.resolve(response);
        }
      } catch (err) {
        if (request.retriesLeft > 0) {
          await new Promise((r) => setTimeout(r, 500));
          this.queue.push({
            ...request,
            retriesLeft: request.retriesLeft - 1,
          });
        } else {
          request.reject(err);
        }
      }
    }

    this.processing = false;
  }
}

/** Singleton RPC rate limiter */
export const rpcRateLimiter = new RpcRateLimiter();