/**
 * @file opportunityAgent.ts
 * @layer agent
 * @desc Opportunity Agent (Phase 2) - Early Opportunity Index using flow/onchain/market signals.
 *       Calculates EOI score (0-100) with entry/exit strategy recommendations.
 *       No Inversify DI - plain class accepting AgentLogger.
 *       Depends on Phase 1 outputs: FlowAnalysis, OnchainAnalysis, MarketAnalysis.
 *
 * @exposes OpportunityAgent
 */

import type { EarlyOpportunityAnalysis, OpportunityFactors, FlowAnalysis, OnchainAnalysis, MarketAnalysis } from '../types/analysisTypes';
import { safeNumber, safeDivide, clamp, round, SimpleCache, type AgentLogger, consoleLogger } from './agentUtils';

export class OpportunityAgent {
  private logger: AgentLogger;
  private cache: SimpleCache<EarlyOpportunityAnalysis>;

  constructor(logger?: AgentLogger) {
    this.logger = logger ?? consoleLogger;
    this.cache = new SimpleCache(300_000); // 5 min cache
  }

  /**
   * Analyze early opportunity potential.
   * Requires Phase 1: flowAnalysis, onchainAnalysis, marketAnalysis.
   */
  async analyzeToken(
    tokenAddress: string,
    flowAnalysis: FlowAnalysis,
    onchainAnalysis: OnchainAnalysis,
    marketAnalysis: MarketAnalysis,
  ): Promise<EarlyOpportunityAnalysis> {
    const cached = this.cache.get(tokenAddress);
    if (cached) return cached;

    const t0 = Date.now();
    this.logger.info(`[OpportunityAgent] Analyzing ${tokenAddress.slice(0, 8)}...`);

    try {
      // Calculate EOI score (0-100)
      const factors = this.calculateFactors(flowAnalysis, onchainAnalysis, marketAnalysis);
      const riskAdjustment = this.calculateRiskAdjustment(onchainAnalysis, marketAnalysis);
      const rawScore = (
        (factors.volumeVelocity ?? 0) * 0.25 +
        (factors.freshWalletGrowth ?? 0) * 0.20 +
        (factors.whaleEntry ?? 0) * 0.20 +
        (factors.liquidityGrowth ?? 0) * 0.15 +
        (factors.buyPressure ?? 0) * 0.10 +
        (factors.marketMomentum ?? 0) * 0.10
      );
      const eoiScore = Math.round(clamp(rawScore * (1 - riskAdjustment) * 100, 0, 100));

      // Rating
      const rating = this.getRating(eoiScore);

      // Entry/Exit strategy
      const entryStrategy = this.buildEntryStrategy(eoiScore, marketAnalysis);
      const exitStrategy = this.buildExitStrategy(eoiScore, marketAnalysis);
      const riskRewardRatio = this.calcRiskReward(marketAnalysis, onchainAnalysis);

      // Predicted potential
      const predictedPotential = {
        shortTerm: round(clamp(eoiScore * 0.004 + (marketAnalysis.priceTrend?.change24h ?? 0) * 2, 0, 100), 1),
        midTerm: round(clamp(eoiScore * 0.006 + (onchainAnalysis.holderGrowth?.growthRate ?? 0) * 50, 0, 100), 1),
        longTerm: round(clamp(eoiScore * 0.003 + (1 - (onchainAnalysis.rugPullIndicators?.overallRugScore ?? 0.5)) * 30, 0, 100), 1),
      };

      // Validation metrics
      const liquidityDepth = onchainAnalysis.liquidityAnalysis?.liquidityDepth ?? 0;
      const concentration = onchainAnalysis.whaleActivity?.concentration ?? 0;
      const rugScore = onchainAnalysis.rugPullIndicators?.overallRugScore ?? 0.5;
      const isVerified = onchainAnalysis.contractAnalysis?.isVerified ?? false;

      const validationMetrics = {
        liquidityCheck: liquidityDepth > 10_000,
        holderDistribution: concentration > 0.5 ? 'risky' as const : concentration > 0.3 ? 'concentrated' as const : 'healthy' as const,
        contractSafety: rugScore < 0.3 ? 'safe' as const : isVerified ? 'verified' as const : 'unknown' as const,
        socialVolume: marketAnalysis.volumeAnalysis?.volume24h ?? 0,
      };

      // Evidence
      const evidence = this.generateEvidence(factors, flowAnalysis, onchainAnalysis, marketAnalysis);

      // Confidence
      const confidence = this.calculateConfidence(flowAnalysis, onchainAnalysis, marketAnalysis);

      const analysis: EarlyOpportunityAnalysis = {
        token: tokenAddress,
        eoiScore,
        rating,
        factors,
        entryStrategy,
        exitStrategy,
        riskRewardRatio,
        predictedPotential,
        validationMetrics,
        evidence,
        confidence,
        opportunityScore: eoiScore,
      };

      this.cache.set(tokenAddress, analysis);

      const dt = Date.now() - t0;
      this.logger.info(`[OpportunityAgent] Complete in ${dt}ms`, { eoiScore, rating, confidence });

      return analysis;
    } catch (error) {
      this.logger.error(`[OpportunityAgent] Failed for ${tokenAddress}`, error);
      return this.buildEmptyAnalysis(tokenAddress);
    }
  }

