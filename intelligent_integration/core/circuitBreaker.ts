/**
 * @file circuitBreaker.ts
 * @layer core
 * @desc Circuit Breaker pattern implementation for resilient AI provider calls.
 *       Prevents cascading failures by tracking error rates and opening the circuit
 *       when thresholds are exceeded. Supports half-open state for automatic recovery.
 *
 * @usage
 *   const breaker = new CircuitBreaker('OpenRouter', {
 *       failureThreshold: 5,
 *       resetTimeoutMs: 30000,
 *   });
 *
 *   const result = await breaker.call(() => api.fetchData());
 *
 * @exposes CircuitBreaker, CircuitBreakerOptions, CircuitState
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
    /** Number of consecutive failures before opening the circuit (default: 5) */
    failureThreshold: number;
    /** Time in ms before attempting to half-open the circuit (default: 30s) */
    resetTimeoutMs: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: 5,
    resetTimeoutMs: 30_000,
};

export interface CircuitBreakerStats {
    name: string;
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailure: string | null;
    lastSuccess: string | null;
    openedAt: string | null;
    options: CircuitBreakerOptions;
}

/**
 * Circuit Breaker for AI provider calls.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests are rejected immediately
 * - HALF_OPEN: After reset timeout, one test request is allowed through
 */
export class CircuitBreaker {
    public readonly name: string;
    private options: CircuitBreakerOptions;
    private state: CircuitState = 'CLOSED';
    private failureCount = 0;
    private successCount = 0;
    private lastFailure: string | null = null;
    private lastSuccess: string | null = null;
    private openedAt: string | null = null;
    private halfOpenAttempted = false;

    constructor(name: string, options?: Partial<CircuitBreakerOptions>) {
        this.name = name;
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Execute a function with circuit breaker protection.
     * If circuit is OPEN, throws CircuitBreakerError immediately.
     * If circuit is HALF_OPEN, allows one test request.
     */
    async call<T>(fn: () => Promise<T>): Promise<T> {
        this.checkHalfOpen();

        if (this.state === 'OPEN') {
            throw new CircuitBreakerError(
                this.name,
                `Circuit is OPEN (failed ${this.failureCount}/${this.options.failureThreshold} consecutive times)`
            );
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * Get current stats for monitoring/logging.
     */
    getStats(): CircuitBreakerStats {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailure: this.lastFailure,
            lastSuccess: this.lastSuccess,
            openedAt: this.openedAt,
            options: { ...this.options },
        };
    }

    /**
     * Manually reset the circuit to CLOSED state.
     */
    reset(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailure = null;
        this.openedAt = null;
        this.halfOpenAttempted = false;
    }

    /**
     * Manually trip the circuit to OPEN state.
     */
    trip(): void {
        this.state = 'OPEN';
        this.openedAt = new Date().toISOString();
    }

    // ── Private ──────────────────────────────────────────────

    private onSuccess(): void {
        this.successCount++;
        this.lastSuccess = new Date().toISOString();
        this.halfOpenAttempted = false;

        if (this.state === 'HALF_OPEN') {
            // Success in half-open means service recovered
            this.state = 'CLOSED';
            this.failureCount = 0;
            this.openedAt = null;
        }
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailure = new Date().toISOString();

        if (this.state === 'HALF_OPEN') {
            // Failure in half-open means still broken, back to OPEN
            this.state = 'OPEN';
            this.openedAt = new Date().toISOString();
            this.halfOpenAttempted = false;
            return;
        }

        if (this.failureCount >= this.options.failureThreshold) {
            this.state = 'OPEN';
            this.openedAt = new Date().toISOString();
        }
    }

    private checkHalfOpen(): void {
        if (this.state !== 'OPEN') return;
        if (this.halfOpenAttempted) return;

        const elapsed = Date.now() - new Date(this.openedAt!).getTime();
        if (elapsed >= this.options.resetTimeoutMs) {
            this.state = 'HALF_OPEN';
            this.halfOpenAttempted = true;
        }
    }
}

/**
 * Error thrown when a circuit breaker rejects a request.
 */
export class CircuitBreakerError extends Error {
    public readonly breakerName: string;

    constructor(breakerName: string, message: string) {
        super(`[CircuitBreaker:${breakerName}] ${message}`);
        this.name = 'CircuitBreakerError';
        this.breakerName = breakerName;
    }
}