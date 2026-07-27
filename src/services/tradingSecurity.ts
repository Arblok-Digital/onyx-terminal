/**
 * @file tradingSecurity.ts
 * @layer services
 * @desc ECC llm-trading-agent-security implementation for Onyx Terminal.
 *       Three layers: SpendLimitGuard, TradingCircuitBreaker, Sanitizer.
 * @deps -
 */

/* ======================================================================== */
/*  LAYER 1: Spend Limit Guard                                              */
/* ======================================================================== */

const MAX_SINGLE_TX_USD = Number(import.meta.env.VITE_MAX_SINGLE_TX_USD) || 500;
const MAX_DAILY_SPEND_USD = Number(import.meta.env.VITE_MAX_DAILY_SPEND_USD) || 2000;

export class SpendLimitError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "SpendLimitError";
  }
}

interface SpendRecord {
  timestamp: number;
  usdAmount: number;
  txSignature?: string;
}

/**
 * Client-side spend limit guard.
 * Actual enforcement happens server-side in jup-proxy.js.
 * This is a pre-check to warn users early.
 */
export class SpendLimitGuard {
  private records: SpendRecord[] = [];

  /** Estimate USD value from amount + known token price (simplified). */
  estimateUsd(
    amount: number,
    priceUsd: number | null,
  ): number {
    return priceUsd ? amount * priceUsd : 0;
  }

  /** Client-side pre-check. Returns error message or null if OK. */
  preCheck(usdAmount: number): string | null {
    if (usdAmount <= 0) return "Invalid amount";

    if (usdAmount > MAX_SINGLE_TX_USD) {
      return `❌ Per-transaction limit: $${MAX_SINGLE_TX_USD}. Your swap ~$${usdAmount.toFixed(2)} exceeds it.`;
    }

    const dailyTotal = this.get24hSpend();
    if (dailyTotal + usdAmount > MAX_DAILY_SPEND_USD) {
      return `❌ Daily spend limit: $${MAX_DAILY_SPEND_USD}. Used: $${dailyTotal.toFixed(2)} + ~$${usdAmount.toFixed(2)} exceeds limit.`;
    }

    return null;
  }

  /** Record a successful spend locally. */
  record(usdAmount: number, txSignature?: string): void {
    this.records.push({ timestamp: Date.now(), usdAmount, txSignature });
  }

  /** Total spend in last 24 hours. */
  get24hSpend(): number {
    const cutoff = Date.now() - 86_400_000;
    return this.records
      .filter((r) => r.timestamp > cutoff)
      .reduce((sum, r) => sum + r.usdAmount, 0);
  }

  /** Reset (e.g., on wallet disconnect). */
  reset(): void {
    this.records = [];
  }
}

/* ======================================================================== */
/*  LAYER 2: Trading Circuit Breaker                                         */
/* ======================================================================== */

export class CircuitBreakerError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "CircuitBreakerError";
  }
}

interface BreakerState {
  consecutiveFailedSwaps: number;
  hourlyStartValue: number;
  hourlyStartTime: number;
  isTripped: boolean;
  tripReason: string;
}

export class TradingCircuitBreaker {
  private state: BreakerState = {
    consecutiveFailedSwaps: 0,
    hourlyStartValue: 0,
    hourlyStartTime: Date.now(),
    isTripped: false,
    tripReason: "",
  };

  static readonly MAX_CONSECUTIVE_FAILURES = 3;
  static readonly MAX_HOURLY_LOSS_PCT = 0.05;
  static readonly COOLDOWN_MS = 300_000; // 5 menit setelah trip

  /** Cek apakah breaker nyala. Lempar error kalo trip. */
  check(): void {
    if (this.state.isTripped) {
      const elapsed = Date.now() - this.state.tripStart;
      if (elapsed > TradingCircuitBreaker.COOLDOWN_MS) {
        // Auto-reset setelah cooldown
        this.reset();
        return;
      }
      throw new CircuitBreakerError(
        `⛔ Circuit breaker aktif: ${this.state.tripReason}. Coba lagi ${Math.ceil(
          (TradingCircuitBreaker.COOLDOWN_MS - elapsed) / 60_000,
        )} menit lagi.`,
      );
    }
  }

