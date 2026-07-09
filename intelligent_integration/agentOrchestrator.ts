/**
 * @file agentOrchestrator.ts
 * @layer orchestrator
 * @desc 4-Phase Agent Orchestrator for Onyx Terminal.
 *       Phase 1 (Parallel): MarketAgent, OnchainAgent, FlowIntelligenceAgent
 *       Phase 2 (Parallel): NarrativeAgent, SmartMoneyAgent, OpportunityAgent, SurvivalAgent
 *       Phase 3 (Consensus): RankingCalculator + IntelligenceReportGenerator
 *       Phase 4 (Output): Structured IntelligenceReport
 *
 *       No Inversify DI - plain instantiation with optional dependency injection.
 *       All agents use HeliusDataService singleton with rate limiting (8 req/s).
 *
 * @exposes AgentOrchestrator
 */

import { Connection } from '@solana/web3.js';
import { MarketAgent } from './agents/marketAgent';
import { OnchainAgent } from './agents/onchainAgent';
import { FlowIntelligenceAgent } from './agents/flowIntelligenceAgent';
import { NarrativeAgent } from './agents/narrativeAgent';
import { SmartMoneyAgent } from './agents/smartMoneyAgent';
import { OpportunityAgent } from './agents/opportunityAgent';
import { SurvivalAgent } from './agents/survivalAgent';
import { HeliusDataService, getHeliusDataService } from './services/heliusDataService';
import { calculateDefaultRanking } from './core/rankingCalculator';
import { generateIntelligenceReport } from './core/intelligenceReportGenerator';
import { IntelligenceError } from './core/intelligenceErrors';
import { runCouncilAnalysis, type CouncilVerdict } from './core/councilAnalyzer';
import { consoleLogger, type AgentLogger } from './agents/agentUtils';
import type {
  IntelligenceReport,
  FlowAnalysis,
  OnchainAnalysis,
  MarketAnalysis,
  NarrativeAnalysis,
  SmartMoneyAnalysis,
  EarlyOpportunityAnalysis,
  SurvivalAnalysis,
  IntelligenceRanking,
} from './types/analysisTypes';

export interface OrchestratorOptions {
  connection?: Connection;
  helius?: HeliusDataService;
  logger?: AgentLogger;
}

export class AgentOrchestrator {
  private helius: HeliusDataService;
  private logger: AgentLogger;

  // Phase 1 agents
  private marketAgent: MarketAgent;
  private onchainAgent: OnchainAgent;
  private flowAgent: FlowIntelligenceAgent;

  // Phase 2 agents
  private narrativeAgent: NarrativeAgent;
  private smartMoneyAgent: SmartMoneyAgent;
  private opportunityAgent: OpportunityAgent;
  private survivalAgent: SurvivalAgent;

  constructor(options?: OrchestratorOptions) {
    this.helius = options?.helius ?? getHeliusDataService();
    this.logger = options?.logger ?? consoleLogger;

    // Phase 1
    this.marketAgent = new MarketAgent(this.logger);
    this.onchainAgent = new OnchainAgent(this.helius, this.logger);
    this.flowAgent = new FlowIntelligenceAgent(this.helius, this.logger);

    // Phase 2
    this.narrativeAgent = new NarrativeAgent(this.logger);
    this.smartMoneyAgent = new SmartMoneyAgent(this.helius, this.logger);
    this.opportunityAgent = new OpportunityAgent(this.logger);
    this.survivalAgent = new SurvivalAgent(this.logger);
  }

