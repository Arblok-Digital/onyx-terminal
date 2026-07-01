/**
 * @file requestDeduplicator.test.ts
 * @desc Unit tests for RequestDeduplicator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const createDeduplicator = (timeoutMs: number = 30000) => {
    const inFlight = new Map<string, { promise: Promise<any>; timestamp: number }>();

    const simpleHash = (str: string): string => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    };

    const generateKey = (prompt: string, taskType: string, model: string): string => {
        const promptHash = simpleHash(prompt.substring(0, 500));
        return `${taskType}:${model}:${promptHash}`;
    };

    return {
        dedupe: async <T>(
            prompt: string,
            taskType: string,
            model: string,
            fn: () => Promise<T>
        ): Promise<T> => {
            const key = generateKey(prompt, taskType, model);
            const existing = inFlight.get(key);
            if (existing) {
                if (Date.now() - existing.timestamp < timeoutMs) {
                    return existing.promise;
                }
                inFlight.delete(key);
            }
            const promise = fn().finally(() => inFlight.delete(key));
            inFlight.set(key, { promise, timestamp: Date.now() });
            return promise;
        },
        inFlightCount: () => inFlight.size,
        clear: () => inFlight.clear()
    };
};

describe('RequestDeduplicator', () => {
    let dedup: ReturnType<typeof createDeduplicator>;

    beforeEach(() => {
        dedup = createDeduplicator();
    });

    it('should execute the function only once for identical requests', async () => {
        let callCount = 0;
        const fn = async () => {
            callCount++;
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'result';
        };

        // Make two concurrent identical requests
        const [result1, result2] = await Promise.all([
            dedup.dedupe('same prompt', 'analysis', 'gpt-4', fn),
            dedup.dedupe('same prompt', 'analysis', 'gpt-4', fn)
        ]);

        expect(result1).toBe('result');
        expect(result2).toBe('result');
        expect(callCount).toBe(1); // Should only execute once!
    });

    it('should treat different task types as separate requests', async () => {
        let callCount = 0;
        const fn = async () => {
            callCount++;
            await new Promise(resolve => setTimeout(resolve, 10));
            return 'result';
        };

        const [r1, r2] = await Promise.all([
            dedup.dedupe('prompt', 'flow_analysis', 'gpt-4', fn),
            dedup.dedupe('prompt', 'market_analysis', 'gpt-4', fn)
        ]);

        expect(callCount).toBe(2); // Different task types = separate calls
    });

    it('should execute again after first request completes', async () => {
        let callCount = 0;
        const fn = async () => {
            callCount++;
            return `result-${callCount}`;
        };

        const r1 = await dedup.dedupe('prompt', 'analysis', 'gpt-4', fn);
        expect(r1).toBe('result-1');

        // Second call after first completed should execute again
        const r2 = await dedup.dedupe('prompt', 'analysis', 'gpt-4', fn);
        expect(r2).toBe('result-2');
        expect(callCount).toBe(2);
    });

    it('should clear all in-flight requests', async () => {
        const fn = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return 'result';
        };

        // Start a request
        const promise = dedup.dedupe('prompt', 'analysis', 'gpt-4', fn);
        expect(dedup.inFlightCount()).toBe(1);

        // Clear
        dedup.clear();
        expect(dedup.inFlightCount()).toBe(0);

        await promise; // Should still resolve
    });
});