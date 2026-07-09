/**
 * @file survivalAgent.ts
 * @layer agent
 * @desc Survival Agent (Phase 2) - Predicts token lifespan and survival probability.
 *       Uses liquidity health, holder retention, market resilience, and risk metrics.
 *       No Inversify DI - plain class accepting AgentLogger.
 *       Depends on Phase 1 outputs: OnchainAnalysis, MarketAnalysis, FlowAnalysis.
 *
 * @exposes SurvivalAgent
 */

import type { SurvivalAnalysis, SurvivalFactors, OnchainAnalysis, MarketAnalysis, FlowAnalysis } from '../types/analysisTypes';
import { safeNumber, safeDivide, clamp, round, SimpleCache, type AgentLogger, consoleLogger } from './agentUtils';

export class SurvivalAgent {
  private logger: AgentLogger;
  private cache: SimpleCache<SurvivalAnalysis>;

  constructor(logger?: AgentLogger) {
    this.logger = logger ?? consoleLogger;
    this.cache = new SimpleCache(3_600_000); // 1 hour cache
  }

  /**
   * Analyze token survival probability.
   * Requires Phase 1: onchainAnalysis, marketAnalysis, flowAnalysis.
   */
  async analyzeToken(
    tokenAddress: string,
    onchainAnalysis: OnchainAnalysis,
    marketAnalysis: MarketAnalysis,
    flowAnalysis: FlowAnalysis,
  ): Promise<SurvivalAnalysis> {
    const cached = this.cache.get(tokenAddress);
    if (cached) return cached;

    const t0 = Date.now();
    this.logger.info(`[SurvivalAgent] Analyzing ${tokenAddress.slice(0, 8)}...`);

    try {
      // Calculate survival factors
      const factors = this.calculateFactors(onchainAnalysis, marketAnalysis, flowAnalysis);
      const survivalProbability = this.calcSurvivalProbability(factors, onchainAnalysis);
      const estimatedLifespan = this.estimateLifespan(survivalProbability, factors);

      // V3 structured fields
      const liquidityHealth = this.buildLiquidityHealth(onchainAnalysis, marketAnalysis);
      const holderRetention = this.buildHolderRetention(onchainAnalysis, flowAnalysis);
      const marketResilience = this.buildMarketResilience(marketAnalysis);
      const riskMetrics = this.buildRiskMetrics(onchainAnalysis);
      const sustainabilityIndicators = this.buildSustainabilityIndicators(onchainAnalysis, marketAnalysis);
      const timelineForecast = this.buildTimelineForecast(survivalProbability, factors, marketAnalysis);

      // Confidence
      const confidence = this.calculateConfidence(onchainAnalysis, marketAnalysis, flowAnalysis);

      // Survival score (0-100)
      const survivalScore = Math.round(survivalProbability * 100);

      const analysis: SurvivalAnalysis = {
        token: tokenAddress,
        survivalScore,
        survivalProbability: round(survivalProbability, 4),
        estimatedLifespan,
        liquidityHealth,
        holderRetention,
        marketResilience,
        riskMetrics,
        sustainabilityIndicators,
        timelineForecast,
        factors,
        confidence,
      };

      this.cache.set(tokenAddress, analysis);

      const dt = Date.now() - t0;
      this.logger.info(`[SurvivalAgent] Complete in ${dt}ms`, {
        survivalProbability: round(survivalProbability, 2),
        lifespan: estimatedLifespan,
        confidence,
      });

      return analysis;
    } catch (error) {
      this.logger.error(`[SurvivalAgent] Failed for ${tokenAddress}`, error);
      return this.buildEmptyAnalysis(tokenAddress);
    }
  }

