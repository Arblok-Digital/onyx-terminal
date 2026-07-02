/**
 * Narrative Agent for Onyx Terminal
 * Detects the underlying narrative driving token attention
 */
import { injectable, inject } from 'inversify';
import type { NarrativeAnalysis, OnchainAnalysis, MarketAnalysis } from '../types/analysisTypes';
import type { Logger } from '../core/logger';
import { TOKENS } from '../core/diTokens';

@injectable()
export class NarrativeAgent {
    private cache: Map<string, { data: NarrativeAnalysis, timestamp: number }>;
    private cacheTTL: number = 3600000; // 1 hour
    private narrativePatterns: Record<string, { keywords: string[], relatedTokens: string[] }> = {};
    private logger: Logger;

    constructor(@inject(TOKENS.Logger) logger: Logger) {
        this.cache = new Map();
        this.logger = logger;
        this.initializeNarrativePatterns();
    }

    /**
     * Initialize narrative detection patterns
     */
    private initializeNarrativePatterns(): void {
        this.narrativePatterns = {
            'AI Infrastructure': {
                keywords: [
                    'ai', 'artificial intelligence', 'machine learning', 'neural', 'gpu',
                    'compute', 'inference', 'training', 'llm', 'model', 'data center'
                ],
                relatedTokens: ['FET', 'AGIX', 'OCEAN', 'RNDR', 'AKT']
            },
            'DePIN': {
                keywords: [
                    'depin', 'decentralized physical', 'infrastructure', 'network',
                    'hardware', 'iot', 'mesh', 'wireless', 'storage', 'bandwidth'
                ],
                relatedTokens: ['HNT', 'IOT', 'MOBILE', 'AR', 'NKN']
            },
            'RWA': {
                keywords: [
                    'rwa', 'real world asset', 'tokenized', 'treasury', 'bond',
                    'commodity', 'gold', 'real estate', 'yield', 'finance'
                ],
                relatedTokens: ['ONDO', 'GFI', 'MKR', 'FRAX', 'USDC']
            },
            'Gaming': {
                keywords: [
                    'game', 'gaming', 'play', 'nft', 'metaverse', 'virtual',
                    'world', 'character', 'asset', 'reward', 'esports'
                ],
                relatedTokens: ['GALA', 'MANA', 'SAND', 'IMX', 'ILV']
            },
            'SocialFi': {
                keywords: [
                    'social', 'socialfi', 'creator', 'content', 'community',
                    'engagement', 'reward', 'tipping', 'fan', 'platform'
                ],
                relatedTokens: ['FAN', 'STARS', 'YGG', 'LENS', 'RALLY']
            },
            'Meme': {
                keywords: [
                    'meme', 'dog', 'cat', 'funny', 'viral', 'community',
                    'joke', 'haha', 'lol', 'fun', 'trend'
                ],
                relatedTokens: ['DOGE', 'SHIB', 'PEPE', 'BONK', 'WIF']
            },
            'DeFi': {
                keywords: [
                    'defi', 'decentralized finance', 'dex', 'swap', 'yield',
                    'farming', 'liquidity', 'staking', 'lending', 'borrowing'
                ],
                relatedTokens: ['UNI', 'AAVE', 'COMP', 'CRV', 'SUSHI']
            },
            'NFT': {
                keywords: [
                    'nft', 'non fungible', 'digital art', 'collectible', 'pfp',
                    'profile picture', 'blue chip', 'generative', '10k', 'avatar'
                ],
                relatedTokens: ['BAYC', 'MAYC', 'AZUKI', 'CLONE', 'DEGODS']
            }
        };
    }

    /**
     * Analyze token narrative
     */
    async analyzeToken(
        tokenAddress: string,
        tokenSymbol: string,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis
    ): Promise<NarrativeAnalysis> {
        // Check cache first
        const cachedData = this.getCachedData(tokenAddress);
        if (cachedData) {
            return cachedData;
        }

        // Detect narrative
        const narrative = this.detectNarrative(tokenSymbol, onchainAnalysis);
        const confidence = this.calculateConfidence(narrative, tokenSymbol);
        const evidence = this.generateEvidence(narrative, tokenSymbol);
        const narrativeStrength = this.calculateNarrativeStrength(narrative, tokenSymbol, marketAnalysis);

        const analysis: NarrativeAnalysis = {
            token: tokenAddress,
            narrative: narrative || 'Unknown',
            confidence,
            evidence,
            narrativeStrength,
            relatedTokens: this.narrativePatterns[narrative]?.relatedTokens || []
        };

        // Cache the result
        this.cacheData(tokenAddress, analysis);

        return analysis;
    }

