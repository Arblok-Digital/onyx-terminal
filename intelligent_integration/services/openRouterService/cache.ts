/**
 * @file cache.ts
 * @layer service
 * @desc Response caching layer for OpenRouter service
 * @exposes ResponseCache
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

/**
 * Simple in-memory LRU cache for AI responses
 * Reduces redundant API calls for identical or similar prompts
 */
export class ResponseCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private maxSize: number;
    private defaultTTL: number;

    constructor(maxSize: number = 100, defaultTTLMs: number = 3600000) {
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTLMs;
    }

    /**
     * Generate a cache key from a prompt and task type
     */
    private generateKey(prompt: string, taskType: string, model: string): string {
        // Simple hash: use first 200 chars + task + model
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
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Get cached value if available and not expired
     */
    get<T>(prompt: string, taskType: string, model: string): T | null {
        const key = this.generateKey(prompt, taskType, model);
        const entry = this.cache.get(key);

        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Store value in cache
     */
    set<T>(prompt: string, taskType: string, model: string, data: T, ttlMs?: number): void {
        const key = this.generateKey(prompt, taskType, model);

        // Evict oldest entry if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttlMs || this.defaultTTL
        });
    }

    /**
     * Invalidate a specific cache entry
     */
    invalidate(prompt: string, taskType: string, model: string): boolean {
        const key = this.generateKey(prompt, taskType, model);
        return this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get current cache size
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            defaultTTL: this.defaultTTL
        };
    }
}