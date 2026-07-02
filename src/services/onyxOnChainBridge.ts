/**
 * @file onyxOnChainBridge.ts
 * @layer services
 * @desc Bridges onyx-protocol on-chain data → intelligent_integration AI agents.
 *       This is THE integration layer: wallet → on-chain state → AI agents.
 *       Agents get validated on-chain data instead of mock data.
 * @exposes OnyxOnChainBridge
 * @deps @solana/web3.js, @solana/wallet-adapter-react, ../lib/onyxProgram
 */

import { PublicKey, Connection } from '@solana/web3.js';
import { OnyxProgramClient } from '../lib/onyxProgram';
import {
  ONYX_PROGRAM_ID,
  getConfigPDA,
  getAnalysisPDA,
  type OnyxConfigAccount,
  type TokenAnalysisAccount,
} from '../lib/idl/onyx_protocol';

export interface OnyxBridgeState {
  config: OnyxConfigAccount | null;
  analyses: Map<string, TokenAnalysisAccount>;
  initialized: boolean;
  lastSync: number;
}

export interface TokenAnalysisEnriched extends TokenAnalysisAccount {
  /** Computed fields for AI consumption */
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  volatilityScore: number;
  /** Composite safety score (0-100), inverted from rug scores */
  safetyScore: number;
  /** Human-readable summary */
  summary: string;
}

/**
 * OnyxOnChainBridge — service layer that provides on-chain data to AI agents.
 * 
 * How it integrates:
 * 1. React components call useOnyxProgram() to get program client
 * 2. This bridge uses that client to fetch on-chain state
 * 3. AI agents (onchainAgent, marketAgent, etc.) consume enriched data
 * 4. The orchestrator merges on-chain + off-chain data for final reports
 * 
 * Usage:
 *   const bridge = new OnyxOnChainBridge(connection);
 *   const config = await bridge.loadConfig();
 *   const analysis = await bridge.loadAnalysis(tokenMint);
 */
export class OnyxOnChainBridge {
  private readonly program: OnyxProgramClient;
  private state: OnyxBridgeState = {
    config: null,
    analyses: new Map(),
    initialized: false,
    lastSync: 0,
  };

  constructor(connection: Connection, programId: PublicKey = ONYX_PROGRAM_ID) {
    this.program = new OnyxProgramClient(connection, programId);
  }

  /**
   * Initialize bridge: load config and warm up cache.
   */
  async initialize(): Promise<OnyxBridgeState> {
    const config = await this.program.getConfig();
    this.state = {
      config,
      analyses: new Map(),
      initialized: true,
      lastSync: Date.now(),
    };
    return this.state;
  }

  /**
   * Load on-chain config.
   */
  async loadConfig(): Promise<OnyxConfigAccount | null> {
    const config = await this.program.getConfig();
    this.state.config = config;
    this.state.lastSync = Date.now();
    return config;
  }

  /**
   * Load token analysis from on-chain state.
   */
  async loadAnalysis(mintAddress: string): Promise<TokenAnalysisEnriched | null> {
    try {
      const mint = new PublicKey(mintAddress);
      const raw = await this.program.getTokenAnalysis(mint);
      if (!raw) return null;

      const enriched = this.enrichAnalysis(raw);
      this.state.analyses.set(mintAddress, raw);
      this.state.lastSync = Date.now();
      return enriched;
    } catch (e) {
      console.error(`[OnyxBridge] Failed to load analysis for ${mintAddress}:`, e);
      return null;
    }
  }

  /**
   * Batch load multiple token analyses.
   */
  async loadAnalyses(mintAddresses: string[]): Promise<(TokenAnalysisEnriched | null)[]> {
    const mints = mintAddresses.map(a => new PublicKey(a));
    const raws = await this.program.getTokenAnalyses(mints);
    return raws.map((raw, i) => {
      if (!raw) return null;
      const enriched = this.enrichAnalysis(raw);
      this.state.analyses.set(mintAddresses[i], raw);
      return enriched;
    });
  }

  /**
   * Check if config account exists on-chain.
   */
  async isProtocolInitialized(): Promise<boolean> {
    return this.program.configExists();
  }

  /**
   * Get PDA addresses for a given mint.
   */
  getPDAs(mintAddress: string) {
    const mint = new PublicKey(mintAddress);
    return {
      config: getConfigPDA(ONYX_PROGRAM_ID).pda,
      analysis: getAnalysisPDA(mint, ONYX_PROGRAM_ID).pda,
    };
  }

  /**
   * Enrich raw on-chain data with computed fields for AI consumption.
   */
  private enrichAnalysis(raw: TokenAnalysisAccount): TokenAnalysisEnriched {
    const riskScore = raw.riskScore;
    const riskCategory = this.computeRiskCategory(riskScore);
    const confidence = this.computeConfidence(raw);
    const volatilityScore = this.computeVolatility(raw);
    const safetyScore = this.computeSafetyScore(raw);

    return {
      ...raw,
      riskCategory,
      confidence,
      volatilityScore,
      safetyScore,
      summary: this.buildSummary(raw, riskCategory, safetyScore),
    };
  }

