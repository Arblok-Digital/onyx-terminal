/**
 * @file intelligent_integration/index.ts
 * @desc Barrel file for 9Router Intelligence module
 * @exposes research manager, analysis types, and main entry points
 */

import { ResearchManager } from './researchManager';
import type {
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis,
    IntelligenceRanking,
    IntelligenceReport,
    AttentionVelocityAnalysis,
    ConvictionScoreAnalysis,
    SignalConsensusResult,
    AgentConfig
} from './types/analysisTypes';
// Singleton orchestrator pattern
let orchestrator: ResearchManager | null = null;

function getOrchestrator(): ResearchManager {
    if (!orchestrator) {
        orchestrator = new ResearchManager();
    }
    return orchestrator;
}

/**
 * Check if real API keys are available
 */
export function hasRealApiKeys(): boolean {
    const orchestrator = getOrchestrator();
    return orchestrator.hasRealApiKeys();
}

/**
 * Main entry point for token analysis
 */
export async function analyzeToken(
    token: string,
    flowData: FlowAnalysis,
    onchainData: OnchainAnalysis,
    marketData: MarketAnalysis,
    opportunityData?: EarlyOpportunityAnalysis,
    narrativeData?: NarrativeAnalysis,
    smartMoneyData?: SmartMoneyAnalysis,
    survivalData?: SurvivalAnalysis
): Promise<IntelligenceReport> {
    const orchestrator = getOrchestrator();
    return orchestrator.generateIntelligenceReport(
        flowData,
        onchainData,
        marketData,
        opportunityData,
        narrativeData,
        smartMoneyData,
        survivalData
    );
}

// Re-export Arkham Intelligence Service
export { ArkhamIntelligenceService, arkhamService } from './services/arkhamIntelligenceService';
export type {
    ArkhamAddressInfo,
    ArkhamTokenBalance,
    ArkhamAlert,
    ArkhamEntity,
    ArkhamWhaleAlert,
} from './services/arkhamIntelligenceService';

// Export core components
export { generateIntelligenceReport } from './core/intelligenceReportGenerator';
export { AnalysisAggregator } from './core/analysisAggregator';
export { calculateDefaultRanking } from './core/rankingCalculator';

// Re-export types for consumers
export type {
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis,
    IntelligenceRanking,
    IntelligenceReport,
    AttentionVelocityAnalysis,
    ConvictionScoreAnalysis,
    SignalConsensusResult,
    AgentConfig
};
