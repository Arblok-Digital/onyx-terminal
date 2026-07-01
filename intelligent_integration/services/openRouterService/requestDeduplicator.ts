/**
 * @file requestDeduplicator.ts
 * @layer service
 * @desc Request deduplication for in-flight AI requests
 * @exposes RequestDeduplicator
 */

interface PendingRequest<T> {
    promise: Promise<T>;
    timestamp: number;
}

/**
 * Prevents duplicate concurrent requests to AI models
 * If the same request is already in-flight, returns the existing promise
 */
export class RequestDeduplicator {
    private inFlight: Map<string, PendingRequest<any>> = new Map();
    private requestTimeout: number;

    constructor(requestTimeoutMs: number = 30000) {
        this.requestTimeout = requestTimeoutMs;
    }

    /**
     * Generate a dedup key from prompt and task type
     */
    private generateKey(prompt: string, taskType: string, model: string): string {
        // Use first 500 chars for key generation
        const promptHash = this.simpleHash(prompt.substring(0, 500));
        return `${taskType}:${model}:${promptHash}`;
    }

    /**
     * Simple string hash
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    /**
     * Get or create a request
     * If a request with the same key is in-flight, return that promise
     * Otherwise, execute the function and cache the promise
     */
    async dedupe<T>(
        prompt: string,
        taskType: string,
        model: string,
        fn: () => Promise<T>
    ): Promise<T> {
        const key = this.generateKey(prompt, taskType, model);

        // Check for in-flight request
        const existing = this.inFlight.get(key);
        if (existing) {
            // Check if not expired
            if (Date.now() - existing.timestamp < this.requestTimeout) {
                return existing.promise;
            }
            // Expired - remove and create new
            this.inFlight.delete(key);
        }

        // Clean up expired entries periodically
        this.cleanupExpired();

        // Create new request
        const promise = fn().finally(() => {
            // Remove from in-flight when complete
            this.inFlight.delete(key);
        });

        this.inFlight.set(key, {
            promise,
            timestamp: Date.now()
        });

        return promise;
    }

    /**
     * Remove expired entries from in-flight map
     */
    private cleanupExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.inFlight.entries()) {
            if (now - entry.timestamp > this.requestTimeout) {
                this.inFlight.delete(key);
            }
        }
    }

    /**
     * Get current in-flight count
     */
    inFlightCount(): number {
        return this.inFlight.size;
    }

    /**
     * Clear all in-flight requests
     */
    clear(): void {
        this.inFlight.clear();
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            inFlightCount: this.inFlight.size,
            requestTimeout: this.requestTimeout
        };
    }
}