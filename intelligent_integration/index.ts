/**
 * @file intelligent_integration/index.ts
 * @desc Barrel file for 9Router Intelligence module
 * @exposes research manager, analysis types, and main entry points
 */

import { ResearchManager } from './researchManager';
import { AnalysisAggregator } from './core/analysisAggregator';
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
    SignalConsensusResult
} from './types/analysisTypes';
import { AgentConfig } from './types/agentTypes';
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
 * Generate default/mock analysis data from a token address
 */
function createDefaultFlowAnalysis(token: string): FlowAnalysis {
    return AnalysisAggregator.generateMockFlowAnalysis({ token });
}

function createDefaultOnchainAnalysis(token: string): OnchainAnalysis {
    return AnalysisAggregator.generateMockOnchainAnalysis({ token });
}

function createDefaultMarketAnalysis(token: string): MarketAnalysis {
    return AnalysisAggregator.generateMockMarketAnalysis({ token });
}

/**
 * Main entry point for token analysis
 * Can be called with just a token address (generates default analysis data internally)
 * or with full analysis data objects for richer reporting.
 */
export async function analyzeToken(
    token: string,
    flowData?: FlowAnalysis,
    onchainData?: OnchainAnalysis,
    marketData?: MarketAnalysis,
    opportunityData?: EarlyOpportunityAnalysis,
    narrativeData?: NarrativeAnalysis,
    smartMoneyData?: SmartMoneyAnalysis,
    survivalData?: SurvivalAnalysis
): Promise<IntelligenceReport> {
    const orchestrator = getOrchestrator();

    // If only token address provided, generate default/mock analysis objects
    // to prevent "Cannot read properties of undefined" errors
    const flow = flowData || createDefaultFlowAnalysis(token);
    const onchain = onchainData || createDefaultOnchainAnalysis(token);
    const market = marketData || createDefaultMarketAnalysis(token);

    return orchestrator.generateIntelligenceReport(
        flow,
        onchain,
        market,
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
    SignalConsensusResult
};
export type { AgentConfig };
