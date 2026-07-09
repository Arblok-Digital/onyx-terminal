/**
 * @file narrativeAgent.ts
 * @layer agent
 * @desc Narrative Agent — detects the underlying narrative driving token attention.
 *       Uses DexScreener socials + token symbol/name for narrative detection.
 *       Accepts OnchainAnalysis + MarketAnalysis from Phase 1 agents (feedback loop).
 *       No Inversify DI — plain class.
 *
 * @exposes NarrativeAgent
 */

import type { NarrativeAnalysis, OnchainAnalysis, MarketAnalysis } from '../types/analysisTypes';
import { fetchDexScreenerData, clamp, round, SimpleCache, type AgentLogger, consoleLogger } from './agentUtils';

interface NarrativePattern {
  keywords: string[];
  relatedTokens: string[];
}

export class NarrativeAgent {
  private logger: AgentLogger;
  private cache: SimpleCache<NarrativeAnalysis>;
  private narrativePatterns: Record<string, NarrativePattern>;

  constructor(logger?: AgentLogger) {
    this.logger = logger ?? consoleLogger;
    this.cache = new SimpleCache(3_600_000); // 1 hour cache
    this.narrativePatterns = this.initializePatterns();
  }

  /**
   * Analyze token narrative.
   * Requires Phase 1 outputs: onchainAnalysis + marketAnalysis (feedback loop).
   */
  async analyzeToken(
    tokenAddress: string,
    tokenSymbol: string,
    onchainAnalysis: OnchainAnalysis,
    marketAnalysis: MarketAnalysis,
  ): Promise<NarrativeAnalysis> {
    // Check cache
    const cached = this.cache.get(tokenAddress);
    if (cached) return cached;

    const t0 = Date.now();
    this.logger.info(`[NarrativeAgent] Analyzing ${tokenSymbol}`);

    try {
      // Fetch DexScreener for social data (websites, socials)
      const dexData = await fetchDexScreenerData(tokenAddress);

      // Combine all text signals for narrative detection
      const symbolLower = tokenSymbol.toLowerCase();
      const nameLower = dexData?.name?.toLowerCase() ?? '';
      const socialUrls = dexData?.socials.map(s => s.url.toLowerCase()).join(' ') ?? '';
      const websiteUrls = dexData?.websites.map(w => w.url.toLowerCase()).join(' ') ?? '';
      const combinedText = `${symbolLower} ${nameLower} ${socialUrls} ${websiteUrls}`;

      // Detect narrative
      const narrative = this.detectNarrative(combinedText, onchainAnalysis);
      const confidence = this.calculateConfidence(narrative, combinedText);
      const evidence = this.generateEvidence(narrative, tokenSymbol, combinedText);
      const narrativeStrength = this.calculateNarrativeStrength(
        narrative, combinedText, marketAnalysis,
      );

      const relatedTokens = this.narrativePatterns[narrative]?.relatedTokens ?? [];

      const analysis: NarrativeAnalysis = {
        token: tokenAddress,
        narrative: narrative || 'Unknown',
        confidence,
        evidence,
        narrativeStrength,
        relatedTokens,
      };

      this.cache.set(tokenAddress, analysis);

      const dt = Date.now() - t0;
      this.logger.info(`[NarrativeAgent] Complete in ${dt}ms`, { narrative, confidence, strength: narrativeStrength });

      return analysis;
    } catch (error) {
      this.logger.error(`[NarrativeAgent] Failed for ${tokenSymbol}`, error);
      return {
        token: tokenAddress,
        narrative: 'Unknown',
        confidence: 0.3,
        evidence: ['Analysis failed'],
        narrativeStrength: 30,
        relatedTokens: [],
      };
    }
  }

  private detectNarrative(text: string, onchain: OnchainAnalysis): string {
    // Check each narrative pattern against combined text
    let bestMatch = '';
    let bestScore = 0;

    for (const [narrative, pattern] of Object.entries(this.narrativePatterns)) {
      let score = 0;
      for (const keyword of pattern.keywords) {
        if (text.includes(keyword)) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = narrative;
      }
    }

    // Fallback: detect from on-chain behavior
    if (!bestMatch) {
      return this.detectNarrativeFromBehavior(onchain);
    }

    return bestMatch;
  }

  private detectNarrativeFromBehavior(onchain: OnchainAnalysis): string {
    const newHolders = onchain.holderGrowth?.newHolders ?? 0;
    const concentration = onchain.whaleActivity?.concentration ?? 0;
    const liquidityDepth = onchain.liquidityAnalysis?.liquidityDepth ?? 0;
    const isVerified = onchain.contractAnalysis?.isVerified ?? false;

    if (newHolders > 500 && concentration < 0.3) return 'Meme';
    if (liquidityDepth > 5_000_000 && isVerified) return 'RWA';
    return 'DeFi';
  }