  /**
   * Convert numeric riskScore (0-10000) to risk category.
   */
  private computeRiskCategory(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score <= 2000) return 'LOW';
    if (score <= 5000) return 'MEDIUM';
    if (score <= 8000) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Compute confidence based on data freshness and completeness.
   * Fields like largeTransfers, whaleWallets, liquidityDepth indicate data quality.
   */
  private computeConfidence(raw: TokenAnalysisAccount): number {
    const now = Date.now() / 1000;
    const ageHours = (now - raw.analysisTimestamp) / 3600;
    const freshnessFactor = Math.max(0, 1 - ageHours / 24);

    // Data completeness: percentage of non-default values
    // Check key metrics for non-zero (more data = more confidence)
    let populatedFields = 0;
    const totalFields = 7; // largeTransfers, whaleWallets, liquidityDepth, lockedLiquidity, dumpScore, overallRugScore, devTxCount

    if (raw.largeTransfers > 0) populatedFields++;
    if (raw.whaleWallets > 0) populatedFields++;
    if (raw.liquidityDepth > 0) populatedFields++;
    if (raw.lockedLiquidity > 0) populatedFields++;
    if (raw.dumpScore > 0 || raw.overallRugScore > 0) populatedFields++;
    if (raw.devTxCount > 0) populatedFields++;
    if (raw.holderConcentration > 0) populatedFields++;

    const dataQuality = populatedFields / totalFields;
    return parseFloat((dataQuality * 0.5 + freshnessFactor * 0.5).toFixed(2));
  }

  /**
   * Estimate volatility from risk score and recency.
   */
  private computeVolatility(raw: TokenAnalysisAccount): number {
    const now = Date.now() / 1000;
    const ageHours = (now - raw.analysisTimestamp) / 3600;
    const recency = Math.max(0, 1 - ageHours / 48);
    // Higher riskScore → higher volatility
    return parseFloat(((raw.riskScore / 10000) * (0.3 + 0.7 * recency)).toFixed(2));
  }

  /**
   * Compute safety score (0-100, higher = safer).
   * Inverts rug indicators for an intuitive score.
   */
  private computeSafetyScore(raw: TokenAnalysisAccount): number {
    // Factors that decrease safety:
    // 1. high overallRugScore + dumpScore
    // 2. high liquidityRemovalScore
    // 3. high devActivityScore (suspicious)
    // 4. mintAuthority or freezeAuthority still active
    // 5. high holderConcentration

    let deductions = 0;

    // Rug scores are 0-10000
    deductions += raw.overallRugScore / 100;       // max 100
    deductions += raw.dumpScore / 200;              // max 50
    deductions += raw.liquidityRemovalScore / 200;  // max 50
    deductions += raw.devActivityScore / 200;       // max 50

    // Authority flags
    if (raw.mintAuthority) deductions += 30;
    if (raw.freezeAuthority) deductions += 20;

    // Holder concentration (basis points → percentage / 2)
    deductions += Math.min(50, raw.holderConcentration / 200);

    const safety = Math.max(0, Math.min(100, 100 - deductions));
    return Math.round(safety);
  }

  /**
   * Build human-readable summary string for AI consumption.
   */
  private buildSummary(
    raw: TokenAnalysisAccount,
    riskCategory: string,
    safetyScore: number
  ): string {
    const parts: string[] = [];

    // Whale activity
    if (raw.whaleWallets > 5) {
      parts.push(`High whale presence: ${raw.whaleWallets} large wallets`);
    } else if (raw.whaleWallets > 0) {
      parts.push(`${raw.whaleWallets} whale wallets detected`);
    }

    // Concentration
    if (raw.holderConcentration > 5000) {
      parts.push('⚠️ Extreme holder concentration');
    } else if (raw.holderConcentration > 2000) {
      parts.push('Moderate holder concentration');
    }

    // Liquidity
    if (raw.liquidityDepth > 0) {
      const depthK = (raw.liquidityDepth / 100).toFixed(0);
      parts.push(`Liquidity depth: $${depthK}`);
    }
    if (raw.lockedLiquidity > 0) {
      const lockedK = (raw.lockedLiquidity / 100).toFixed(0);
      parts.push(`Locked liquidity: $${lockedK}`);
    }

    // Liquidity change
    if (raw.liquidityChange24h < -500) {
      parts.push('⚠️ Sharp liquidity decline in 24h');
    } else if (raw.liquidityChange24h > 500) {
      parts.push('Liquidity increasing');
    }

    // Dev activity
    if (raw.suspiciousTransfers > 0) {
      parts.push(`⚠️ ${raw.suspiciousTransfers} suspicious dev transfers`);
    }

    // Rug scores
    if (raw.overallRugScore > 5000) {
      parts.push('⚠️ High overall rug risk');
    }

    // Contract safety
    if (!raw.mintAuthority && !raw.freezeAuthority && raw.isVerified) {
      parts.push('✅ Contract verified & renounced');
    } else if (raw.mintAuthority) {
      parts.push('⚠️ Mint authority is still active');
    }

    // Token age
    if (raw.tokenAgeSeconds > 0) {
      const days = Math.floor(raw.tokenAgeSeconds / 86400);
      if (days < 7) {
        parts.push(`🆕 Token is ${days}d old`);
      } else {
        parts.push(`Token age: ${days}d`);
      }
    }

    const header = `[${riskCategory}] Risk Score: ${raw.riskScore}/10000 | Safety: ${safetyScore}/100`;
    return parts.length > 0
      ? `${header}\n${parts.join(' | ')}`
      : `${header}\nNo significant signals detected`;
  }
}