  private calculateFactors(
    onchain: OnchainAnalysis,
    market: MarketAnalysis,
    flow: FlowAnalysis,
  ): SurvivalFactors {
    // Liquidity retention
    const liqDepth = onchain.liquidityAnalysis?.liquidityDepth ?? 0;
    const liqChange = onchain.liquidityAnalysis?.liquidityChange24h ?? 0;
    const marketLiq = market.liquidityAnalysis?.depth ?? 0;
    let liquidityRetention = 0;
    if (liqDepth > 5_000_000) liquidityRetention += 0.4;
    else if (liqDepth > 2_000_000) liquidityRetention += 0.3;
    else if (liqDepth > 1_000_000) liquidityRetention += 0.2;
    else if (liqDepth > 500_000) liquidityRetention += 0.1;
    if (liqChange > 0.1) liquidityRetention += 0.3;
    else if (liqChange > 0) liquidityRetention += 0.2;
    else if (liqChange > -0.1) liquidityRetention += 0.1;
    else liquidityRetention -= 0.2;
    if (marketLiq > 5_000_000) liquidityRetention += 0.2;
    else if (marketLiq > 2_000_000) liquidityRetention += 0.1;
    liquidityRetention = clamp(liquidityRetention, 0, 1);

    // Holder growth
    const newHolders = onchain.holderGrowth?.newHolders ?? 0;
    const growthRate = onchain.holderGrowth?.growthRate ?? 0;
    let holderGrowth = 0;
    if (newHolders > 1000) holderGrowth += 0.4;
    else if (newHolders > 500) holderGrowth += 0.3;
    else if (newHolders > 200) holderGrowth += 0.2;
    else if (newHolders > 100) holderGrowth += 0.1;
    if (growthRate > 0.3) holderGrowth += 0.3;
    else if (growthRate > 0.2) holderGrowth += 0.2;
    else if (growthRate > 0.1) holderGrowth += 0.1;
    holderGrowth = clamp(holderGrowth, 0, 1);

    // Buy/sell ratio
    const buyP = flow.realtimeData?.buyPressure ?? 1;
    const sellP = flow.realtimeData?.sellPressure ?? 1;
    const ratio = safeDivide(buyP, sellP, 1);
    const buySellRatio = ratio > 3 ? 1.0 : ratio > 2 ? 0.8 : ratio > 1.5 ? 0.6 : ratio > 1 ? 0.4 : 0.2;

    // Whale behavior
    const concentration = onchain.whaleActivity?.concentration ?? 0;
    const whaleWallets = onchain.whaleActivity?.whaleWallets ?? 0;
    let whaleBehavior = 0;
    if (concentration > 0.3 && concentration < 0.7) whaleBehavior += 0.4;
    else if (concentration >= 0.7) whaleBehavior += 0.1;
    else whaleBehavior += 0.2;
    if (whaleWallets > 5) whaleBehavior += 0.3;
    else if (whaleWallets > 3) whaleBehavior += 0.2;
    else if (whaleWallets > 1) whaleBehavior += 0.1;
    whaleBehavior = clamp(whaleBehavior, 0, 1);

    // Developer activity
    const devTxs = onchain.developerActivity?.devWalletTransactions ?? 0;
    const suspiciousTxs = onchain.developerActivity?.suspiciousTransfers ?? 0;
    let developerActivity = 0;
    if (devTxs > 20) developerActivity += 0.4;
    else if (devTxs > 10) developerActivity += 0.3;
    else if (devTxs > 5) developerActivity += 0.2;
    if (suspiciousTxs > 5) developerActivity -= 0.3;
    else if (suspiciousTxs > 2) developerActivity -= 0.2;
    developerActivity = clamp(developerActivity, 0, 1);

    // Factor scores for V3
    const liquidityFactor = round(liquidityRetention, 2);
    const holderFactor = round(holderGrowth, 2);
    const marketFactor = round(buySellRatio, 2);
    const riskFactor = round(1 - (onchain.rugPullIndicators?.overallRugScore ?? 0.5), 2);
    const sustainabilityFactor = round((liquidityRetention + holderGrowth + buySellRatio) / 3, 2);

    return {
      liquidityRetention: round(liquidityRetention, 2),
      holderGrowth: round(holderGrowth, 2),
      buySellRatio: round(buySellRatio, 2),
      whaleBehavior: round(whaleBehavior, 2),
      developerActivity: round(developerActivity, 2),
      liquidityFactor,
      holderFactor,
      marketFactor,
      riskFactor,
      sustainabilityFactor,
    };
  }

