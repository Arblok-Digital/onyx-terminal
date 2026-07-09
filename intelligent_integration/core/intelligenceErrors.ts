/**
 * @file intelligenceErrors.ts
 * @layer core
 * @desc Typed error hierarchy for Onyx intelligence system.
 *       Based on ECC error-handling skill: typed errors > string messages.
 *       User messages ≠ developer messages — show friendly text to users, log full context.
 *
 * @usage
 *   throw new IntelligenceError('Token analysis failed', 'ANALYSIS_FAILED', 'phase1');
 *   throw new IntelligenceError('Token not found', 'NOT_FOUND', 'phase1', { tokenAddress });
 *   throw new IntelligenceError('OpenRouter rate limited', 'RATE_LIMITED', 'phase1');
 *
 *   catch (error) {
 *     if (error instanceof IntelligenceError) { ... }
 *   }
 *
 * @exposes IntelligenceError, IntelligenceErrorCode
 */

export type IntelligencePhase = 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'routing';

export type IntelligenceErrorCode =
  | 'ANALYSIS_FAILED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_TOKEN'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'ORCHESTRATION_FAILED';

/**
 * Typed error for Onyx intelligence operations.
 * Extends Error with code, phase, and optional details for structured handling.
 */
export class IntelligenceError extends Error {
  public readonly code: IntelligenceErrorCode;
  public readonly phase: IntelligencePhase;
  public readonly details?: unknown;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: IntelligenceErrorCode,
    phase: IntelligencePhase,
    details?: unknown,
  ) {
    super(message);
    this.name = 'IntelligenceError';
    this.code = code;
    this.phase = phase;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintain correct prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Get user-friendly message (no technical details).
   */
  getUserMessage(): string {
    const messages: Record<IntelligenceErrorCode, string> = {
      ANALYSIS_FAILED: 'Analysis failed — please check the token address and try again.',
      NOT_FOUND: 'Token not found — verify the token address is correct.',
      RATE_LIMITED: 'Too many requests — please wait a moment and try again.',
      PROVIDER_UNAVAILABLE: 'AI provider is temporarily unavailable. Please try again later.',
      INVALID_TOKEN: 'Invalid token address format.',
      NETWORK_ERROR: 'Network error — please check your connection and try again.',
      TIMEOUT: 'Analysis timed out — the token may have low liquidity or the network is congested.',
      ORCHESTRATION_FAILED: 'Analysis pipeline failed — please try again.',
    };
    return messages[this.code] ?? 'An unexpected error occurred. Please try again.';
  }

  /**
   * Serialize to JSON for logging / API responses.
   */
  toJSON(): Record<string, unknown> {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      phase: this.phase,
      timestamp: this.timestamp,
      details: this.details,
    };
  }
}
