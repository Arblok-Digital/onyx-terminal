/**
 * Smart Money Agent for Onyx Terminal
 * Analyzes the quality of whale activity and identifies smart money
 */
import { injectable, inject } from 'inversify';
import type { SmartMoneyAnalysis, OnchainAnalysis, FlowAnalysis } from '../types/analysisTypes';
import type { Logger } from '../core/logger';
import { TOKENS } from '../core/diTokens';

@injectable()
export class SmartMoneyAgent {
    private cache: Map<string, { data: SmartMoneyAnalysis, timestamp: number }>;
    private cacheTTL: number = 300000; // 5 minutes
    private smartWhaleDatabase: Map<string, { winRate: number, roiHistory: number, lastActive: number }>;
    private logger: Logger;

    constructor(@inject(TOKENS.Logger) logger: Logger) {
        this.cache = new Map();
        this.smartWhaleDatabase = new Map();
        this.logger = logger;
        this.initializeSmartWhaleDatabase();
    }

    /**
     * Initialize with some known smart whales (mock data)
     */
    private initializeSmartWhaleDatabase(): void {
        // In production, this would be populated from a real database
        const knownSmartWhales = [
            { address: '0xsmartwhale1...', winRate: 0.85, roiHistory: 4.2, lastActive: Date.now() - 86400000 },
            { address: '0xsmartwhale2...', winRate: 0.78, roiHistory: 3.8, lastActive: Date.now() - 43200000 },
            { address: '0xsmartwhale3...', winRate: 0.92, roiHistory: 5.1, lastActive: Date.now() - 172800000 },
            { address: '0xsmartwhale4...', winRate: 0.65, roiHistory: 2.5, lastActive: Date.now() - 345600000 },
            { address: '0xsmartwhale5...', winRate: 0.88, roiHistory: 4.5, lastActive: Date.now() - 7200000 }
        ];

        knownSmartWhales.forEach(whale => {
            this.smartWhaleDatabase.set(whale.address, {
                winRate: whale.winRate,
                roiHistory: whale.roiHistory,
                lastActive: whale.lastActive
            });
        });
    }

    /**
     * Analyze smart money activity for a token
     */
    async analyzeToken(
        tokenAddress: string,
        onchainAnalysis: OnchainAnalysis,
        flowAnalysis: FlowAnalysis
    ): Promise<SmartMoneyAnalysis> {
        // Check cache first
        const cachedData = this.getCachedData(tokenAddress);
        if (cachedData) {
            return cachedData;
        }

        // Analyze smart money
        const smartWhales = this.identifySmartWhales(onchainAnalysis);
        const smartMoneyScore = this.calculateSmartMoneyScore(smartWhales, onchainAnalysis);
        const totalSmartMoneyVolume = this.calculateSmartMoneyVolume(smartWhales, onchainAnalysis);
        const smartMoneyPercentage = this.calculateSmartMoneyPercentage(smartWhales, onchainAnalysis);

        const analysis: SmartMoneyAnalysis = {
            token: tokenAddress,
            smartMoneyScore,
            smartWhales,
            totalSmartMoneyVolume,
            smartMoneyPercentage,
            confidence: this.calculateConfidence(smartWhales, onchainAnalysis, flowAnalysis)
        };

        // Cache the result
        this.cacheData(tokenAddress, analysis);

        return analysis;
    }

