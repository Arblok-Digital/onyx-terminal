/**
 * @file intelligent_integration/index.ts
 * @desc Barrel file for 9Router Intelligence module
 * @exposes research manager, analysis types, and main entry points
 */

import { AgentOrchestrator } from './agentOrchestrator';
import { AnalysisAggregator } from './core/analysisAggregator';
import { Connection } from '@solana/web3.js';
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
let orchestrator: AgentOrchestrator | null = null;

export function initializeOrchestrator(solanaConnection: Connection) {
    orchestrator = new AgentOrchestrator(solanaConnection);
    console.log('[IntelligentIntegration] Orchestrator initialized with on-chain connection');
}

function getOrchestrator(): AgentOrchestrator {
    if (!orchestrator) {
        orchestrator = new AgentOrchestrator();
    }
    return orchestrator;
}

/**
 * Check if real API keys are available
 */
export function hasRealApiKeys(): boolean {
    const heliusKey = import.meta.env.VITE_HELIUS_API_KEY;
    const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    return !!(heliusKey || openRouterKey);
}

/**
 * Main entry point for token analysis
 */
export async function analyzeToken(
    token: string,
    tokenSymbol: string = 'UNKNOWN',
    _flowData?: FlowAnalysis,
    _onchainData?: OnchainAnalysis,
    _marketData?: MarketAnalysis,
    _opportunityData?: EarlyOpportunityAnalysis,
    _narrativeData?: NarrativeAnalysis,
    _smartMoneyData?: SmartMoneyAnalysis,
    _survivalData?: SurvivalAnalysis
): Promise<IntelligenceReport> {
    const orch = getOrchestrator();
    return orch.analyzeToken(token, tokenSymbol, 30);
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
