/**
 * @file flowIntelligenceAgent.ts
 * @layer agent
 * @desc Flow Intelligence Agent — detects realtime patterns from transaction data.
 *       Replaces the disabled WebSocket approach with:
 *       1. DexScreener transaction data (buys/sells per 5m, 1h, 6h, 24h)
 *       2. Helius getRecentSignatures for on-chain transaction analysis
 *       No Inversify DI — plain class accepting dependencies via constructor.
 *
 * @exposes FlowIntelligenceAgent
 */

import type { FlowAnalysis, FlowPattern, RealtimeData } from '../types/analysisTypes';
import { HeliusDataService } from '../services/heliusDataService';
import {
  fetchDexScreenerData,
  safeNumber, safeDivide, clamp, round,
  type AgentLogger, consoleLogger,
} from './agentUtils';

export class FlowIntelligenceAgent {
  private helius: HeliusDataService;
  private logger: AgentLogger;

  constructor(helius?: HeliusDataService, logger?: AgentLogger) {
    this.helius = helius ?? new HeliusDataService();
    this.logger = logger ?? consoleLogger;
  }

  /**
   * Analyze token flow patterns from DexScreener + Helius transaction data.
   * No WebSocket needed — uses REST API polling with rate-limited calls.
   */
  async analyzeToken(tokenAddress: string): Promise<FlowAnalysis> {
    const t0 = Date.now();
    this.logger.info(`[FlowAgent] Starting analysis for ${tokenAddress.slice(0, 8)}...`);

    try {
      // ── Fetch Data Sources ─────────────────────────────────────
      const [dexData, recentSigs] = await Promise.all([
        fetchDexScreenerData(tokenAddress),
        this.helius.getRecentSignatures(tokenAddress, 20),
      ]);

      if (!dexData && recentSigs.length === 0) {
        this.logger.warn(`[FlowAgent] No data sources available for ${tokenAddress}`);
        return this.buildEmptyAnalysis(tokenAddress);
      }

      // ── Build Realtime Data ────────────────────────────────────
      const buyPressure = dexData
        ? safeNumber(dexData.buys24h, 0)
        : 0;
      const sellPressure = dexData
        ? safeNumber(dexData.sells24h, 0)
        : 0;

      // Volume growth: 1h volume / 24h volume * 24 (hourly rate vs daily average)
      const volumeGrowth = dexData
        ? safeDivide(dexData.volume1h * 24, dexData.volume24h, 1) - 1
        : 0;

      // Whale activity: percentage of large transactions
      const totalSigs = recentSigs.length;
      const successfulSigs = recentSigs.filter(s => !s.err).length;
      const whaleActivity = clamp(safeDivide(successfulSigs, totalSigs, 0), 0, 1);

      const realtimeData: RealtimeData = {
        price: dexData?.priceUsd ?? 0,
        volume24h: dexData?.volume24h ?? 0,
        priceChange5m: dexData?.priceChange5m ?? 0,
        priceChange1h: dexData?.priceChange1h ?? 0,
        liquidity: dexData?.liquidityUsd ?? 0,
        marketCap: dexData?.marketCap ?? 0,
        buyPressure,
        sellPressure,
        volumeGrowth: round(volumeGrowth, 2),
        whaleActivity: round(whaleActivity, 2),
      };

      // ── Detect Patterns ────────────────────────────────────────
      const patterns: FlowPattern[] = [];
      const evidence: string[] = [];

      // Buy pressure pattern
      if (buyPressure > sellPressure * 1.5 && buyPressure > 0) {
        const strength = clamp(buyPressure / (sellPressure + 1), 0, 1);
        patterns.push({
          type: 'buy_pressure',
          description: `Buy pressure detected: ${buyPressure} buys vs ${sellPressure} sells in 24h`,
          severity: strength > 0.7 ? 'high' : 'moderate',
          strength: round(strength, 2),
        });
        evidence.push(`Strong buy pressure: ${buyPressure} buys vs ${sellPressure} sells (24h)`);
      }

      // Sell pressure pattern
      if (sellPressure > buyPressure * 1.5 && sellPressure > 0) {
        const strength = clamp(sellPressure / (buyPressure + 1), 0, 1);
        patterns.push({
          type: 'sell_pressure',
          description: `Sell pressure detected: ${sellPressure} sells vs ${buyPressure} buys in 24h`,
          severity: strength > 0.7 ? 'high' : 'moderate',
          strength: round(strength, 2),
        });
        evidence.push(`Sell pressure: ${sellPressure} sells vs ${buyPressure} buys (24h)`);
      }

      // Volume spike pattern
      if (volumeGrowth > 0.5) {
        patterns.push({
          type: 'volume_spike',
          description: `Volume spike: ${(volumeGrowth * 100).toFixed(1)}% above 24h average`,
          severity: volumeGrowth > 1 ? 'high' : 'moderate',
          strength: round(clamp(volumeGrowth, 0, 1), 2),
        });
        evidence.push(`Volume spike: ${(volumeGrowth * 100).toFixed(1)}% above 24h average`);
      }

      // Accumulation pattern (buy pressure + volume growth + price stability)
      const priceStable = Math.abs(dexData?.priceChange1h ?? 0) < 2;
      if (buyPressure > sellPressure * 2 && volumeGrowth > 0.3 && priceStable) {
        patterns.push({
          type: 'accumulation',
          description: 'Accumulation pattern: strong buys with stable price',
          severity: 'moderate',
          strength: 0.8,
        });
        evidence.push('Accumulation detected: strong buy pressure with stable price');
      }

      // Distribution pattern (sell pressure + volume growth)
      if (sellPressure > buyPressure * 2 && volumeGrowth > 0.3) {
        patterns.push({
          type: 'distribution',
          description: 'Distribution pattern: strong sells with high volume',
          severity: 'high',
          strength: 0.8,
        });
        evidence.push('Distribution detected: strong sell pressure with elevated volume');
      }

      // Whale entry pattern (from Helius signatures)
      if (successfulSigs > 10) {
        patterns.push({
          type: 'whale_entry',
          description: `${successfulSigs} recent transactions detected on-chain`,
          severity: successfulSigs > 15 ? 'high' : 'moderate',
          strength: round(clamp(successfulSigs / 20, 0, 1), 2),
        });
        evidence.push(`High on-chain activity: ${successfulSigs} recent transactions`);
      }

      // ── Calculate Flow Metrics ─────────────────────────────────
      const inflow = buyPressure;
      const outflow = sellPressure;
      const netFlow = inflow - outflow;

      // Anomalous transactions (transactions with errors)
      const anomalousTransactions = recentSigs
        .filter(s => s.err)
        .map(s => ({
          signature: s.signature,
          type: 'failed_transaction',
          amount: 0,
          confidence: 0.9,
        }));

      // ── Calculate Overall Confidence ───────────────────────────
      const dataPoints = (dexData ? 1 : 0) + (recentSigs.length > 0 ? 1 : 0);
      const confidence = round(clamp(dataPoints / 2, 0, 1), 2);

      // ── Build Final Analysis ───────────────────────────────────
      const analysis: FlowAnalysis = {
        token: tokenAddress,
        inflow,
        outflow,
        netFlow,
        anomalousTransactions: anomalousTransactions.length > 0 ? anomalousTransactions : undefined,
        patterns,
        confidence,
        evidence,
        realtimeData,
      };

      const dt = Date.now() - t0;
      this.logger.info(`[FlowAgent] Analysis complete in ${dt}ms`, {
        patterns: patterns.length,
        buyPressure,
        sellPressure,
        netFlow,
        confidence,
      });

      return analysis;
    } catch (error) {
      this.logger.error(`[FlowAgent] Analysis failed for ${tokenAddress}`, error);
      return this.buildEmptyAnalysis(tokenAddress);
    }
  }

  private buildEmptyAnalysis(tokenAddress: string): FlowAnalysis {
    return {
      token: tokenAddress,
      inflow: 0,
      outflow: 0,
      netFlow: 0,
      patterns: [],
      confidence: 0,
      evidence: ['No data sources available'],
      realtimeData: {
        price: 0,
        volume24h: 0,
        priceChange5m: 0,
        priceChange1h: 0,
        liquidity: 0,
        marketCap: 0,
        buyPressure: 0,
        sellPressure: 0,
        volumeGrowth: 0,
        whaleActivity: 0,
      },
    };
  }
}