  private calcSurvivalProbability(factors: SurvivalFactors, onchain: OnchainAnalysis): number {
    const weightedScore =
      (factors.liquidityRetention ?? 0) * 0.3 +
      (factors.holderGrowth ?? 0) * 0.25 +
      (factors.buySellRatio ?? 0) * 0.2 +
      (factors.whaleBehavior ?? 0) * 0.15 +
      (factors.developerActivity ?? 0) * 0.1;

    // Rug pull adjustment
    const rugScore = onchain.rugPullIndicators?.overallRugScore ?? 0.5;
    const rugPullAdjustment = ((1 - (factors.developerActivity ?? 0.5)) * 0.4 + (1 - (factors.liquidityRetention ?? 0.5)) * 0.6) * 0.5;

    return clamp(weightedScore * (1 - rugPullAdjustment), 0, 1);
  }

  private estimateLifespan(probability: number, factors: SurvivalFactors): string {
    if (probability > 0.8) {
      return (factors.liquidityRetention ?? 0) > 0.7 ? '1+ months' : '1-4 weeks';
    }
    if (probability > 0.6) return '3-7 days';
    if (probability > 0.4) return '1-3 days';
    if (probability > 0.2) return 'less than 24 hours';
    return 'hours (highly speculative)';
  }

  private buildLiquidityHealth(
    onchain: OnchainAnalysis,
    market: MarketAnalysis,
  ): SurvivalAnalysis['liquidityHealth'] {
    const depth = onchain.liquidityAnalysis?.liquidityDepth ?? market.liquidityAnalysis?.depth ?? 0;
    const volatility = market.volatilityScore ?? 0.5;
    const ratio = onchain.liquidityAnalysis?.liquidityConcentration ?? 0;
    const sustainability = depth > 5_000_000 ? 'high' as const
      : depth > 1_000_000 ? 'medium' as const
      : depth > 100_000 ? 'low' as const
      : 'critical' as const;
    return { ratio, depth, volatility, sustainability };
  }

  private buildHolderRetention(
    onchain: OnchainAnalysis,
    flow: FlowAnalysis,
  ): SurvivalAnalysis['holderRetention'] {
    const newHolders = onchain.holderGrowth?.newHolders ?? 0;
    const totalHolders = onchain.holderGrowth?.growthRate ?? 0 > 0
      ? Math.round((onchain.holderGrowth?.newHolders ?? 0) / Math.max(onchain.holderGrowth?.growthRate ?? 0.01, 0.01))
      : 0;
    const retentionRate = totalHolders > 0
      ? round(clamp(1 - (newHolders / Math.max(totalHolders, 1)), 0, 1), 2)
      : 0.5;
    return {
      retentionRate,
      averageHoldingPeriod: 0, // Would need historical data
      churnRate: round(1 - retentionRate, 2),
    };
  }

  private buildMarketResilience(market: MarketAnalysis): SurvivalAnalysis['marketResilience'] {
    const volatility = market.volatilityScore ?? 0.5;
    const change24h = Math.abs(market.priceTrend?.change24h ?? 0);
    return {
      priceStability: round(1 - volatility, 2),
      recoveryRate: round(clamp(1 - change24h, 0, 1), 2),
      crashResistance: round(1 - clamp(volatility * 1.5, 0, 1), 2),
    };
  }

