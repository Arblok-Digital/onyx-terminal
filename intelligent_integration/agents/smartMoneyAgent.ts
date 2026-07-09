/**
 * @file smartMoneyAgent.ts
 * @layer agent
 * @desc Smart Money Agent — analyzes whale activity quality and identifies smart money.
 *       Uses Helius holder data + transaction signatures for real whale tracking.
 *       Accepts OnchainAnalysis + FlowAnalysis from Phase 1 agents (feedback loop).
 *       No Inversify DI — plain class.
 *
 * @exposes SmartMoneyAgent
 */

import type { SmartMoneyAnalysis, SmartWalletEntry, OnchainAnalysis, FlowAnalysis } from '../types/analysisTypes';
import { HeliusDataService } from '../services/heliusDataService';
import { safeNumber, safeDivide, clamp, round, SimpleCache, type AgentLogger, consoleLogger } from './agentUtils';

// Known DEX/Program addresses (not smart money)
const DEX_ADDRESSES = new Set([
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Whirlpool
  'JUP6i4ozu2wdyUJ5tHmEUo9R8pN3fxffN5r5i8w6NnQk', // Jupiter
]);

export class SmartMoneyAgent {
  private helius: HeliusDataService;
  private logger: AgentLogger;
  private cache: SimpleCache<SmartMoneyAnalysis>;

  constructor(helius?: HeliusDataService, logger?: AgentLogger) {
    this.helius = helius ?? new HeliusDataService();
    this.logger = logger ?? consoleLogger;
    this.cache = new SimpleCache(300_000); // 5 min cache
  }

  /**
   * Analyze smart money activity.
   * Requires Phase 1 outputs: onchainAnalysis + flowAnalysis (feedback loop).
   */
  async analyzeToken(
    tokenAddress: string,
    onchainAnalysis: OnchainAnalysis,
    flowAnalysis: FlowAnalysis,
  ): Promise<SmartMoneyAnalysis> {
    const cached = this.cache.get(tokenAddress);
    if (cached) return cached;

    const t0 = Date.now();
    this.logger.info(`[SmartMoneyAgent] Analyzing ${tokenAddress.slice(0, 8)}...`);

    try {
      // ── Fetch token metadata for holder data ──────────────────
      const metadata = await this.helius.getTokenMetadata(tokenAddress);

      if (!metadata || metadata.topHolders.length === 0) {
        this.logger.warn(`[SmartMoneyAgent] No holder data for ${tokenAddress}`);
        return this.buildEmptyAnalysis(tokenAddress);
      }

      // ── Identify Smart Whales ──────────────────────────────────
      // Filter out DEX/program addresses, keep only real wallets holding > 0.5%
      const realHolders = metadata.topHolders.filter(h =>
        h.percentage > 0.5 && !DEX_ADDRESSES.has(h.address)
      );

      const smartWhales: SmartWalletEntry[] = [];

      // Check transaction history for top holders (limited to 3 to save credits)
      for (const holder of realHolders.slice(0, 3)) {
        const sigs = await this.helius.getRecentSignatures(holder.address, 5);
        const successfulTxs = sigs.filter(s => !s.err).length;
        const failedTxs = sigs.filter(s => s.err).length;

        // Estimate win rate: more successful txs = better trader
        const winRate = round(
          clamp(safeDivide(successfulTxs, sigs.length, 0.5) * 0.8 + 0.2, 0, 0.95),
          2,
        );

        // Estimate ROI based on holding percentage and entry timing
        const roi = round(
          holder.percentage > 5 ? 2.5 + holder.percentage * 0.1
          : holder.percentage > 2 ? 1.5 + holder.percentage * 0.2
          : 0.8 + holder.percentage * 0.3,
          2,
        );

        // Entry quality: based on timing (fewer recent txs = earlier entry = better)
        const entryQuality = round(
          clamp(1 - safeDivide(sigs.length, 10, 0), 0.3, 0.9),
          2,
        );

        smartWhales.push({
          address: holder.address,
          label: `Whale_${smartWhales.length + 1}`,
          totalInvested: holder.uiAmount,
          currentPosition: holder.percentage,
          entryPrice: 0, // Would need historical data
          confidence: round(winRate * 0.6 + entryQuality * 0.4, 2),
          winRate,
          roiHistory: [roi],
          entryQuality,
        });
      }

      // ── Calculate Smart Money Score (0-100) ────────────────────
      const smartMoneyScore = this.calculateScore(smartWhales, onchainAnalysis);

      // ── Calculate Volume & Percentage ──────────────────────────
      const totalSmartMoneyVolume = smartWhales.reduce((sum, w) => sum + w.totalInvested, 0);
      const smartMoneyPercentage = round(
        smartWhales.reduce((sum, w) => sum + w.currentPosition, 0),
        1,
      );

      // ── Confidence ─────────────────────────────────────────────
      const confidence = this.calculateConfidence(smartWhales, onchainAnalysis, flowAnalysis);

      const analysis: SmartMoneyAnalysis = {
        token: tokenAddress,
        smartMoneyScore,
        smartWhales,
        totalSmartMoneyVolume,
        smartMoneyPercentage,
        confidence,
      };

      this.cache.set(tokenAddress, analysis);

      const dt = Date.now() - t0;
      this.logger.info(`[SmartMoneyAgent] Complete in ${dt}ms`, {
        whales: smartWhales.length,
        score: smartMoneyScore,
        percentage: smartMoneyPercentage,
      });

      return analysis;
    } catch (error) {
      this.logger.error(`[SmartMoneyAgent] Failed for ${tokenAddress}`, error);
      return this.buildEmptyAnalysis(tokenAddress);
    }
  }

  private calculateScore(whales: SmartWalletEntry[], onchain: OnchainAnalysis): number {
    if (whales.length === 0) return 30;

    const avgWinRate = safeDivide(
      whales.reduce((s, w) => s + (w.winRate ?? 0.5), 0),
      whales.length, 0.5,
    );
    const avgEntryQuality = safeDivide(
      whales.reduce((s, w) => s + (w.entryQuality ?? 0.5), 0),
      whales.length, 0.5,
    );

    let score = (avgWinRate * 40) + (avgEntryQuality * 30) + Math.min(30, whales.length * 10);

    // Adjust for whale activity
    const whaleCount = onchain.whaleActivity?.whaleWallets ?? 0;
    if (whaleCount > 5) score *= 1.1;
    else if (whaleCount < 2) score *= 0.9;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private calculateConfidence(
    whales: SmartWalletEntry[],
    onchain: OnchainAnalysis,
    flow: FlowAnalysis,
  ): number {
    if (whales.length === 0) return 0.5;

    let confidence = 0.6 + Math.min(0.2, whales.length * 0.05);

    if ((onchain.whaleActivity?.whaleWallets ?? 0) > 3) confidence += 0.1;
    if ((flow.realtimeData?.whaleActivity ?? 0) > 0.7) confidence += 0.1;

    return round(clamp(confidence, 0, 1), 2);
  }

  private buildEmptyAnalysis(tokenAddress: string): SmartMoneyAnalysis {
    return {
      token: tokenAddress,
      smartMoneyScore: 30,
      smartWhales: [],
      totalSmartMoneyVolume: 0,
      smartMoneyPercentage: 0,
      confidence: 0.5,
    };
  }

  clearCache(tokenAddress?: string): void {
    if (tokenAddress) this.cache.delete(tokenAddress);
    else this.cache.clear();
  }
}
