/**
 * @file core/index.ts
 * @layer core
 * @desc Barrel export for all core infrastructure modules.
 *       Import from here instead of deep imports into individual core files.
 *
 * @usage
 *   import { DiContainer, container, TOKENS } from '../core';
 *   import { CircuitBreaker, RateLimiter, createLogger, ConfigValidator } from '../core';
 */

// ── DI Container ──
export { DiContainer, container } from './diContainer';

// ── DI Tokens ──
export { TOKENS } from './diTokens';
export type { Token } from './diTokens';

// ── Circuit Breaker ──
export { CircuitBreaker, CircuitBreakerError } from './circuitBreaker';
export type { CircuitBreakerOptions, CircuitBreakerStats, CircuitState } from './circuitBreaker';

// ── Rate Limiter ──
export { RateLimiter } from './rateLimiter';
export type { RateLimiterOptions, RateLimiterStats } from './rateLimiter';

// ── Logger ──
export { createLogger } from './logger';
export type { Logger, LogEntry, LogLevel } from './logger';

// ── Config Validator ──
export { ConfigValidator, configValidator } from './configValidator';
export type { ConfigRule, ConfigValidationResult } from './configValidator';