  private buildRiskMetrics(onchain: OnchainAnalysis): SurvivalAnalysis['riskMetrics'] {
    const rugScore = onchain.rugPullIndicators?.overallRugScore ?? 0.5;
    const concentration = onchain.whaleActivity?.concentration ?? 0;
    const hasMint = onchain.contractAnalysis?.mintAuthority ?? false;
    const hasFreeze = onchain.contractAnalysis?.freezeAuthority ?? false;

    const overallRisk = rugScore > 0.7 ? 'critical' as const
      : rugScore > 0.5 ? 'high' as const
      : rugScore > 0.3 ? 'medium' as const
      : 'low' as const;

    return {
      impermanentLossRisk: round(clamp(concentration * 0.5 + (hasMint ? 0.2 : 0), 0, 1), 2),
      liquidationRisk: round(clamp(rugScore * 0.6 + (hasFreeze ? 0.2 : 0), 0, 1), 2),
      regulatoryRisk: 0.3, // Generic - would need real data
      overallRisk,
    };
  }

  private buildSustainabilityIndicators(
    onchain: OnchainAnalysis,
    market: MarketAnalysis,
  ): SurvivalAnalysis['sustainabilityIndicators'] {
    return {
      revenueModel: 'unknown', // Would need project details
      tokenEmissionRate: onchain.contractAnalysis?.age ?? 0 > 0
        ? round((onchain.holderGrowth?.newHolders ?? 0) / Math.max(onchain.contractAnalysis?.age ?? 1, 1), 2)
        : 0,
      stakingParticipation: 0, // Would need staking data
      treasuryHealth: onchain.liquidityAnalysis?.lockedLiquidity ?? 0 > 0 ? 0.7 : 0.3,
    };
  }

  private buildTimelineForecast(
    survivalProbability: number,
    factors: SurvivalFactors,
    market: MarketAnalysis,
  ): SurvivalAnalysis['timelineForecast'] {
    const momentum = market.priceTrend?.change24h ?? 0;
    const sentiment = market.sentimentAnalysis?.sentimentScore ?? 0.5;

    const shortTerm = momentum > 0.05 ? 'bullish' as const
      : momentum < -0.05 ? 'bearish' as const
      : 'neutral' as const;

    const midTerm = survivalProbability > 0.6 ? 'bullish' as const
      : survivalProbability > 0.4 ? 'neutral' as const
      : 'bearish' as const;

    const longTerm = survivalProbability > 0.7 ? 'bullish' as const
      : survivalProbability > 0.5 ? 'neutral' as const
      : 'bearish' as const;

    const confidence = round(clamp(
      (survivalProbability * 0.4 + sentiment * 0.3 + (factors.liquidityRetention ?? 0.5) * 0.3),
      0, 1,
    ), 2);

    return { shortTerm, midTerm, longTerm, confidence };
  }

  private calculateConfidence(
    onchain: OnchainAnalysis,
    market: MarketAnalysis,
    flow: FlowAnalysis,
  ): number {
    let confidence = 0.7;
    if ((onchain.liquidityAnalysis?.liquidityDepth ?? 0) > 0) confidence += 0.1;
    if ((onchain.holderGrowth?.newHolders ?? 0) > 0) confidence += 0.1;
    if (flow.realtimeData?.buyPressure) confidence += 0.05;
    if (market.priceTrend?.change24h !== undefined) confidence += 0.05;
    return round(clamp(confidence, 0, 1), 2);
  }

  private buildEmptyAnalysis(tokenAddress: string): SurvivalAnalysis {
    return {
      token: tokenAddress,
      survivalScore: 0,
      survivalProbability: 0,
      estimatedLifespan: 'unknown',
      factors: {
        liquidityRetention: 0, holderGrowth: 0, buySellRatio: 0.5,
        whaleBehavior: 0, developerActivity: 0,
        liquidityFactor: 0, holderFactor: 0, marketFactor: 0.5,
        riskFactor: 0.5, sustainabilityFactor: 0,
      },
      confidence: 0.3,
    };
  }

  clearCache(tokenAddress?: string): void {
    if (tokenAddress) this.cache.delete(tokenAddress);
    else this.cache.clear();
  }
}