    /**
     * Identify smart whales from on-chain data
     */
    private identifySmartWhales(onchainAnalysis: OnchainAnalysis): SmartMoneyAnalysis['smartWhales'] {
        const smartWhales: SmartMoneyAnalysis['smartWhales'] = [];

        // Check developer wallets first
        onchainAnalysis.developerActivity.devWallets.forEach(wallet => {
            if (this.smartWhaleDatabase.has(wallet)) {
                const whaleData = this.smartWhaleDatabase.get(wallet)!;
                smartWhales.push({
                    address: wallet,
                    winRate: whaleData.winRate,
                    roiHistory: whaleData.roiHistory,
                    entryQuality: this.calculateEntryQuality(wallet, onchainAnalysis)
                });
            }
        });

        // Check whale wallets
        const whaleAddresses = this.extractWhaleAddresses(onchainAnalysis);
        whaleAddresses.forEach(address => {
            if (this.smartWhaleDatabase.has(address)) {
                const whaleData = this.smartWhaleDatabase.get(address)!;
                smartWhales.push({
                    address,
                    winRate: whaleData.winRate,
                    roiHistory: whaleData.roiHistory,
                    entryQuality: this.calculateEntryQuality(address, onchainAnalysis)
                });
            } else {
                // New whale - estimate smart money potential from on-chain data
                const concentration = onchainAnalysis.whaleActivity.concentration;
                const riskScore = onchainAnalysis.riskScore;
                const liquidityDepth = onchainAnalysis.liquidityAnalysis.liquidityDepth;

                // Higher concentration + lower risk = higher win rate estimate
                const estimatedWinRate = Math.min(0.85, Math.max(0.4,
                    0.5 + (concentration * 0.2) - (riskScore * 0.2)
                ));
                // Better liquidity = higher ROI potential
                const estimatedRoi = liquidityDepth > 100000
                    ? 2.5 + (concentration * 2)
                    : 1.0 + (concentration * 1.5);

                smartWhales.push({
                    address,
                    winRate: parseFloat(estimatedWinRate.toFixed(2)),
                    roiHistory: parseFloat(estimatedRoi.toFixed(2)),
                    entryQuality: this.calculateEntryQuality(address, onchainAnalysis)
                });
            }
        });

        return smartWhales;
    }

    /**
     * Extract whale addresses from on-chain analysis
     */
    private extractWhaleAddresses(onchainAnalysis: OnchainAnalysis): string[] {
        const whales: string[] = [];

        // Use real dev wallets from on-chain data
        onchainAnalysis.developerActivity.devWallets.forEach(wallet => {
            // Check if wallet looks like a valid Solana address
            if (wallet && wallet.length >= 32 && !whales.includes(wallet)) {
                whales.push(wallet);
            }
        });

        // Generate deterministic whale identifiers from on-chain metrics
        if (onchainAnalysis.whaleActivity.whaleWallets > 0) {
            const concentration = onchainAnalysis.whaleActivity.concentration;
            const numWhales = Math.min(5, onchainAnalysis.whaleActivity.whaleWallets);

            for (let i = 0; i < numWhales; i++) {
                // Create deterministic identifier from token + index
                const tokenHash = onchainAnalysis.token.slice(0, 8);
                const whaleId = `whale_${tokenHash}_${i + 1}`;
                if (!whales.includes(whaleId)) {
                    whales.push(whaleId);
                }
            }
        }

        return whales;
    }

    /**
     * Calculate smart money score (0-100)
     */
    private calculateSmartMoneyScore(
        smartWhales: SmartMoneyAnalysis['smartWhales'],
        onchainAnalysis: OnchainAnalysis
    ): number {
        if (smartWhales.length === 0) return 30; // Default score for no smart money

        // Calculate average win rate
        const avgWinRate = smartWhales.reduce((sum, whale) => sum + whale.winRate, 0) / smartWhales.length;

        // Calculate average ROI
        const avgRoi = smartWhales.reduce((sum, whale) => sum + whale.roiHistory, 0) / smartWhales.length;

        // Calculate average entry quality
        const avgEntryQuality = smartWhales.reduce((sum, whale) => sum + whale.entryQuality, 0) / smartWhales.length;

        // Base score from smart whale metrics
        let score = (avgWinRate * 40) + (avgRoi * 10) + (avgEntryQuality * 30);

        // Adjust for number of smart whales
        const whaleCountFactor = Math.min(1, smartWhales.length / 3);
        score *= whaleCountFactor;

        // Adjust for overall whale activity
        const whaleActivity = onchainAnalysis.whaleActivity.whaleWallets;
        if (whaleActivity > 5) score *= 1.1;
        else if (whaleActivity < 2) score *= 0.9;

        // Ensure score is between 0-100
        return Math.min(100, Math.max(0, Math.round(score)));
    }

