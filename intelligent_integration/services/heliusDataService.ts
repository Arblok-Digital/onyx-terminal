/**
 * @file heliusDataService.ts
 * @layer service
 * @desc Central Helius API data service with rate limiting for free tier.
 *       Free tier: 100k credits/month, ~10 req/s.
 *       We use 8 req/s to stay safely under the limit.
 *
 *       All agent data fetching goes through this service to ensure
 *       unified rate limiting, caching, and circuit breaker protection.
 *
 * @exposes HeliusDataService
 */

import { Connection, PublicKey } from '@solana/web3.js';
import type { ParsedAccountData } from '@solana/web3.js';
import { RateLimiter } from '../core/rateLimiter';
import { CircuitBreaker } from '../core/circuitBreaker';
import { getEnv } from '../utils/getEnv';

// ── Rate Limit Config (Helius Free Tier) ─────────────────────────
const HELIUS_RATE_CONFIG = {
  // 8 requests per second (safe under 10/s free tier limit)
  tokensPerInterval: 8,
  intervalMs: 1_000,
};

// 100,000 credits/month on free tier
const MAX_MONTHLY_CREDITS = 100_000;

// ── Cache TTLs ──────────────────────────────────────────────────
const CACHE_TTL_SHORT = 30_000;   // 30 seconds — volatile data (signatures, txns)
const CACHE_TTL_MEDIUM = 60_000;  // 1 minute — semi-static (holders, supply)
const CACHE_TTL_LONG = 300_000;   // 5 minutes — static (mint info, metadata)

// ── Types ───────────────────────────────────────────────────────

export interface TokenHolderInfo {
  address: string;
  amount: number;
  percentage: number;
  uiAmount: number;
}

export interface TokenMetadataResult {
  mint: string;
  supply: number;
  decimals: number;
  totalSupplyUi: number;
  holderCount: number;
  topHolders: TokenHolderInfo[];
  topHolderConcentration: number;   // top 5 % of supply
  creator: string;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isVerified: boolean;
  renounced: boolean;
  creationSlot?: number;
  creationTimestamp?: number;
}

export interface RecentSignatureInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: string | null;
  memo: string | null;
}

export interface ParsedTransactionData {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: string | null;
  type: 'buy' | 'sell' | 'transfer' | 'mint' | 'burn' | 'unknown';
  amount: number;
  fromAddress: string | null;
  toAddress: string | null;
  tokenAmount: number;
}

export interface CreditStats {
  used: number;
  max: number;
  remaining: number;
  percentUsed: number;
}

// ── HeliusDataService ───────────────────────────────────────────

export class HeliusDataService {
  private connection: Connection;
  private rateLimiter: RateLimiter;
  private breaker: CircuitBreaker;
  private cache: Map<string, { data: unknown; timestamp: number }>;
  private monthlyCreditsUsed: number;
  private initialized: boolean;

  constructor() {
    const apiKey = getEnv('VITE_HELIUS_API_KEY', '');
    const rpcUrl = apiKey
      ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
      : getEnv('VITE_MAINNET_RPC', 'https://api.mainnet-beta.solana.com');

    this.connection = new Connection(rpcUrl, 'confirmed');
    this.rateLimiter = new RateLimiter('helius', HELIUS_RATE_CONFIG);
    this.breaker = new CircuitBreaker('helius', {
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
    });
    this.cache = new Map();
    this.monthlyCreditsUsed = 0;
    this.initialized = true;

    const logMsg = apiKey
      ? `[HeliusDataService] Initialized with Helius RPC (key: ${apiKey.slice(0, 6)}...)`
      : `[HeliusDataService] No Helius API key — using public RPC (rate limits will be stricter)`;
    console.info(logMsg);
  }

  // ── Public Properties ──────────────────────────────────────────

  get isInitialized(): boolean {
    return this.initialized;
  }

  get rateLimiterStats() {
    return this.rateLimiter.getStats();
  }

  get breakerState() {
    return this.breaker.getState();
  }

  // ── Public API Methods ─────────────────────────────────────────

