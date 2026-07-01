/**
 * Opportunity Agent for Onyx Terminal
 * Analyzes early opportunity potential in newborn tokens
 */

import { EarlyOpportunityAnalysis, FlowAnalysis, OnchainAnalysis, MarketAnalysis } from '../types/analysisTypes';

export class OpportunityAgent {
    private cache: Map<string, { data: EarlyOpportunityAnalysis, timestamp: number }>;
    private cacheTTL: number = 300000; // 5 minutes

    constructor() {
        this.cache = new Map();
    }

    /**
     * Analyze early opportunity potential for a token
     */
    async analyzeToken(
        tokenAddress: string,
        flowAnalysis: FlowAnalysis,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis
    ): Promise<EarlyOpportunityAnalysis> {
        // Check cache first
        const cachedData = this.getCachedData(tokenAddress);
        if (cachedData) {
            return cachedData;
        }

        // Calculate Early Opportunity Index
        const eoiScore = this.calculateEOIScore(flowAnalysis, onchainAnalysis, marketAnalysis);
        const rating = this.getEoiRating(eoiScore);
        const factors = this.calculateEOIFactors(flowAnalysis, onchainAnalysis, marketAnalysis);
        const evidence = this.generateEvidence(flowAnalysis, onchainAnalysis, marketAnalysis, factors);

        const analysis: EarlyOpportunityAnalysis = {
            token: tokenAddress,
            eoiScore,
            rating,
            factors,
            evidence,
            confidence: this.calculateConfidence(flowAnalysis, onchainAnalysis, marketAnalysis)
        };

        // Cache the result
        this.cacheData(tokenAddress, analysis);

        return analysis;
    }

    /**
     * Calculate Early Opportunity Index score (0-100)
     */
    private calculateEOIScore(
        flowAnalysis: FlowAnalysis,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis
    ): number {
        // Calculate individual factor scores
        const volumeVelocity = this.calculateVolumeVelocity(flowAnalysis, marketAnalysis);
        const freshWalletGrowth = this.calculateFreshWalletGrowth(onchainAnalysis);
        const whaleEntry = this.calculateWhaleEntry(flowAnalysis, onchainAnalysis);
        const liquidityGrowth = this.calculateLiquidityGrowth(onchainAnalysis, marketAnalysis);
        const buyPressure = this.calculateBuyPressure(flowAnalysis);
        const marketMomentum = this.calculateMarketMomentum(marketAnalysis);

        // Calculate opportunity factors (weighted)
        const opportunityFactors =
            volumeVelocity * 0.25 +
            freshWalletGrowth * 0.20 +
            whaleEntry * 0.20 +
            liquidityGrowth * 0.15 +
            buyPressure * 0.10 +
            marketMomentum * 0.10;

        // Adjust for risk factors
        const riskAdjustment = this.calculateRiskAdjustment(onchainAnalysis, marketAnalysis);
        const adjustedScore = opportunityFactors * (1 - riskAdjustment);

        // Ensure score is between 0-100
        return Math.min(100, Math.max(0, Math.round(adjustedScore * 100)));
    }

    /**
     * Calculate individual EOI factors
     */
    private calculateEOIFactors(
        flowAnalysis: FlowAnalysis,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis
    ): EarlyOpportunityAnalysis['factors'] {
        return {
            volumeVelocity: this.calculateVolumeVelocity(flowAnalysis, marketAnalysis),
            freshWalletGrowth: this.calculateFreshWalletGrowth(onchainAnalysis),
            whaleEntry: this.calculateWhaleEntry(flowAnalysis, onchainAnalysis),
            liquidityGrowth: this.calculateLiquidityGrowth(onchainAnalysis, marketAnalysis),
            buyPressure: this.calculateBuyPressure(flowAnalysis),
            marketMomentum: this.calculateMarketMomentum(marketAnalysis)
        };
    }

    /**
     * Calculate volume velocity score (0-1)
     */
    private calculateVolumeVelocity(flowAnalysis: FlowAnalysis, marketAnalysis: MarketAnalysis): number {
        // Volume growth from flow analysis
        const volumeGrowth = flowAnalysis.realtimeData?.volumeGrowth || 0;

        // Volume change from market analysis
        const volumeChange = marketAnalysis.volumeAnalysis.volumeChange;

        // Combine factors (normalized)
        let score = 0;

        // High volume growth is good
        if (volumeGrowth > 5) score += 0.4;
        else if (volumeGrowth > 3) score += 0.3;
        else if (volumeGrowth > 2) score += 0.2;
        else if (volumeGrowth > 1) score += 0.1;

        // Positive volume change is good
        if (volumeChange > 3) score += 0.3;
        else if (volumeChange > 2) score += 0.2;
        else if (volumeChange > 1) score += 0.1;

        // Suspicious volume reduces score
        if (marketAnalysis.volumeAnalysis.suspiciousVolume && marketAnalysis.volumeAnalysis.suspiciousVolume > 0.7) {
            score *= 0.5;
        }

        return Math.min(1, score);
    }