    /**
     * Calculate total smart money volume
     */
    private calculateSmartMoneyVolume(
        smartWhales: SmartMoneyAnalysis['smartWhales'],
        onchainAnalysis: OnchainAnalysis
    ): number {
        if (smartWhales.length === 0) return 0;

        // In production, this would be calculated from actual transaction data
        // For now, we'll estimate based on whale activity

        const baseVolume = onchainAnalysis.liquidityAnalysis.liquidityDepth * 0.1;
        const smartMoneyFactor = smartWhales.length * 0.2;

        return Math.round(baseVolume * smartMoneyFactor);
    }

    /**
     * Calculate percentage of total volume from smart money
     */
    private calculateSmartMoneyPercentage(
        smartWhales: SmartMoneyAnalysis['smartWhales'],
        onchainAnalysis: OnchainAnalysis
    ): number {
        if (smartWhales.length === 0) return 0;

        // Estimate smart money percentage
        const smartMoneyFactor = Math.min(1, smartWhales.length * 0.15);
        return parseFloat((smartMoneyFactor * 100).toFixed(1));
    }

    /**
     * Calculate entry quality for a whale (0-1)
     */
    private calculateEntryQuality(address: string, onchainAnalysis: OnchainAnalysis): number {
        // In production, this would analyze the timing and quality of the whale's entry
        // For now, we'll use a mock calculation

        // Check if this is a known smart whale
        if (this.smartWhaleDatabase.has(address)) {
            const whaleData = this.smartWhaleDatabase.get(address)!;

            // Higher win rate = better entry quality
            if (whaleData.winRate > 0.8) return 0.9;
            if (whaleData.winRate > 0.7) return 0.8;
            if (whaleData.winRate > 0.6) return 0.7;
        }

        // Default entry quality based on whale concentration
        const concentration = onchainAnalysis.whaleActivity.concentration;
        if (concentration > 0.7) return 0.6; // Too concentrated
        if (concentration > 0.5) return 0.8; // Good concentration
        return 0.7; // Default
    }

    /**
     * Calculate overall confidence in smart money analysis
     */
    private calculateConfidence(
        smartWhales: SmartMoneyAnalysis['smartWhales'],
        onchainAnalysis: OnchainAnalysis,
        flowAnalysis: FlowAnalysis
    ): number {
        if (smartWhales.length === 0) return 0.5;

        // Base confidence on number of known smart whales
        const knownWhales = smartWhales.filter(whale =>
            this.smartWhaleDatabase.has(whale.address)
        ).length;

        let confidence = 0.6 + (knownWhales * 0.1);

        // Adjust based on whale activity
        if (onchainAnalysis.whaleActivity.whaleWallets > 3) confidence += 0.1;

        // Adjust based on flow analysis
        if (flowAnalysis.realtimeData?.whaleActivity && flowAnalysis.realtimeData.whaleActivity > 0.7) {
            confidence += 0.1;
        }

        return parseFloat(Math.min(1, confidence).toFixed(2));
    }

    // Cache Management
    private getCachedData(tokenAddress: string): SmartMoneyAnalysis | null {
        const cached = this.cache.get(tokenAddress);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        return null;
    }

    private cacheData(tokenAddress: string, data: SmartMoneyAnalysis): void {
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

    /**
     * Update smart whale database with new performance data
     */
    updateSmartWhaleDatabase(address: string, winRate: number, roiHistory: number): void {
        this.smartWhaleDatabase.set(address, {
            winRate,
            roiHistory,
            lastActive: Date.now()
        });
    }
}