  /**
   * Get comprehensive token metadata in a single batched call.
   * Credits: ~3 (supply + largest accounts + account info)
   */
  async getTokenMetadata(mint: string): Promise<TokenMetadataResult | null> {
    const cacheKey = `meta:${mint}`;
    const cached = this.getCached<TokenMetadataResult>(cacheKey, CACHE_TTL_MEDIUM);
    if (cached) return cached;

    try {
      const pubkey = new PublicKey(mint);

      // Rate-limited parallel fetch
      const [supplyResult, largestAccounts, accountInfo] = await Promise.all([
        this.rateLimitedCall(() => this.connection.getTokenSupply(pubkey), 1),
        this.rateLimitedCall(() => this.connection.getTokenLargestAccounts(pubkey), 1),
        this.rateLimitedCall(() => this.connection.getParsedAccountInfo(pubkey), 1),
      ]);

      // Parse supply
      const supply = supplyResult?.value?.amount ? Number(supplyResult.value.amount) : 0;
      const decimals = supplyResult?.value?.decimals ?? 9;
      const totalSupplyUi = supplyResult?.value?.uiAmount ?? 0;

      // Parse holders
      const holderEntries = largestAccounts?.value ?? [];
      const holderCount = holderEntries.length;
      const totalAmount = holderEntries.reduce((sum, h) => sum + Number(h.amount), 0);

      const topHolders: TokenHolderInfo[] = holderEntries.slice(0, 20).map((h) => {
        const amount = Number(h.amount);
        return {
          address: h.address.toBase58(),
          amount,
          uiAmount: decimals > 0 ? amount / 10 ** decimals : amount,
          percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        };
      });

      // Top 5 concentration
      const topHolderConcentration = topHolders
        .slice(0, 5)
        .reduce((sum, h) => sum + h.percentage, 0);

      // Parse mint account info
      const parsedData = accountInfo?.value?.data as ParsedAccountData | undefined;
      const mintInfo = parsedData?.parsed?.info ?? {};
      const creator = (accountInfo?.value?.owner as PublicKey)?.toBase58?.() ?? '';
      const mintAuthority = mintInfo.mintAuthority ?? null;
      const freezeAuthority = mintInfo.freezeAuthority ?? null;
      const isVerified = !mintAuthority && !freezeAuthority; // renounced = verified-ish
      const renounced = !mintAuthority;

      const result: TokenMetadataResult = {
        mint,
        supply,
        decimals,
        totalSupplyUi,
        holderCount,
        topHolders,
        topHolderConcentration,
        creator,
        mintAuthority,
        freezeAuthority,
        isVerified,
        renounced,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[HeliusDataService] getTokenMetadata error:', error);
      return null;
    }
  }

  /**
   * Get recent transaction signatures for an address.
   * Credits: 1
   */
  async getRecentSignatures(
    address: string,
    limit: number = 20,
  ): Promise<RecentSignatureInfo[]> {
    const cacheKey = `sigs:${address}:${limit}`;
    const cached = this.getCached<RecentSignatureInfo[]>(cacheKey, CACHE_TTL_SHORT);
    if (cached) return cached;

    try {
      const pubkey = new PublicKey(address);
      const signatures = await this.rateLimitedCall(
        () => this.connection.getSignaturesForAddress(pubkey, { limit }),
        1,
      );

      const result: RecentSignatureInfo[] = (signatures ?? []).map((s) => ({
        signature: s.signature,
        slot: s.slot,
        blockTime: s.blockTime ?? null,
        err: s.err ?? null,
        memo: s.memo ?? null,
      }));

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[HeliusDataService] getRecentSignatures error:', error);
      return [];
    }
  }

  /**
   * Get parsed transaction data for a signature.
   * Credits: 1
   */
  async getTransaction(signature: string): Promise<ParsedTransactionData | null> {
    const cacheKey = `tx:${signature}`;
    const cached = this.getCached<ParsedTransactionData>(cacheKey, CACHE_TTL_LONG);
    if (cached) return cached;

    try {
      const tx = await this.rateLimitedCall(
        () => this.connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        }),
        1,
      );

      if (!tx) return null;

      const blockTime = tx.blockTime ?? null;
      const err = tx.meta?.err ? String(tx.meta.err) : null;

      // Parse token transfers from instructions
      let type: ParsedTransactionData['type'] = 'unknown';
      let amount = 0;
      let tokenAmount = 0;
      let fromAddress: string | null = null;
      let toAddress: string | null = null;

      const instructions = tx.transaction?.message?.instructions ?? [];
      for (const ix of instructions) {
        if ('parsed' in ix && ix.parsed) {
          const parsed = ix.parsed;
          if (parsed.type === 'transfer' && parsed.info) {
            type = 'transfer';
            amount = Number(parsed.info.amount ?? 0);
            tokenAmount = Number(parsed.info.tokenAmount?.uiAmount ?? parsed.info.amount ?? 0);
            fromAddress = parsed.info.authority ?? parsed.info.source ?? null;
            toAddress = parsed.info.destination ?? null;

            // Heuristic: if destination is a known DEX program, it's a sell; if source is DEX, it's a buy
            if (toAddress && this.isDexProgram(toAddress)) {
              type = 'sell';
            } else if (fromAddress && this.isDexProgram(fromAddress)) {
              type = 'buy';
            }
            break;
          }
          if (parsed.type === 'mintTo' && parsed.info) {
            type = 'mint';
            amount = Number(parsed.info.amount ?? 0);
            toAddress = parsed.info.account ?? null;
            break;
          }
          if (parsed.type === 'burn' && parsed.info) {
            type = 'burn';
            amount = Number(parsed.info.amount ?? 0);
            fromAddress = parsed.info.authority ?? null;
            break;
          }
        }
      }

      // Also check inner instructions
      const innerInstructions = tx.meta?.innerInstructions ?? [];
      if (type === 'unknown' && innerInstructions.length > 0) {
        for (const inner of innerInstructions) {
          for (const ix of inner.instructions) {
            if ('parsed' in ix && ix.parsed) {
              const parsed = ix.parsed;
              if (parsed.type === 'transfer' && parsed.info) {
                type = 'transfer';
                amount = Number(parsed.info.amount ?? 0);
                tokenAmount = Number(parsed.info.tokenAmount?.uiAmount ?? parsed.info.amount ?? 0);
                fromAddress = parsed.info.authority ?? parsed.info.source ?? null;
                toAddress = parsed.info.destination ?? null;
                if (toAddress && this.isDexProgram(toAddress)) type = 'sell';
                else if (fromAddress && this.isDexProgram(fromAddress)) type = 'buy';
                break;
              }
            }
          }
          if (type !== 'unknown') break;
        }
      }

      const result: ParsedTransactionData = {
        signature,
        slot: tx.slot,
        blockTime,
        err,
        type,
        amount,
        fromAddress,
        toAddress,
        tokenAmount,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[HeliusDataService] getTransaction error:', error);
      return null;
    }
  }

