/**
 * @file onchainAgent.ts
 * @layer agent
 * @desc OnChain Agent — fetches real on-chain data from Helius API (rate-limited).
 *       Produces OnchainAnalysis with holder data, contract analysis, risk score,
 *       rug pull indicators, and developer activity.
 *       No Inversify DI — plain class accepting dependencies via constructor.
 *
 * @exposes OnchainAgent
 */

import type { OnchainAnalysis } from '../types/analysisTypes';
import { HeliusDataService } from '../services/heliusDataService';
import { safeNumber, safeDivide, clamp, round, type AgentLogger, consoleLogger } from './agentUtils';

export class OnchainAgent {
  private helius: HeliusDataService;
  private logger: AgentLogger;

  constructor(helius?: HeliusDataService, logger?: AgentLogger) {
    this.helius = helius ?? new HeliusDataService();
    this.logger = logger ?? consoleLogger;
  }

  /**
   * Analyze token on-chain data from Helius.
   * Fetches: token supply, top holders, mint authority, freeze authority, creator activity.
   * Credits used: ~4-5 per analysis.
   */
  async analyzeToken(tokenAddress: string): Promise<OnchainAnalysis> {
    const t0 = Date.now();
    this.logger.info(`[OnchainAgent] Starting analysis for ${tokenAddress.slice(0, 8)}...`);

    try {
      // ── Fetch Token Metadata ───────────────────────────────────
      const metadata = await this.helius.getTokenMetadata(tokenAddress);

      if (!metadata) {
        this.logger.warn(`[OnchainAgent] No metadata for ${tokenAddress}`);
        return this.buildEmptyAnalysis(tokenAddress);
      }

      // ── Whale Activity ─────────────────────────────────────────
      const whaleWallets = metadata.topHolders.filter(h => h.percentage > 1).length;
      const concentration = metadata.topHolderConcentration / 100; // convert % to 0-1

      // Count large transfers from top holders (recent signatures)
      let largeTransfers = 0;
      const topHolderAddresses = metadata.topHolders.slice(0, 5).map(h => h.address);
      // Only check signatures for top 2 holders to save credits
      for (const addr of topHolderAddresses.slice(0, 2)) {
        const sigs = await this.helius.getRecentSignatures(addr, 5);
        largeTransfers += sigs.filter(s => !s.err).length;
      }

      const whaleActivity = {
        largeTransfers,
        whaleWallets,
        concentration: round(concentration, 4),
      };

      // ── Holder Growth (estimated from holder count vs time) ────
      // Without historical data, we estimate growth from token age
      const tokenAgeHours = metadata.creationTimestamp
        ? (Date.now() / 1000 - metadata.creationTimestamp) / 3600
        : 0;

      const holderCount = metadata.holderCount;
      // Estimate new holders: if token is < 24h old, assume most holders are new
      // If older, estimate ~5-10% growth rate
      const newHolders = tokenAgeHours > 0 && tokenAgeHours < 24
        ? Math.round(holderCount * 0.8) // 80% are new for tokens < 24h
        : Math.round(holderCount * 0.08); // 8% recent growth for older tokens

      const growthRate = tokenAgeHours > 0
        ? round(holderCount / tokenAgeHours, 4)
        : 0;

      const holderGrowth = {
        newHolders,
        growthRate,
      };

      // ── Developer Activity ─────────────────────────────────────
      const devWallets: string[] = [];
      if (metadata.creator) {
        devWallets.push(metadata.creator);
      }

      let devWalletTransactions = 0;
      let suspiciousTransfers = 0;
      let devWalletBalance = 0;

      if (metadata.creator) {
        const devSigs = await this.helius.getRecentSignatures(metadata.creator, 10);
        devWalletTransactions = devSigs.filter(s => !s.err).length;
        // Suspicious: transactions with errors or high frequency
        suspiciousTransfers = devSigs.filter(s => s.err).length;
      }

      // Check if creator holds significant supply
      const creatorHolder = metadata.topHolders.find(h => h.address === metadata.creator);
      devWalletBalance = creatorHolder?.uiAmount ?? 0;

      const developerActivity = {
        devWalletTransactions,
        suspiciousTransfers,
        devWalletBalance,
        devWallets,
      };

      // ── Liquidity Analysis (on-chain perspective) ─────────────
      // Check if LP tokens are in top holders
      const lpHolder = metadata.topHolders.find(h =>
        h.address === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' || // Raydium
        h.address === 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'     // Whirlpool
      );

      const liquidityDepth = lpHolder?.uiAmount ?? 0;
      const liquidityConcentration = lpHolder ? lpHolder.percentage / 100 : 0;

      const liquidityAnalysis = {
        liquidityDepth,
        liquidityChange24h: 0, // Would need historical data
        lockedLiquidity: lpHolder ? liquidityDepth * 0.5 : 0, // Estimate 50% locked if LP exists
        liquidityConcentration: round(liquidityConcentration, 4),
      };

      // ── Rug Pull Indicators ────────────────────────────────────
      const hasMintAuthority = !!metadata.mintAuthority;
      const hasFreezeAuthority = !!metadata.freezeAuthority;

      // Dump score: high if creator holds large % of supply
      const dumpScore = creatorHolder
        ? clamp(creatorHolder.percentage / 100, 0, 1)
        : 0.3;

      // Liquidity removal score: high if LP is not locked and creator has access
      const liquidityRemovalScore = lpHolder && !hasMintAuthority
        ? 0.2 // Some risk
        : lpHolder && hasMintAuthority
          ? 0.5 // Higher risk
          : 0.7; // No LP detected = high risk

      // Dev wallet activity score: high if dev has many transactions or suspicious transfers
      const devWalletActivityScore = clamp(
        (devWalletTransactions / 20) * 0.5 + (suspiciousTransfers / 5) * 0.5,
        0, 1,
      );

      // Overall rug score: weighted combination
      const overallRugScore = round(clamp(
        dumpScore * 0.3 +
        liquidityRemovalScore * 0.3 +
        devWalletActivityScore * 0.2 +
        (hasMintAuthority ? 0.15 : 0) +
        (hasFreezeAuthority ? 0.15 : 0),
        0, 1,
      ), 2);

      const rugPullIndicators = {
        dumpScore: round(dumpScore, 2),
        liquidityRemovalScore: round(liquidityRemovalScore, 2),
        devWalletActivityScore: round(devWalletActivityScore, 2),
        overallRugScore,
      };

      // ── Risk Score (0-1, higher = more risky) ──────────────────
      const riskScore = round(clamp(
        overallRugScore * 0.4 +
        concentration * 0.3 +
        (hasMintAuthority ? 0.15 : 0) +
        (hasFreezeAuthority ? 0.15 : 0),
        0, 1,
      ), 2);

      // ── Contract Analysis ──────────────────────────────────────
      const contractAnalysis = {
        age: Math.round(tokenAgeHours),
        creator: metadata.creator,
        mintAuthority: hasMintAuthority,
        freezeAuthority: hasFreezeAuthority,
        isVerified: metadata.isVerified,
        renounced: metadata.renounced,
        creationTimestamp: metadata.creationTimestamp,
      };

      // ── Build Final Analysis ───────────────────────────────────
      const analysis: OnchainAnalysis = {
        token: tokenAddress,
        whaleActivity,
        holderGrowth,
        developerActivity,
        liquidityAnalysis,
        rugPullIndicators,
        riskScore,
        contractAnalysis,
      };

      const dt = Date.now() - t0;
      this.logger.info(`[OnchainAgent] Analysis complete in ${dt}ms`, {
        holders: holderCount,
        concentration: round(concentration * 100, 1) + '%',
        riskScore,
        rugScore: overallRugScore,
        credits: this.helius.getCreditStats().used,
      });

      return analysis;
    } catch (error) {
      this.logger.error(`[OnchainAgent] Analysis failed for ${tokenAddress}`, error);
      return this.buildEmptyAnalysis(tokenAddress);
    }
  }

  private buildEmptyAnalysis(tokenAddress: string): OnchainAnalysis {
    return {
      token: tokenAddress,
      whaleActivity: { largeTransfers: 0, whaleWallets: 0, concentration: 0 },
      holderGrowth: { newHolders: 0, growthRate: 0 },
      developerActivity: { devWalletTransactions: 0, suspiciousTransfers: 0, devWalletBalance: 0, devWallets: [] },
      liquidityAnalysis: { liquidityDepth: 0, liquidityChange24h: 0, lockedLiquidity: 0, liquidityConcentration: 0 },
      rugPullIndicators: { dumpScore: 0.5, liquidityRemovalScore: 0.5, devWalletActivityScore: 0, overallRugScore: 0.5 },
      riskScore: 0.5,
      contractAnalysis: { age: 0, creator: '', mintAuthority: false, freezeAuthority: false, isVerified: false, renounced: false },
    };
  }
}