  private calculateConfidence(narrative: string, text: string): number {
    if (narrative === 'Unknown') return 0.3;

    const pattern = this.narrativePatterns[narrative];
    if (!pattern) return 0.5;

    let matches = 0;
    for (const keyword of pattern.keywords) {
      if (text.includes(keyword)) matches++;
    }

    // More keyword matches = higher confidence
    return round(clamp(0.5 + matches * 0.15, 0, 0.95), 2);
  }

  private generateEvidence(narrative: string, symbol: string, text: string): string[] {
    const evidence: string[] = [];

    if (narrative === 'Unknown') {
      evidence.push('No clear narrative detected from token symbol, name, or socials');
      return evidence;
    }

    const pattern = this.narrativePatterns[narrative];
    if (!pattern) return evidence;

    const symbolLower = symbol.toLowerCase();
    for (const keyword of pattern.keywords) {
      if (text.includes(keyword)) {
        evidence.push(`Keyword "${keyword}" found in token metadata — matches ${narrative} narrative`);
      }
    }

    if (evidence.length === 0) {
      evidence.push(`Token exhibits characteristics of ${narrative} narrative based on on-chain behavior`);
    }

    evidence.push(`Related tokens in ${narrative}: ${pattern.relatedTokens.join(', ')}`);
    return evidence;
  }

  private calculateNarrativeStrength(
    narrative: string,
    text: string,
    market: MarketAnalysis,
  ): number {
    if (narrative === 'Unknown') return 30;

    let score = 50;

    // Sentiment boost
    const sentiment = market.sentimentAnalysis?.sentimentScore ?? 0.5;
    if (sentiment > 0.7) score += 20;
    else if (sentiment > 0.5) score += 10;

    // Price momentum boost
    const change24h = market.priceTrend?.change24h ?? 0;
    if (change24h > 0.3) score += 20;
    else if (change24h > 0.1) score += 10;

    // Keyword match boost
    const pattern = this.narrativePatterns[narrative];
    if (pattern) {
      for (const keyword of pattern.keywords) {
        if (text.includes(keyword)) {
          score += 15;
          break;
        }
      }
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private initializePatterns(): Record<string, NarrativePattern> {
    return {
      'AI Infrastructure': {
        keywords: ['ai', 'artificial intelligence', 'machine learning', 'neural', 'gpu', 'compute', 'inference', 'training', 'llm', 'model', 'data center'],
        relatedTokens: ['FET', 'AGIX', 'OCEAN', 'RNDR', 'AKT'],
      },
      'DePIN': {
        keywords: ['depin', 'decentralized physical', 'infrastructure', 'network', 'hardware', 'iot', 'mesh', 'wireless', 'storage', 'bandwidth'],
        relatedTokens: ['HNT', 'IOT', 'MOBILE', 'AR', 'NKN'],
      },
      'RWA': {
        keywords: ['rwa', 'real world asset', 'tokenized', 'treasury', 'bond', 'commodity', 'gold', 'real estate', 'yield', 'finance'],
        relatedTokens: ['ONDO', 'GFI', 'MKR', 'FRAX', 'USDC'],
      },
      'Gaming': {
        keywords: ['game', 'gaming', 'play', 'nft', 'metaverse', 'virtual', 'world', 'character', 'asset', 'reward', 'esports'],
        relatedTokens: ['GALA', 'MANA', 'SAND', 'IMX', 'ILV'],
      },
      'SocialFi': {
        keywords: ['social', 'socialfi', 'creator', 'content', 'community', 'engagement', 'reward', 'tipping', 'fan', 'platform'],
        relatedTokens: ['FAN', 'STARS', 'YGG', 'LENS', 'RALLY'],
      },
      'Meme': {
        keywords: ['meme', 'dog', 'cat', 'funny', 'viral', 'community', 'joke', 'haha', 'lol', 'fun', 'trend'],
        relatedTokens: ['DOGE', 'SHIB', 'PEPE', 'BONK', 'WIF'],
      },
      'DeFi': {
        keywords: ['defi', 'decentralized finance', 'dex', 'swap', 'yield', 'farming', 'liquidity', 'staking', 'lending', 'borrowing'],
        relatedTokens: ['UNI', 'AAVE', 'COMP', 'CRV', 'SUSHI'],
      },
      'NFT': {
        keywords: ['nft', 'non fungible', 'digital art', 'collectible', 'pfp', 'profile picture', 'blue chip', 'generative', 'avatar'],
        relatedTokens: ['BAYC', 'MAYC', 'AZUKI', 'CLONE', 'DEGODS'],
      },
    };
  }

  clearCache(tokenAddress?: string): void {
    if (tokenAddress) this.cache.delete(tokenAddress);
    else this.cache.clear();
  }
}