    /**
     * Detect the most likely narrative for a token
     */
    private detectNarrative(tokenSymbol: string, onchainAnalysis: OnchainAnalysis): string {
        // First, check for explicit narrative indicators in contract
        const contractCreator = onchainAnalysis.contractAnalysis?.creator?.toLowerCase() || '';

        // Check if creator is associated with known projects
        if (contractCreator.includes('ai') || contractCreator.includes('artificial')) {
            return 'AI Infrastructure';
        }
        if (contractCreator.includes('depin') || contractCreator.includes('infrastructure')) {
            return 'DePIN';
        }
        if (contractCreator.includes('game') || contractCreator.includes('gaming')) {
            return 'Gaming';
        }

        // Check token symbol for narrative indicators
        const symbolLower = tokenSymbol.toLowerCase();

        for (const [narrative, pattern] of Object.entries(this.narrativePatterns)) {
            for (const keyword of pattern.keywords) {
                if (symbolLower.includes(keyword)) {
                    return narrative;
                }
            }
        }

        // If no clear narrative from symbol, use default based on market behavior
        return this.detectNarrativeFromBehavior(onchainAnalysis);
    }

    /**
     * Detect narrative from on-chain behavior
     */
    private detectNarrativeFromBehavior(onchainAnalysis: OnchainAnalysis): string {
        // High holder growth + low concentration = likely community-driven (Meme, SocialFi)
        if (onchainAnalysis.holderGrowth.newHolders > 500 &&
            onchainAnalysis.whaleActivity.concentration < 0.3) {
            return 'Meme';
        }

        // High liquidity + low volatility = likely RWA or DeFi
        if (onchainAnalysis.liquidityAnalysis.liquidityDepth > 5000000 &&
            onchainAnalysis.contractAnalysis?.isVerified) {
            return 'RWA';
        }

        // Default to DeFi for most tokens
        return 'DeFi';
    }

    /**
     * Calculate confidence in narrative detection
     */
    private calculateConfidence(narrative: string, tokenSymbol: string): number {
        if (narrative === 'Unknown') return 0.3;

        // Higher confidence for meme coins with meme-related symbols
        if (narrative === 'Meme') {
            const symbolLower = tokenSymbol.toLowerCase();
            if (['dog', 'cat', 'wif', 'bonk', 'pepe'].some(word => symbolLower.includes(word))) {
                return 0.9;
            }
        }

        // Higher confidence for tokens with clear narrative keywords
        const symbolLower = tokenSymbol.toLowerCase();
        const pattern = this.narrativePatterns[narrative];

        if (pattern) {
            for (const keyword of pattern.keywords) {
                if (symbolLower.includes(keyword)) {
                    return 0.85;
                }
            }
        }

        // Default confidence
        return 0.7;
    }

    /**
     * Generate evidence for narrative detection
     */
    private generateEvidence(narrative: string, tokenSymbol: string): string[] {
        const evidence: string[] = [];
        const symbolLower = tokenSymbol.toLowerCase();

        if (narrative === 'Unknown') {
            evidence.push('No clear narrative detected from token symbol or on-chain data');
            return evidence;
        }

        // Add evidence based on narrative
        const pattern = this.narrativePatterns[narrative];

        if (pattern) {
            // Check for keyword matches
            for (const keyword of pattern.keywords) {
                if (symbolLower.includes(keyword)) {
                    evidence.push(`Token symbol contains "${keyword}" which is associated with ${narrative} narrative`);
                }
            }

            // Add general evidence
            evidence.push(`Token exhibits characteristics of ${narrative} narrative`);
            evidence.push(`Related tokens in this narrative: ${pattern.relatedTokens.join(', ')}`);
        }

        return evidence;
    }

    /**
     * Calculate narrative strength score (0-100)
     */
    private calculateNarrativeStrength(
        narrative: string,
        tokenSymbol: string,
        marketAnalysis: MarketAnalysis
    ): number {
        if (narrative === 'Unknown') return 30;

        let score = 50; // Base score

        // Increase score based on sentiment
        if (marketAnalysis.sentimentAnalysis) {
            const sentiment = marketAnalysis.sentimentAnalysis.sentimentScore;
            if (sentiment > 0.7) score += 20;
            else if (sentiment > 0.5) score += 10;
        }

        // Increase score based on price momentum
        const priceChange24h = marketAnalysis.priceTrend.change24h;
        if (priceChange24h > 0.3) score += 20;
        else if (priceChange24h > 0.1) score += 10;

        // Increase score if token symbol contains narrative keywords
        const symbolLower = tokenSymbol.toLowerCase();
        const pattern = this.narrativePatterns[narrative];

        if (pattern) {
            for (const keyword of pattern.keywords) {
                if (symbolLower.includes(keyword)) {
                    score += 15;
                    break;
                }
            }
        }

        // Cap at 100
        return Math.min(100, score);
    }

    // Cache Management
    private getCachedData(tokenAddress: string): NarrativeAnalysis | null {
        const cached = this.cache.get(tokenAddress);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        return null;
    }

    private cacheData(tokenAddress: string, data: NarrativeAnalysis): void {
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