    /**
     * Calculate fresh wallet growth score (0-1)
     */
    private calculateFreshWalletGrowth(onchainAnalysis: OnchainAnalysis): number {
        const newHolders = onchainAnalysis.holderGrowth.newHolders;
        const growthRate = onchainAnalysis.holderGrowth.growthRate;

        let score = 0;

        // New holder growth
        if (newHolders > 500) score += 0.4;
        else if (newHolders > 200) score += 0.3;
        else if (newHolders > 100) score += 0.2;
        else if (newHolders > 50) score += 0.1;

        // Growth rate
        if (growthRate > 0.5) score += 0.3;
        else if (growthRate > 0.3) score += 0.2;
        else if (growthRate > 0.1) score += 0.1;

        return Math.min(1, score);
    }

    /**
     * Calculate whale entry score (0-1)
     */
    private calculateWhaleEntry(flowAnalysis: FlowAnalysis, onchainAnalysis: OnchainAnalysis): number {
        const whaleActivity = flowAnalysis.realtimeData?.whaleActivity || 0;
        const whaleWallets = onchainAnalysis.whaleActivity.whaleWallets;
        const concentration = onchainAnalysis.whaleActivity.concentration;

        let score = 0;

        // Whale activity from flow
        if (whaleActivity > 0.9) score += 0.3;
        else if (whaleActivity > 0.7) score += 0.2;
        else if (whaleActivity > 0.5) score += 0.1;

        // Whale wallets
        if (whaleWallets > 5) score += 0.3;
        else if (whaleWallets > 3) score += 0.2;
        else if (whaleWallets > 1) score += 0.1;

        // Concentration - moderate concentration is good, too high is bad
        if (concentration > 0.3 && concentration < 0.7) score += 0.2;
        else if (concentration >= 0.7) score *= 0.5; // Too concentrated

        return Math.min(1, score);
    }

    /**
     * Calculate liquidity growth score (0-1)
     */
    private calculateLiquidityGrowth(onchainAnalysis: OnchainAnalysis, marketAnalysis: MarketAnalysis): number {
        const liquidityDepth = onchainAnalysis.liquidityAnalysis.liquidityDepth;
        const liquidityChange = onchainAnalysis.liquidityAnalysis.liquidityChange24h;
        const marketLiquidity = marketAnalysis.liquidityAnalysis.depth;

        let score = 0;

        // Liquidity depth
        if (liquidityDepth > 5000000) score += 0.3; // > $5M
        else if (liquidityDepth > 2000000) score += 0.2; // > $2M
        else if (liquidityDepth > 1000000) score += 0.1; // > $1M

        // Positive liquidity change is good
        if (liquidityChange > 0.1) score += 0.3;
        else if (liquidityChange > 0.05) score += 0.2;
        else if (liquidityChange > 0) score += 0.1;

        // Market liquidity
        if (marketLiquidity > 5000000) score += 0.2;
        else if (marketLiquidity > 2000000) score += 0.1;

        return Math.min(1, score);
    }

    /**
     * Calculate buy pressure score (0-1)
     */
    private calculateBuyPressure(flowAnalysis: FlowAnalysis): number {
        const buyPressure = flowAnalysis.realtimeData?.buyPressure || 1;
        const sellPressure = flowAnalysis.realtimeData?.sellPressure || 1;

        // Buy/sell ratio
        const ratio = buyPressure / sellPressure;

        if (ratio > 5) return 1.0;
        if (ratio > 3) return 0.8;
        if (ratio > 2) return 0.6;
        if (ratio > 1.5) return 0.4;
        if (ratio > 1) return 0.2;
        return 0.1;
    }

    /**
     * Calculate market momentum score (0-1)
     */
    private calculateMarketMomentum(marketAnalysis: MarketAnalysis): number {
        const priceChange24h = marketAnalysis.priceTrend.change24h;
        const priceChange7d = marketAnalysis.priceTrend.change7d;
        const volatility = marketAnalysis.volatilityScore;

        let score = 0;

        // Positive price change
        if (priceChange24h > 0.3) score += 0.3;
        else if (priceChange24h > 0.2) score += 0.2;
        else if (priceChange24h > 0.1) score += 0.1;

        // 7-day trend
        if (priceChange7d > 0.5) score += 0.3;
        else if (priceChange7d > 0.3) score += 0.2;
        else if (priceChange7d > 0.1) score += 0.1;

        // Moderate volatility is good
        if (volatility > 0.5 && volatility < 0.8) score += 0.2;
        else if (volatility >= 0.8) score *= 0.7; // Too volatile

        return Math.min(1, score);
    }

    /**
     * Calculate risk adjustment factor (0-1)
     */
    private calculateRiskAdjustment(onchainAnalysis: OnchainAnalysis, marketAnalysis: MarketAnalysis): number {
        const rugScore = onchainAnalysis.rugPullIndicators.overallRugScore;
        const riskScore = onchainAnalysis.riskScore;
        const suspiciousVolume = marketAnalysis.volumeAnalysis.suspiciousVolume || 0;

        // Base risk adjustment
        let adjustment = rugScore * 0.4 + riskScore * 0.3;

        // Adjust for suspicious volume
        if (suspiciousVolume > 0.7) adjustment += 0.2;
        else if (suspiciousVolume > 0.5) adjustment += 0.1;

        return Math.min(1, adjustment);
    }