  /** Report failed swap — increment counter. */
  reportFailure(reason: string): void {
    this.state.consecutiveFailedSwaps++;
    console.warn(`[CircuitBreaker] Failure #${this.state.consecutiveFailedSwaps}: ${reason}`);

    if (this.state.consecutiveFailedSwaps >= TradingCircuitBreaker.MAX_CONSECUTIVE_FAILURES) {
      this.trip(`${this.state.consecutiveFailedSwaps}x consecutive swap failures`);
    }
  }

  /** Report successful swap — reset counter, update hourly position. */
  reportSuccess(portfolioUsd: number): void {
    this.state.consecutiveFailedSwaps = 0;

    // Reset hourly tracking tiap jam
    const now = Date.now();
    if (now - this.state.hourlyStartTime > 3_600_000) {
      this.state.hourlyStartValue = portfolioUsd;
      this.state.hourlyStartTime = now;
      return;
    }

    // Cek hourly loss
    if (this.state.hourlyStartValue > 0 && portfolioUsd > 0) {
      const pnl = (portfolioUsd - this.state.hourlyStartValue) / this.state.hourlyStartValue;
      if (pnl < -TradingCircuitBreaker.MAX_HOURLY_LOSS_PCT) {
        this.trip(`Hourly PnL ${(pnl * 100).toFixed(1)}% exceeds -${(TradingCircuitBreaker.MAX_HOURLY_LOSS_PCT * 100).toFixed(0)}% threshold`);
      }
    }
  }

  private trip(reason: string): void {
    this.state.isTripped = true;
    this.state.tripReason = reason;
    /** @ts-ignore custom field */
    this.state.tripStart = Date.now();
    console.error(`[CircuitBreaker] TRIPPED: ${reason}`);
  }

  /** Get current breaker status. */
  getStatus(): string {
    if (this.state.isTripped) return `⛔ TRIPPED: ${this.state.tripReason}`;
    return `✅ OK (failures: ${this.state.consecutiveFailedSwaps}/${TradingCircuitBreaker.MAX_CONSECUTIVE_FAILURES})`;
  }

  /** Manual reset. */
  reset(): void {
    this.state = {
      consecutiveFailedSwaps: 0,
      hourlyStartValue: 0,
      hourlyStartTime: Date.now(),
      isTripped: false,
      tripReason: "",
    };
  }
}

/* ======================================================================== */
/*  LAYER 3: Prompt Injection Sanitizer (untuk AI context)                   */
/* ======================================================================== */

/**
 * Patterns yang sering dipake buat prompt injection via on-chain data.
 * Token name, description, atau symbol bisa aja berisi perintah LLM jahat.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s(previous|all)\sinstructions/i,
  /new\s(task|directive|instruction|system\s?prompt)/i,
  /system\s?prompt/i,
  /send\s.{0,50}\s?to\s0x[a-fA-F0-9]{40}/i,
  /transfer\s.{0,50}\s?to/i,
  /approve\s.{0,50}\s?for/i,
  /you\sare\s(now|hereby)/i,
  /act\sas\s/i,
  /from\snow\son/i,
];

/**
 * Sanitize text from on-chain sources (token names, descriptions, socials)
 * before it enters the AI chat context.
 */
export function sanitizeOnchainData(text: string): string {
  if (!text) return text;

  let clean = text;

  // 1. Strip null bytes and control chars (except newlines)
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 2. Check injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(clean)) {
      console.warn(`[Sanitizer] Potential injection blocked: "${clean.slice(0, 80)}..."`);
      // Scrubbing: replace matched text with harmless placeholder
      clean = clean.replace(pattern, "[blocked:potential injection]");
    }
  }

  // 3. Limit length to prevent token spam
  if (clean.length > 500) {
    clean = clean.slice(0, 497) + "...";
  }

  return clean;
}

/**
 * Sanitize a token info object before passing to AI context.
 */
export interface TokenInfo {
  symbol?: string;
  name?: string;
  description?: string;
  mint?: string;
  [key: string]: unknown;
}

export function sanitizeTokenForAI(token: TokenInfo): TokenInfo {
  return {
    ...token,
    symbol: token.symbol ? sanitizeOnchainData(token.symbol) : token.symbol,
    name: token.name ? sanitizeOnchainData(token.name) : token.name,
    description: token.description ? sanitizeOnchainData(token.description) : token.description,
  };
}

/* ======================================================================== */
/*  Singletons                                                               */
/* ======================================================================== */

export const spendLimitGuard = new SpendLimitGuard();
export const circuitBreaker = new TradingCircuitBreaker();