  private calculateFactors(
    flow: FlowAnalysis,
    onchain: OnchainAnalysis,
    market: MarketAnalysis,
  ): OpportunityFactors {
    // Volume velocity
    const volGrowth = flow.realtimeData?.volumeGrowth ?? 0;
    const volChange = market.volumeAnalysis?.volumeChange ?? 0;
    const suspiciousVol = market.volumeAnalysis?.suspiciousVolume ?? 0;
    let volumeVelocity = 0;
    if (volGrowth > 5) volumeVelocity += 0.4;
    else if (volGrowth > 3) volumeVelocity += 0.3;
    else if (volGrowth > 2) volumeVelocity += 0.2;
    else if (volGrowth > 1) volumeVelocity += 0.1;
    if (volChange > 3) volumeVelocity += 0.3;
    else if (volChange > 2) volumeVelocity += 0.2;
    else if (volChange > 1) volumeVelocity += 0.1;
    if (suspiciousVol > 0.7) volumeVelocity *= 0.5;
    volumeVelocity = clamp(volumeVelocity, 0, 1);

    // Fresh wallet growth
    const newHolders = onchain.holderGrowth?.newHolders ?? 0;
    const growthRate = onchain.holderGrowth?.growthRate ?? 0;
    let freshWalletGrowth = 0;
    if (newHolders > 500) freshWalletGrowth += 0.4;
    else if (newHolders > 200) freshWalletGrowth += 0.3;
    else if (newHolders > 100) freshWalletGrowth += 0.2;
    else if (newHolders > 50) freshWalletGrowth += 0.1;
    if (growthRate > 0.5) freshWalletGrowth += 0.3;
    else if (growthRate > 0.3) freshWalletGrowth += 0.2;
    else if (growthRate > 0.1) freshWalletGrowth += 0.1;
    freshWalletGrowth = clamp(freshWalletGrowth, 0, 1);

    // Whale entry
    const whaleActivity = flow.realtimeData?.whaleActivity ?? 0;
    const whaleWallets = onchain.whaleActivity?.whaleWallets ?? 0;
    const concentration = onchain.whaleActivity?.concentration ?? 0;
    let whaleEntry = 0;
    if (whaleActivity > 0.9) whaleEntry += 0.3;
    else if (whaleActivity > 0.7) whaleEntry += 0.2;
    else if (whaleActivity > 0.5) whaleEntry += 0.1;
    if (whaleWallets > 5) whaleEntry += 0.3;
    else if (whaleWallets > 3) whaleEntry += 0.2;
    else if (whaleWallets > 1) whaleEntry += 0.1;
    if (concentration > 0.3 && concentration < 0.7) whaleEntry += 0.2;
    else if (concentration >= 0.7) whaleEntry *= 0.5;
    whaleEntry = clamp(whaleEntry, 0, 1);

    // Liquidity growth
    const liqDepth = onchain.liquidityAnalysis?.liquidityDepth ?? 0;
    const liqChange = onchain.liquidityAnalysis?.liquidityChange24h ?? 0;
    const marketLiq = market.liquidityAnalysis?.depth ?? 0;
    let liquidityGrowth = 0;
    if (liqDepth > 5_000_000) liquidityGrowth += 0.3;
    else if (liqDepth > 2_000_000) liquidityGrowth += 0.2;
    else if (liqDepth > 1_000_000) liquidityGrowth += 0.1;
    if (liqChange > 0.1) liquidityGrowth += 0.3;
    else if (liqChange > 0.05) liquidityGrowth += 0.2;
    else if (liqChange > 0) liquidityGrowth += 0.1;
    if (marketLiq > 5_000_000) liquidityGrowth += 0.2;
    else if (marketLiq > 2_000_000) liquidityGrowth += 0.1;
    liquidityGrowth = clamp(liquidityGrowth, 0, 1);

    // Buy pressure
    const buyP = flow.realtimeData?.buyPressure ?? 1;
    const sellP = flow.realtimeData?.sellPressure ?? 1;
    const ratio = safeDivide(buyP, sellP, 1);
    const buyPressure = ratio > 5 ? 1.0 : ratio > 3 ? 0.8 : ratio > 2 ? 0.6 : ratio > 1.5 ? 0.4 : ratio > 1 ? 0.2 : 0.1;

    // Market momentum
    const change24h = market.priceTrend?.change24h ?? 0;
    const change7d = market.priceTrend?.change7d ?? 0;
    const volatility = market.volatilityScore ?? 0;
    let marketMomentum = 0;
    if (change24h > 0.3) marketMomentum += 0.3;
    else if (change24h > 0.2) marketMomentum += 0.2;
    else if (change24h > 0.1) marketMomentum += 0.1;
    if (change7d > 0.5) marketMomentum += 0.3;
    else if (change7d > 0.3) marketMomentum += 0.2;
    else if (change7d > 0.1) marketMomentum += 0.1;
    if (volatility > 0.5 && volatility < 0.8) marketMomentum += 0.2;
    else if (volatility >= 0.8) marketMomentum *= 0.7;
    marketMomentum = clamp(marketMomentum, 0, 1);

    // Technical score (avg of on-chain metrics)
    const technicalScore = round((freshWalletGrowth + whaleEntry) / 2, 2);
    // Market score (avg of market metrics)
    const marketScore = round((volumeVelocity + liquidityGrowth + marketMomentum) / 3, 2);
    // Community score (buy pressure + holder growth)
    const communityScore = round((buyPressure + freshWalletGrowth) / 2, 2);
    // Risk score (inverted rug score)
    const riskScore = round(1 - (onchain.rugPullIndicators?.overallRugScore ?? 0.5), 2);
    // Momentum score
    const momentumScore = round((marketMomentum + buyPressure) / 2, 2);
    // Overall
    const overallScore = round((technicalScore * 0.25 + marketScore * 0.25 + communityScore * 0.2 + riskScore * 0.15 + momentumScore * 0.15), 2);

    return {
      volumeVelocity: round(volumeVelocity, 2),
      freshWalletGrowth: round(freshWalletGrowth, 2),
      whaleEntry: round(whaleEntry, 2),
      liquidityGrowth: round(liquidityGrowth, 2),
      buyPressure: round(buyPressure, 2),
      marketMomentum: round(marketMomentum, 2),
      technicalScore,
      marketScore,
      communityScore,
      riskScore,
      momentumScore,
      overallScore,
    };
  }