    /**
     * Get EOI rating based on score
     */
    private getEoiRating(score: number): EarlyOpportunityAnalysis['rating'] {
        if (score >= 90) return 'EXTREME OPPORTUNITY';
        if (score >= 75) return 'HIGH OPPORTUNITY';
        if (score >= 50) return 'MODERATE OPPORTUNITY';
        return 'LOW OPPORTUNITY';
    }

    /**
     * Generate evidence for the opportunity analysis
     */
    private generateEvidence(
        flowAnalysis: FlowAnalysis,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis,
        factors: EarlyOpportunityAnalysis['factors']
    ): string[] {
        const evidence: string[] = [];

        // Volume velocity
        if (factors.volumeVelocity > 0.7) {
            evidence.push(`High volume velocity detected: ${Math.round(factors.volumeVelocity * 100)}% growth potential`);
        } else if (factors.volumeVelocity > 0.5) {
            evidence.push(`Moderate volume velocity: ${Math.round(factors.volumeVelocity * 100)}% growth potential`);
        }

        // Fresh wallet growth
        if (factors.freshWalletGrowth > 0.7) {
            evidence.push(`Strong new wallet growth: ${onchainAnalysis.holderGrowth.newHolders} new holders (${Math.round(onchainAnalysis.holderGrowth.growthRate * 100)}% growth)`);
        } else if (factors.freshWalletGrowth > 0.5) {
            evidence.push(`Moderate new wallet growth: ${onchainAnalysis.holderGrowth.newHolders} new holders`);
        }

        // Whale entry
        if (factors.whaleEntry > 0.7) {
            evidence.push(`Significant whale entry detected: ${onchainAnalysis.whaleActivity.whaleWallets} whales controlling ${Math.round(onchainAnalysis.whaleActivity.concentration * 100)}% supply`);
        } else if (factors.whaleEntry > 0.5) {
            evidence.push(`Whale activity detected: ${onchainAnalysis.whaleActivity.whaleWallets} whales`);
        }

        // Liquidity growth
        if (factors.liquidityGrowth > 0.7) {
            evidence.push(`Strong liquidity growth: $${Math.round(onchainAnalysis.liquidityAnalysis.liquidityDepth / 1000000)}M depth (${Math.round(onchainAnalysis.liquidityAnalysis.liquidityChange24h * 100)}% change)`);
        } else if (factors.liquidityGrowth > 0.5) {
            evidence.push(`Moderate liquidity growth: $${Math.round(onchainAnalysis.liquidityAnalysis.liquidityDepth / 1000000)}M depth`);
        }

        // Buy pressure
        if (factors.buyPressure > 0.7) {
            evidence.push(`Extreme buy pressure: ${Math.round(flowAnalysis.realtimeData?.buyPressure || 0)}x sell pressure`);
        } else if (factors.buyPressure > 0.5) {
            evidence.push(`Strong buy pressure: ${Math.round(flowAnalysis.realtimeData?.buyPressure || 0)}x sell pressure`);
        }

        // Market momentum
        if (factors.marketMomentum > 0.7) {
            evidence.push(`Strong market momentum: ${Math.round(marketAnalysis.priceTrend.change24h * 100)}% 24h gain`);
        } else if (factors.marketMomentum > 0.5) {
            evidence.push(`Positive market momentum: ${Math.round(marketAnalysis.priceTrend.change24h * 100)}% 24h gain`);
        }

        // Add flow patterns
        flowAnalysis.patterns.forEach(pattern => {
            if (pattern.strength > 0.7) {
                evidence.push(`Strong ${pattern.type} pattern detected (confidence: ${Math.round(pattern.strength * 100)}%)`);
            } else if (pattern.strength > 0.5) {
                evidence.push(`${pattern.type} pattern detected (confidence: ${Math.round(pattern.strength * 100)}%)`);
            }
        });

        return evidence;
    }

    /**
     * Calculate overall confidence score
     */
    private calculateConfidence(
        flowAnalysis: FlowAnalysis,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis
    ): number {
        // Average confidence from all sources
        const avgConfidence = (
            flowAnalysis.confidence * 0.4 +
            (1 - onchainAnalysis.riskScore) * 0.3 +
            (1 - marketAnalysis.volatilityScore) * 0.2 +
            (marketAnalysis.sentimentAnalysis?.sentimentScore || 0) * 0.1
        );

        return parseFloat(avgConfidence.toFixed(2));
    }

    // Cache Management
    private getCachedData(tokenAddress: string): EarlyOpportunityAnalysis | null {
        const cached = this.cache.get(tokenAddress);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        return null;
    }

    private cacheData(tokenAddress: string, data: EarlyOpportunityAnalysis): void {
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