  /**
   * Get parsed account info for any address.
   * Credits: 1
   */
  async getAccountInfo(address: string): Promise<{ owner: string; data: any } | null> {
    const cacheKey = `acct:${address}`;
    const cached = this.getCached<{ owner: string; data: any }>(cacheKey, CACHE_TTL_MEDIUM);
    if (cached) return cached;

    try {
      const pubkey = new PublicKey(address);
      const info = await this.rateLimitedCall(
        () => this.connection.getParsedAccountInfo(pubkey),
        1,
      );

      if (!info.value) return null;

      const result = {
        owner: info.value.owner.toBase58(),
        data: (info.value.data as ParsedAccountData)?.parsed ?? null,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[HeliusDataService] getAccountInfo error:', error);
      return null;
    }
  }

  /**
   * Get current credit usage stats.
   */
  getCreditStats(): CreditStats {
    return {
      used: this.monthlyCreditsUsed,
      max: MAX_MONTHLY_CREDITS,
      remaining: MAX_MONTHLY_CREDITS - this.monthlyCreditsUsed,
      percentUsed: (this.monthlyCreditsUsed / MAX_MONTHLY_CREDITS) * 100,
    };
  }

  /**
   * Get the underlying Solana Connection (for advanced use).
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Clear all caches.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Reset monthly credit counter (call at start of each month).
   */
  resetMonthlyCredits(): void {
    this.monthlyCreditsUsed = 0;
  }

  // ── Private Helpers ────────────────────────────────────────────

  /**
   * Execute a function with rate limiting and circuit breaker protection.
   */
  private async rateLimitedCall<T>(fn: () => Promise<T>, creditCost: number = 1): Promise<T> {
    await this.rateLimiter.wait();
    this.monthlyCreditsUsed += creditCost;
    return this.breaker.call(fn);
  }

  private getCached<T>(key: string, ttl: number): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    // Prevent cache from growing unbounded
    if (this.cache.size > 500) {
      // Clear oldest 100 entries
      const entries = Array.from(this.cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < 100 && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Check if an address is a known DEX program (for buy/sell detection).
   */
  private isDexProgram(address: string): boolean {
    const dexPrograms = [
      '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium
      'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Whirlpool
      'JUP6i4ozu2wdyUJ5tHmEUo9R8pN3fxffN5r5i8w6NnQk', // Jupiter
      'DCAncyf3P4qMx27MTN4Rk8M4KE2Kbg2Zj18on7jUbhi',  // Jupiter DCA
      '9W959DqEETiGZocY2QDrbLhwF4fhZnA6UKZMTS4x28s2', // Orca
      'MERaFG1Gp5PSR7en4q8tqytf8M5r5k9cXuyk9euPSgJm', // Meteora
      'LXZE8H9KbDQ4RzdY5oNYNngGw4BfmXGwRaZuiUDq2vE',  // FluxBeam
    ];
    return dexPrograms.includes(address);
  }
}

// ── Singleton ───────────────────────────────────────────────────

let _instance: HeliusDataService | null = null;

export function getHeliusDataService(): HeliusDataService {
  if (!_instance) {
    _instance = new HeliusDataService();
  }
  return _instance;
}

export function resetHeliusDataService(): void {
  _instance = null;
}
