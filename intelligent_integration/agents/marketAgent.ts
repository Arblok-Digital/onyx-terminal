/**
 * @file marketAgent.ts
 * @layer agent
 * @desc Market Agent — fetches real market data from DexScreener (free, no key).
 *       Produces MarketAnalysis with price trends, volume, liquidity, volatility, sentiment.
 *       No Inversify DI — plain class accepting dependencies via constructor.
 *
 * @exposes MarketAgent
 */

import type { MarketAnalysis } from '../types/analysisTypes';
import { fetchDexScreenerData, safeNumber, safeDivide, clamp, round, type AgentLogger, consoleLogger } from './agentUtils';

export class MarketAgent {
  private logger: AgentLogger;

  constructor(logger?: AgentLogger) {
    this.logger = logger ?? consoleLogger;
  }

  /**
   * Analyze token market data from DexScreener.
   * DexScreener provides: price, volume, txns, liquidity, marketCap, socials.
   */
  async analyzeToken(tokenAddress: string, tokenSymbol?: string): Promise<MarketAnalysis> {
    const t0 = Date.now();
    this.logger.info(`[MarketAgent] Starting analysis for ${tokenSymbol ?? tokenAddress.slice(0, 8)}`);

    try {
      const dexData = await fetchDexScreenerData(tokenAddress);

      if (!dexData) {
        this.logger.warn(`[MarketAgent] No DexScreener data for ${tokenAddress}`);
        return this.buildEmptyAnalysis(tokenAddress);
      }

      const symbol = tokenSymbol ?? dexData.symbol;

      // ── Price Trend ────────────────────────────────────────────
      const priceTrend = {
        current: dexData.priceUsd,
        change24h: dexData.priceChange24h / 100, // normalize to decimal (e.g. 5.2% → 0.052)
        change7d: dexData.priceChange24h / 100, // DexScreener doesn't have 7d, approximate with 24h
      };

      // ── Volume Analysis ────────────────────────────────────────
      // Detect suspicious volume: if 24h volume > 50x liquidity, likely wash trading
      const volToLiqRatio = safeDivide(dexData.volume24h, dexData.liquidityUsd, 0);
      const suspiciousVolume = volToLiqRatio > 50 ? clamp(volToLiqRatio / 100, 0, 1) : 0;

      const volumeAnalysis = {
        volume24h: dexData.volume24h,
        volumeChange: safeDivide(dexData.volume1h, dexData.volume24h, 0), // 1h vol as % of 24h
        suspiciousVolume,
      };

      // ── Liquidity Analysis ─────────────────────────────────────
      // Estimate slippage: rough formula based on liquidity depth
      // Higher liquidity → lower slippage
      const slippageEstimate = dexData.liquidityUsd > 1_000_000
        ? round(100 / dexData.liquidityUsd * 10000, 2) // ~0.01% for $1M+
        : dexData.liquidityUsd > 100_000
          ? round(500 / dexData.liquidityUsd * 10000, 2)
          : round(2000 / Math.max(dexData.liquidityUsd, 1) * 10000, 2);

      const liquidityAnalysis = {
        depth: dexData.liquidityUsd,
        slippage: slippageEstimate,
        change24h: dexData.priceChange24h / 100,
      };

      // ── Volatility Score (0-1) ─────────────────────────────────
      // Based on price spread across timeframes
      const changes = [dexData.priceChange5m, dexData.priceChange1h, dexData.priceChange6h, dexData.priceChange24h];
      const maxChange = Math.max(...changes.map(Math.abs));
      const volatilityScore = clamp(maxChange / 50, 0, 1); // 50% change = max volatility

      // ── Sentiment Analysis (derived from buy/sell ratio) ──────
      const totalBuys24h = dexData.buys24h;
      const totalSells24h = dexData.sells24h;
      const totalTxns24h = totalBuys24h + totalSells24h;
      const buyRatio = safeDivide(totalBuys24h, totalTxns24h, 0.5);

      // Sentiment score: 0 = extreme sell, 0.5 = neutral, 1 = extreme buy
      const sentimentScore = round(clamp(buyRatio, 0, 1), 2);
      const sentimentTrend = dexData.buys1h > dexData.sells1h ? 1 : dexData.buys1h < dexData.sells1h ? -1 : 0;

      const sentimentAnalysis = {
        sentimentScore,
        positiveMentions: totalBuys24h,
        negativeMentions: totalSells24h,
        neutralMentions: 0,
        sentimentTrend,
        source: 'dexscreener_buysell_ratio',
      };

      // ── Build Final Analysis ───────────────────────────────────
      const analysis: MarketAnalysis = {
        token: tokenAddress,
        priceTrend,
        volumeAnalysis,
        liquidityAnalysis,
        volatilityScore: round(volatilityScore, 2),
        marketCap: dexData.marketCap,
        sentimentAnalysis,
      };

      const dt = Date.now() - t0;
      this.logger.info(`[MarketAgent] Analysis complete in ${dt}ms`, {
        symbol,
        price: dexData.priceUsd,
        liquidity: dexData.liquidityUsd,
        vol24h: dexData.volume24h,
      });

      return analysis;
    } catch (error) {
      this.logger.error(`[MarketAgent] Analysis failed for ${tokenAddress}`, error);
      return this.buildEmptyAnalysis(tokenAddress);
    }
  }

  private buildEmptyAnalysis(tokenAddress: string): MarketAnalysis {
    return {
      token: tokenAddress,
      priceTrend: { current: 0, change24h: 0, change7d: 0 },
      volumeAnalysis: { volume24h: 0, volumeChange: 0, suspiciousVolume: 0 },
      liquidityAnalysis: { depth: 0, slippage: 100, change24h: 0 },
      volatilityScore: 0,
      marketCap: 0,
      sentimentAnalysis: {
        sentimentScore: 0.5,
        positiveMentions: 0,
        negativeMentions: 0,
        neutralMentions: 0,
        sentimentTrend: 0,
        source: 'no_data',
      },
    };
  }
}