  private calculateRiskAdjustment(onchain: OnchainAnalysis, market: MarketAnalysis): number {
    const rugScore = onchain.rugPullIndicators?.overallRugScore ?? 0.5;
    const riskScore = onchain.riskScore ?? 0.5;
    const suspiciousVol = market.volumeAnalysis?.suspiciousVolume ?? 0;
    let adjustment = rugScore * 0.4 + riskScore * 0.3;
    if (suspiciousVol > 0.7) adjustment += 0.2;
    else if (suspiciousVol > 0.5) adjustment += 0.1;
    return clamp(adjustment, 0, 1);
  }

  private getRating(score: number): 'EXTREME OPPORTUNITY' | 'HIGH OPPORTUNITY' | 'MODERATE OPPORTUNITY' | 'LOW OPPORTUNITY' | 'AVOID' {
    if (score >= 90) return 'EXTREME OPPORTUNITY';
    if (score >= 75) return 'HIGH OPPORTUNITY';
    if (score >= 50) return 'MODERATE OPPORTUNITY';
    if (score >= 25) return 'LOW OPPORTUNITY';
    return 'AVOID';
  }

  private buildEntryStrategy(
    eoiScore: number,
    market: MarketAnalysis,
  ): EarlyOpportunityAnalysis['entryStrategy'] {
    const currentPrice = market.priceTrend?.current ?? 0;
    const change24h = market.priceTrend?.change24h ?? 0;
    const volatility = market.volatilityScore ?? 0.5;

    const suggestedEntryPrice = currentPrice > 0
      ? round(currentPrice * (1 - (volatility * 0.5)), 8)
      : 0;

    const entryConfidence = round(clamp(eoiScore / 100, 0, 1), 2);
    const entryTiming = change24h < -0.05
      ? 'immediate - price dip detected'
      : change24h > 0.1
        ? 'wait for pullback'
        : 'good entry window';

    return { suggestedEntryPrice, entryConfidence, entryTiming };
  }

