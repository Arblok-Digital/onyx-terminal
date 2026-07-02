/**
 * @file queryModel.integration.test.ts
 * @desc Integration tests for queryModel with mocked HTTP layer.
 *       Tests retry logic, timeout, circuit breaker integration,
 *       and OpenRouter fallback behavior.
 *
 * NOTE: queryModel.ts now exports class `OpenRouterQueryManager`.
 *       The integration test uses the class directly for realistic behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterQueryManager } from '../queryModel';
import { ConsoleLogger } from '../../../core/logger';

// ── Setup ──
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function createMockResponse(overrides: Partial<Response> = {}): Response {
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        redirected: false,
        type: 'basic' as ResponseType,
        url: '',
        clone: () => createMockResponse(overrides),
        body: null,
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob()),
        formData: () => Promise.resolve(new FormData()),
        text: () => Promise.resolve(''),
        json: () => Promise.resolve({
            choices: [{ message: { content: 'test response' } }]
        }),
        ...overrides,
    } as Response;
}

describe('queryModel — Integration Tests (via OpenRouterQueryManager)', () => {
    let manager: OpenRouterQueryManager;
    let logger: ConsoleLogger;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: false });
        logger = new ConsoleLogger();
        manager = new OpenRouterQueryManager(logger);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    // ── Retry Logic ──
    it('should retry on transient network failure and eventually succeed', async () => {
        let attempts = 0;
        mockFetch.mockImplementation(async () => {
            attempts++;
            if (attempts <= 2) {
                throw new Error('Network error');
            }
            return createMockResponse({
                json: async () => ({
                    choices: [{ message: { content: 'success after retry' } }]
                })
            });
        });

        const promise = manager.queryModel(
            'test', 'default', 'https://api.test.com/chat', 'test-key',
            undefined, 'primary', 3, 5000
        );

        await vi.advanceTimersByTimeAsync(10000);

        const result = await promise;
        expect(result).toBe('success after retry');
        expect(attempts).toBe(3);
    });

    it('should throw after exhausting all retries', async () => {
        mockFetch.mockRejectedValue(new Error('Persistent network error'));

        const promise = manager.queryModel(
            'test', 'default', 'https://api.test.com/chat', 'test-key',
            undefined, 'primary', 2, 5000
        );

        await vi.advanceTimersByTimeAsync(10000);

        await expect(promise).rejects.toThrow('Persistent network error');
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // ── Timeout ──
    it('should timeout when request exceeds specified duration', async () => {
        mockFetch.mockImplementation(() => new Promise(() => {}));

        const promise = manager.queryModel(
            'test', 'default', 'https://api.test.com/chat', 'test-key',
            undefined, 'primary', 1, 100
        );

        await vi.advanceTimersByTimeAsync(200);

        await expect(promise).rejects.toThrow('timed out after 100ms');
    });

    it('should timeout on OpenRouter query', async () => {
        mockFetch.mockImplementation(() => new Promise(() => {}));

        const promise = manager.queryOpenRouter('test', 'valid-key', 1, 100);

        await vi.advanceTimersByTimeAsync(200);

        await expect(promise).rejects.toThrow('timed out after 100ms');
    });

    // ── HTTP Error Responses ──
    it('should handle 401 Unauthorized from endpoint', async () => {
        mockFetch.mockResolvedValue(createMockResponse({
            ok: false,
            status: 401,
            text: async () => 'Invalid API key',
        }));

        await expect(
            manager.queryModel('test', 'default', 'https://api.test.com/chat', 'bad-key', undefined, 'primary', 1, 5000)
        ).rejects.toThrow('AI API error (primary): 401 Invalid API key');
    });

    it('should handle 429 Rate Limited', async () => {
        mockFetch.mockResolvedValue(createMockResponse({
            ok: false,
            status: 429,
            text: async () => 'Too Many Requests',
        }));

        await expect(
            manager.queryModel('test', 'default', 'https://api.test.com/chat', 'key', undefined, 'primary', 1, 5000)
        ).rejects.toThrow('AI API error (primary): 429 Too Many Requests');
    });

    it('should handle 500 Internal Server Error', async () => {
        mockFetch.mockResolvedValue(createMockResponse({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error',
        }));

        await expect(
            manager.queryModel('test', 'default', 'https://api.test.com/chat', 'key', undefined, 'primary', 1, 5000)
        ).rejects.toThrow('AI API error (primary): 500 Internal Server Error');
    });

    // ── Response Parsing ──
    it('should parse reasoning_content over content when both present', async () => {
        mockFetch.mockResolvedValue(createMockResponse({
            json: async () => ({
                choices: [{
                    message: {
                        reasoning_content: 'deep reasoning',
                        content: 'fallback content',
                    }
                }]
            })
        }));

        const result = await manager.queryModel(
            'test', 'default', 'https://api.test.com/chat', 'test-key',
            undefined, 'primary', 1, 5000
        );
        expect(result).toBe('deep reasoning');
    });

    it('should handle empty response from model', async () => {
        mockFetch.mockResolvedValue(createMockResponse({
            json: async () => ({
                choices: [{ message: { content: '' } }]
            })
        }));

        await expect(
            manager.queryModel('test', 'default', 'https://api.test.com/chat', 'test-key', undefined, 'primary', 1, 5000)
        ).rejects.toThrow('Empty response from model');
    });

    // ── Request Structure ──
    it('should include correct model name from task mapping', async () => {
        mockFetch.mockResolvedValue(createMockResponse());

        await manager.queryModel(
            'test', 'market_analysis', 'https://api.test.com/chat', 'test-key',
            undefined, 'primary', 1, 5000
        );

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.model).toBeDefined();
        expect(typeof body.model).toBe('string');
    });

    // ── Circuit Breaker Integration ──
    it('should trip circuit breaker after 3 consecutive failures', async () => {
        mockFetch.mockRejectedValue(new Error('Service unavailable'));

        // First 3 calls fail → breaker trips
        for (let i = 0; i < 3; i++) {
            await expect(
                manager.queryModel('test', 'default', 'https://api.test.com/chat', 'test-key', undefined, 'breaker-test', 1, 5000)
            ).rejects.toThrow();
        }

        // 4th call should be rejected immediately by circuit breaker
        await expect(
            manager.queryModel('test', 'default', 'https://api.test.com/chat', 'test-key', undefined, 'breaker-test', 1, 5000)
        ).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should reset circuit breaker after timeout period', async () => {
        let callCount = 0;
        mockFetch.mockImplementation(async () => {
            callCount++;
            if (callCount <= 3) {
                throw new Error('Service unavailable');
            }
            return createMockResponse({
                json: async () => ({
                    choices: [{ message: { content: 'recovered' } }]
                })
            });
        });

        // Trip the breaker
        for (let i = 0; i < 3; i++) {
            await expect(
                manager.queryModel('test', 'default', 'https://api.test.com/chat', 'test-key', undefined, 'reset-test', 1, 5000)
            ).rejects.toThrow();
        }

        // Advance past reset timeout (60s default)
        await vi.advanceTimersByTimeAsync(61000);

        // Should attempt again and succeed
        const result = await manager.queryModel('test', 'default', 'https://api.test.com/chat', 'test-key', undefined, 'reset-test', 1, 5000);
        expect(result).toBe('recovered');
        expect(callCount).toBe(4);
    });
});