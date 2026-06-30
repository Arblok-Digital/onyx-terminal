/**
 * Survival Agent for Onyx Terminal
 * Predicts the survival probability and estimated lifespan of newborn tokens
 */

import { SurvivalAnalysis, OnchainAnalysis, MarketAnalysis, FlowAnalysis } from '../types/analysisTypes';

export class SurvivalAgent {
    private cache: Map<string, { data: SurvivalAnalysis, timestamp: number }>;
    private cacheTTL: number = 3600000; // 1 hour

    constructor() {
        this.cache = new Map();
    }

    /**
     * Analyze token survival probability
     */
    async analyzeToken(
        tokenAddress: string,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis,
        flowAnalysis: FlowAnalysis
    ): Promise<SurvivalAnalysis> {
        // Check cache first
        const cachedData = this.getCachedData(tokenAddress);
        if (cachedData) {
            return cachedData;
        }

        // Calculate survival factors
        const factors = this.calculateSurvivalFactors(onchainAnalysis, marketAnalysis, flowAnalysis);
        const survivalProbability = this.calculateSurvivalProbability(factors);
        const estimatedLifespan = this.estimateLifespan(survivalProbability, factors);

        const analysis: SurvivalAnalysis = {
            token: tokenAddress,
            survivalProbability,
            estimatedLifespan,
            factors,
            confidence: this.calculateConfidence(factors, onchainAnalysis, marketAnalysis, flowAnalysis)
        };

        // Cache the result
        this.cacheData(tokenAddress, analysis);

        return analysis;
    }

    /**
     * Calculate survival factors
     */
    private calculateSurvivalFactors(
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis,
        flowAnalysis: FlowAnalysis
    ): SurvivalAnalysis['factors'] {
        return {
            liquidityRetention: this.calculateLiquidityRetention(onchainAnalysis, marketAnalysis),
            holderGrowth: this.calculateHolderGrowth(onchainAnalysis),
            buySellRatio: this.calculateBuySellRatio(flowAnalysis),
            whaleBehavior: this.calculateWhaleBehavior(onchainAnalysis),
            developerActivity: this.calculateDeveloperActivity(onchainAnalysis)
        };
    }

    /**
     * Calculate liquidity retention score (0-1)
     */
    private calculateLiquidityRetention(
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis
    ): number {
        const liquidityDepth = onchainAnalysis.liquidityAnalysis.liquidityDepth;
        const liquidityChange = onchainAnalysis.liquidityAnalysis.liquidityChange24h;
        const marketLiquidity = marketAnalysis.liquidityAnalysis.depth;

        let score = 0;

        // Higher liquidity depth = better retention
        if (liquidityDepth > 5000000) score += 0.4; // > $5M
        else if (liquidityDepth > 2000000) score += 0.3; // > $2M
        else if (liquidityDepth > 1000000) score += 0.2; // > $1M
        else if (liquidityDepth > 500000) score += 0.1; // > $500K

        // Positive liquidity change = better retention
        if (liquidityChange > 0.1) score += 0.3;
        else if (liquidityChange > 0) score += 0.2;
        else if (liquidityChange > -0.1) score += 0.1;
        else score -= 0.2; // Negative change reduces score

        // Market liquidity
        if (marketLiquidity > 5000000) score += 0.2;
        else if (marketLiquidity > 2000000) score += 0.1;

        return Math.min(1, Math.max(0, score));
    }

    /**
     * Calculate holder growth score (0-1)
     */
    private calculateHolderGrowth(onchainAnalysis: OnchainAnalysis): number {
        const newHolders = onchainAnalysis.holderGrowth.newHolders;
        const growthRate = onchainAnalysis.holderGrowth.growthRate;

        let score = 0;

        // New holder growth
        if (newHolders > 1000) score += 0.4;
        else if (newHolders > 500) score += 0.3;
        else if (newHolders > 200) score += 0.2;
        else if (newHolders > 100) score += 0.1;

        // Growth rate
        if (growthRate > 0.3) score += 0.3;
        else if (growthRate > 0.2) score += 0.2;
        else if (growthRate > 0.1) score += 0.1;

        return Math.min(1, Math.max(0, score));
    }

    /**
     * Calculate buy/sell ratio score (0-1)
     */
    private calculateBuySellRatio(flowAnalysis: FlowAnalysis): number {
        const buyPressure = flowAnalysis.realtimeData?.buyPressure || 1;
        const sellPressure = flowAnalysis.realtimeData?.sellPressure || 1;

        // Buy/sell ratio
        const ratio = buyPressure / sellPressure;

        if (ratio > 3) return 1.0;
        if (ratio > 2) return 0.8;
        if (ratio > 1.5) return 0.6;
        if (ratio > 1) return 0.4;
        return 0.2;
    }