  private buildExitStrategy(
    eoiScore: number,
    market: MarketAnalysis,
  ): EarlyOpportunityAnalysis['exitStrategy'] {
    const currentPrice = market.priceTrend?.current ?? 0;
    const volatility = market.volatilityScore ?? 0.5;

    const tp1 = currentPrice > 0 ? round(currentPrice * 1.5, 8) : 0;
    const tp2 = currentPrice > 0 ? round(currentPrice * 2.0, 8) : 0;
    const tp3 = currentPrice > 0 ? round(currentPrice * 3.0, 8) : 0;
    const stopLoss = currentPrice > 0 ? round(currentPrice * (1 - (0.1 + volatility * 0.15)), 8) : 0;

    return {
      suggestedExitPrice: tp2,
      takeProfitLevels: [
        { level: tp1, weight: 0.5 },
        { level: tp2, weight: 0.3 },
        { level: tp3, weight: 0.2 },
      ],
      stopLoss,
    };
  }

  private calcRiskReward(market: MarketAnalysis, onchain: OnchainAnalysis): number {
    const rugScore = onchain.rugPullIndicators?.overallRugScore ?? 0.5;
    const volatility = market.volatilityScore ?? 0.5;
    // Higher rug score = lower RR ratio
    const upside = 1.5;
    const downside = 0.1 + rugScore * 0.3 + volatility * 0.2;
    return round(clamp(upside / Math.max(downside, 0.01), 0, 20), 2);
  }

  private generateEvidence(
    factors: OpportunityFactors,
    flow: FlowAnalysis,
    onchain: OnchainAnalysis,
    market: MarketAnalysis,
  ): string[] {
    const evidence: string[] = [];

    if ((factors.volumeVelocity ?? 0) > 0.7) {
      evidence.push(`High volume velocity: ${Math.round((factors.volumeVelocity ?? 0) * 100)}% growth potential`);
    }
    if ((factors.freshWalletGrowth ?? 0) > 0.7) {
      evidence.push(`Strong new wallet growth: ${onchain.holderGrowth?.newHolders ?? 0} new holders`);
    }
    if ((factors.whaleEntry ?? 0) > 0.7) {
      evidence.push(`Significant whale entry: ${onchain.whaleActivity?.whaleWallets ?? 0} whales`);
    }
    if ((factors.liquidityGrowth ?? 0) > 0.7) {
      evidence.push(`Strong liquidity growth: $${Math.round((onchain.liquidityAnalysis?.liquidityDepth ?? 0) / 1000)}K depth`);
    }
    if ((factors.buyPressure ?? 0) > 0.7) {
      evidence.push(`Extreme buy pressure: ${Math.round((flow.realtimeData?.buyPressure ?? 0) / Math.max(flow.realtimeData?.sellPressure ?? 1, 1))}x sell pressure`);
    }
    if ((factors.marketMomentum ?? 0) > 0.7) {
      evidence.push(`Strong market momentum: ${Math.round((market.priceTrend?.change24h ?? 0) * 100)}% 24h gain`);
    }

    // Add flow patterns
    for (const pattern of flow.patterns ?? []) {
      if ((pattern.strength ?? 0) > 0.5) {
        evidence.push(`${pattern.type} pattern detected (confidence: ${Math.round((pattern.strength ?? 0) * 100)}%)`);
      }
    }

    return evidence;
  }

  private calculateConfidence(
    flow: FlowAnalysis,
    onchain: OnchainAnalysis,
    market: MarketAnalysis,
  ): number {
    const avgConfidence = (
      (flow.confidence ?? 0) * 0.4 +
      (1 - (onchain.riskScore ?? 0.5)) * 0.3 +
      (1 - (market.volatilityScore ?? 0.5)) * 0.2 +
      (market.sentimentAnalysis?.sentimentScore ?? 0.5) * 0.1
    );
    return round(clamp(avgConfidence, 0, 1), 2);
  }

  private buildEmptyAnalysis(tokenAddress: string): EarlyOpportunityAnalysis {
    return {
      token: tokenAddress,
      eoiScore: 0,
      rating: 'LOW OPPORTUNITY',
      factors: {
        volumeVelocity: 0, freshWalletGrowth: 0, whaleEntry: 0, liquidityGrowth: 0,
        buyPressure: 0, marketMomentum: 0, technicalScore: 0, marketScore: 0,
        communityScore: 0, riskScore: 0.5, momentumScore: 0, overallScore: 0,
      },
      evidence: ['Insufficient data for opportunity analysis'],
      confidence: 0.3,
      opportunityScore: 0,
    };
  }

  clearCache(tokenAddress?: string): void {
    if (tokenAddress) this.cache.delete(tokenAddress);
    else this.cache.clear();
  }
}