  /**
   * Full 4-phase token analysis pipeline.
   *
   * Phase 1: Parallel data fetching (market, onchain, flow)
   * Phase 2: Parallel dependent analysis (narrative, smartMoney, opportunity, survival)
   * Phase 3: Consensus ranking aggregation
   * Phase 4: Intelligence report generation
   */
  async analyzeToken(tokenAddress: string, tokenSymbol: string = 'UNKNOWN'): Promise<IntelligenceReport> {
    const t0 = Date.now();
    const reportId = `report_${tokenAddress.slice(0, 8)}_${Date.now()}`;

    this.logger.info(`[Orchestrator] Starting 4-phase analysis for ${tokenSymbol} (${tokenAddress.slice(0, 8)})`);

    try {
      // ============================================================
      // PHASE 1: Independent Data Fetching (Parallel)
      // ============================================================
      this.logger.info('[Orchestrator] Phase 1: Fetching market, onchain, flow data...');

      const phase1Start = Date.now();
      let flow: FlowAnalysis;
      let onchain: OnchainAnalysis;
      let market: MarketAnalysis;

      try {
        [flow, onchain, market] = await Promise.all([
          this.flowAgent.analyzeToken(tokenAddress),
          this.onchainAgent.analyzeToken(tokenAddress),
          this.marketAgent.analyzeToken(tokenAddress, tokenSymbol),
        ]);
      } catch (phase1Error) {
        this.logger.error('[Orchestrator] Phase 1 partial failure', phase1Error);
        // Throw typed error instead of silent empty data
        // Phase 2 depends on Phase 1 data — no point continuing with garbage
        throw new IntelligenceError(
          `Phase 1 data fetching failed for ${tokenSymbol}`,
          'ANALYSIS_FAILED',
          'phase1',
          { originalError: phase1Error },
        );
      }

      this.logger.info(`[Orchestrator] Phase 1 complete in ${Date.now() - phase1Start}ms`, {
        flowPatterns: flow.patterns?.length ?? 0,
        onchainRisk: onchain.riskScore,
        marketVol: market.volatilityScore,
      });

      // ============================================================
      // PHASE 2: Dependent Analysis (Parallel, uses Phase 1 outputs)
      // ============================================================
      this.logger.info('[Orchestrator] Phase 2: Running narrative, smartMoney, opportunity, survival...');

      const phase2Start = Date.now();
      let narrative: NarrativeAnalysis;
      let smartMoney: SmartMoneyAnalysis;
      let opportunity: EarlyOpportunityAnalysis;
      let survival: SurvivalAnalysis;

      try {
        [narrative, smartMoney, opportunity, survival] = await Promise.all([
          this.narrativeAgent.analyzeToken(tokenAddress, tokenSymbol, onchain, market),
          this.smartMoneyAgent.analyzeToken(tokenAddress, onchain, flow),
          this.opportunityAgent.analyzeToken(tokenAddress, flow, onchain, market),
          this.survivalAgent.analyzeToken(tokenAddress, onchain, market, flow),
        ]);
      } catch (phase2Error) {
        this.logger.error('[Orchestrator] Phase 2 partial failure', phase2Error);
        // Throw typed error — Phase 2 analysis depends on real data
        throw new IntelligenceError(
          `Phase 2 analysis failed for ${tokenSymbol}`,
          'ANALYSIS_FAILED',
          'phase2',
          { originalError: phase2Error },
        );
      }

      this.logger.info(`[Orchestrator] Phase 2 complete in ${Date.now() - phase2Start}ms`, {
        narrative: narrative.narrative,
        smartMoneyScore: smartMoney.smartMoneyScore,
        eoiScore: opportunity.eoiScore,
        survivalProb: survival.survivalProbability,
      });

      // ============================================================
      // PHASE 2.5: Council Ringan (ECC-style lightweight council)
      //   3 voices evaluate the complete data set:
      //     - Architect: long-term structural quality
      //     - Skeptic: critical risk analysis
      //     - Strategist: synthesis & final verdict
      // ============================================================
      this.logger.info('[Orchestrator] Phase 2.5: Running Council Ringan analysis...');

      const councilStart = Date.now();
      let council: CouncilVerdict;

      try {
        council = runCouncilAnalysis(
          flow,
          onchain,
          market,
          narrative,
          smartMoney,
          opportunity,
          survival,
        );
      } catch (councilError) {
        this.logger.error('[Orchestrator] Council analysis failed', councilError);
        // Council failure doesn't block the pipeline — ranking will use raw scores
        council = null as unknown as CouncilVerdict;
      }

      if (council) {
        this.logger.info(`[Orchestrator] Council complete in ${Date.now() - councilStart}ms`, {
          architect: `${council.architect.score}/100`,
          skeptic: `${council.skeptic.score}/100`,
          strategist: `${council.strategist.score}/100`,
          verdict: council.consensusRating,
          tensions: council.keyTensions.length,
        });

        // Log warnings from Skeptic for visibility
        council.skeptic.warnings.forEach(w => this.logger.warn(`[Council:Skeptic] ${w}`));
      } else {
        this.logger.warn('[Orchestrator] Council skipped — proceeding with standard ranking.');
      }

      // ============================================================
      // PHASE 3: Consensus Ranking
      // ============================================================
      this.logger.info('[Orchestrator] Phase 3: Computing consensus ranking...');

      const ranking: IntelligenceRanking = calculateDefaultRanking(
        opportunity,
        onchain,
        smartMoney,
        survival,
        narrative,
      );

      // ============================================================
      // PHASE 4: Intelligence Report Generation
      // ============================================================
      this.logger.info('[Orchestrator] Phase 4: Generating intelligence report...');

      const report = generateIntelligenceReport(
        flow,
        onchain,
        market,
        opportunity,
        narrative,
        smartMoney,
        survival,
        ranking,
      );

      // Inject council insights into the report
      const councilInsights = council ? [
        ...council.skeptic.warnings.slice(0, 3).map(w => ({
          category: 'council-skeptic' as const,
          insight: w,
          confidence: council.skeptic.confidence,
        })),
        ...council.architect.findings.slice(0, 2).map(f => ({
          category: 'council-architect' as const,
          insight: f,
          confidence: council.architect.confidence,
        })),
        {
          category: 'council-verdict' as const,
          insight: council.finalVerdict,
          confidence: council.strategist.confidence,
        },
      ] : [];

      const councilRecs = council && council.consensusScore < 50
        ? ['Council Ringan: Consensus negative — ' + council.keyTensions.join('; ')]
        : council && council.consensusScore >= 70
        ? ['Council Ringan: Consensus positive — ' + (council.architect.findings[0] ?? '')]
        : [];

      // Build the final IntelligenceReport
      const totalDuration = Date.now() - t0;

      const finalReport: IntelligenceReport = {
        id: reportId,
        timestamp: Date.now(),
        tokenAddress,
        tokenSymbol,
        flowAnalysis: flow,
        onchainAnalysis: onchain,
        marketAnalysis: market,
        opportunityAnalysis: opportunity,
        narrativeAnalysis: narrative,
        smartMoneyAnalysis: smartMoney,
        survivalAnalysis: survival,
        summary: report.executiveSummary,
        executiveSummary: report.executiveSummary,
        recommendations: [...report.recommendations, ...councilRecs],
        keyInsights: [...report.keyInsights, ...councilInsights],
        confidenceScore: report.confidenceScore,
        intelligenceRanking: ranking,
        metadata: {
          modelUsed: 'agent_orchestrator_v2',
          durationMs: totalDuration,
          routingDecision: ranking.rating ?? 'unknown',
          processingSteps: [
            'phase1:market+onchain+flow',
            'phase2:narrative+smartmoney+opportunity+survival',
            'phase2.5:council_ringan',
            'phase3:consensus_ranking',
            'phase4:report_generation',
          ],
          councilVerdict: council ? {
            architectScore: council.architect.score,
            skepticScore: council.skeptic.score,
            strategistScore: council.strategist.score,
            consensusScore: council.consensusScore,
            consensusRating: council.consensusRating,
            finalVerdict: council.finalVerdict,
            keyTensions: council.keyTensions,
          } : undefined,
        },
      };

      this.logger.info(`[Orchestrator] Full analysis complete in ${totalDuration}ms`, {
        token: tokenSymbol,
        rating: ranking.rating,
        overallScore: ranking.overallScore,
        confidence: report.confidenceScore,
      });

      return finalReport;
    } catch (error) {
      this.logger.error('[Orchestrator] Analysis failed catastrophically', error);

      // Re-throw as typed error for the caller (AgentRouter / UI) to handle
      throw new IntelligenceError(
        `Analysis failed for ${tokenSymbol}`,
        'ORCHESTRATION_FAILED',
        'phase4',
        { originalError: error, duration: Date.now() - t0 },
      );
    }
  }

  /**
   * Get the underlying HeliusDataService (for credit stats, etc.)
   */
  getHeliusService(): HeliusDataService {
    return this.helius;
  }

  // NOTE: Empty analysis helpers have been removed.
  // Previously they silently returned zero-value data that could be misinterpreted.
  // Use IntelligenceError from ./core/intelligenceErrors instead.
}