    /**
     * Calculate whale behavior score (0-1)
     */
    private calculateWhaleBehavior(onchainAnalysis: OnchainAnalysis): number {
        const concentration = onchainAnalysis.whaleActivity.concentration;
        const whaleWallets = onchainAnalysis.whaleActivity.whaleWallets;

        let score = 0;

        // Moderate concentration is best for survival
        if (concentration > 0.3 && concentration < 0.7) score += 0.4;
        else if (concentration >= 0.7) score += 0.1; // Too concentrated
        else score += 0.2; // Too decentralized

        // Number of whales
        if (whaleWallets > 5) score += 0.3;
        else if (whaleWallets > 3) score += 0.2;
        else if (whaleWallets > 1) score += 0.1;

        return Math.min(1, Math.max(0, score));
    }

    /**
     * Calculate developer activity score (0-1)
     */
    private calculateDeveloperActivity(onchainAnalysis: OnchainAnalysis): number {
        const devTransactions = onchainAnalysis.developerActivity.devWalletTransactions;
        const suspiciousTransfers = onchainAnalysis.developerActivity.suspiciousTransfers;

        let score = 0;

        // Developer activity
        if (devTransactions > 20) score += 0.4;
        else if (devTransactions > 10) score += 0.3;
        else if (devTransactions > 5) score += 0.2;

        // Suspicious transfers reduce score
        if (suspiciousTransfers > 5) score -= 0.3;
        else if (suspiciousTransfers > 2) score -= 0.2;

        return Math.min(1, Math.max(0, score));
    }

    /**
     * Calculate overall survival probability (0-1)
     */
    private calculateSurvivalProbability(factors: SurvivalAnalysis['factors']): number {
        // Weighted average of survival factors
        const weightedScore =
            factors.liquidityRetention * 0.3 +
            factors.holderGrowth * 0.25 +
            factors.buySellRatio * 0.2 +
            factors.whaleBehavior * 0.15 +
            factors.developerActivity * 0.1;

        // Adjust based on rug pull risk
        const rugPullAdjustment = this.calculateRugPullAdjustment(factors);

        // Final survival probability
        const survivalProbability = weightedScore * (1 - rugPullAdjustment);

        return parseFloat(Math.min(1, Math.max(0, survivalProbability)).toFixed(2));
    }

    /**
     * Calculate rug pull adjustment factor (0-1)
     */
    private calculateRugPullAdjustment(factors: SurvivalAnalysis['factors']): number {
        // Higher developer activity with low suspicious transfers = lower rug pull risk
        const devActivity = factors.developerActivity;
        const devRisk = devActivity > 0.5 ? 0.1 : 0.3;

        // Lower liquidity retention = higher rug pull risk
        const liquidityRisk = 1 - factors.liquidityRetention;

        // Overall rug pull adjustment
        return (devRisk * 0.4 + liquidityRisk * 0.6) * 0.5;
    }

    /**
     * Estimate token lifespan based on survival probability
     */
    private estimateLifespan(
        survivalProbability: number,
        factors: SurvivalAnalysis['factors']
    ): string {
        // Base lifespan on survival probability
        if (survivalProbability > 0.8) {
            return factors.liquidityRetention > 0.7 ? "1+ months" : "1-4 weeks";
        }
        if (survivalProbability > 0.6) {
            return "3-7 days";
        }
        if (survivalProbability > 0.4) {
            return "1-3 days";
        }
        return "less than 24 hours";
    }

    /**
     * Calculate confidence in survival analysis
     */
    private calculateConfidence(
        factors: SurvivalAnalysis['factors'],
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis,
        flowAnalysis: FlowAnalysis
    ): number {
        // Base confidence on data availability
        let confidence = 0.7;

        // Adjust based on liquidity data
        if (onchainAnalysis.liquidityAnalysis.liquidityDepth > 0) confidence += 0.1;

        // Adjust based on holder data
        if (onchainAnalysis.holderGrowth.newHolders > 0) confidence += 0.1;

        // Adjust based on flow data
        if (flowAnalysis.realtimeData?.buyPressure) confidence += 0.05;

        // Adjust based on market data
        if (marketAnalysis.priceTrend.change24h !== undefined) confidence += 0.05;

        return parseFloat(Math.min(1, confidence).toFixed(2));
    }

    // Cache Management
    private getCachedData(tokenAddress: string): SurvivalAnalysis | null {
        const cached = this.cache.get(tokenAddress);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        return null;
    }

    private cacheData(tokenAddress: string, data: SurvivalAnalysis): void {
        this.cache.set(tokenAddress, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache for a specific token
     */
    clearCache(tokenAddress: string): void {
        this.cache.delete(tokenAddress);
    }

    /**
     * Clear all cached data
     */
    clearAllCache(): void {
        this.cache.clear();
    }
}