/**
 * Agent Orchestrator for Onyx Terminal
 * Coordinates multiple AI agents and synthesizes intelligence
 */

import { FlowIntelligenceAgent } from './agents/flowIntelligenceAgent';
import { OnchainAgent } from './agents/onchainAgent';
import { MarketAgent } from './agents/marketAgent';
import { OpportunityAgent } from './agents/opportunityAgent';
import { NarrativeAgent } from './agents/narrativeAgent';
import { SmartMoneyAgent } from './agents/smartMoneyAgent';
import { SurvivalAgent } from './agents/survivalAgent';
import { AMDResearchManager } from './services/amdAIService';
import {
    IntelligenceReport,
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis
} from './types/analysisTypes';

export class AgentOrchestrator {
    protected flowAgent: FlowIntelligenceAgent;
    protected onchainAgent: OnchainAgent;
    protected marketAgent: MarketAgent;
    protected opportunityAgent: OpportunityAgent;
    protected narrativeAgent: NarrativeAgent;
    protected smartMoneyAgent: SmartMoneyAgent;
    protected survivalAgent: SurvivalAgent;
    protected researchManager: AMDResearchManager;
    protected analysisCache: Map<string, { report: IntelligenceReport, timestamp: number }>;
    protected cacheTTL: number = 3600000; // 1 hour

    constructor() {
        this.flowAgent = new FlowIntelligenceAgent();
        this.onchainAgent = new OnchainAgent();
        this.marketAgent = new MarketAgent();
        this.opportunityAgent = new OpportunityAgent();
        this.narrativeAgent = new NarrativeAgent();
        this.smartMoneyAgent = new SmartMoneyAgent();
        this.survivalAgent = new SurvivalAgent();
        this.researchManager = new AMDResearchManager();
        this.analysisCache = new Map();
    }

    /**
     * Analyze a token using all available agents
     */
    async analyzeToken(tokenAddress: string, tokenSymbol: string = 'UNKNOWN', durationMinutes: number = 30): Promise<IntelligenceReport> {
        // Check cache first
        const cachedReport = this.getCachedReport(tokenAddress);
        if (cachedReport) {
            return cachedReport;
        }

        try {
            // Run core agents first (independent)
            const [flowAnalysis, onchainAnalysis, marketAnalysis] = await Promise.all([
                this.flowAgent.analyzeToken(tokenAddress, durationMinutes),
                this.onchainAgent.analyzeToken(tokenAddress),
                this.marketAgent.analyzeToken(tokenAddress)
            ]);

            // Run dependent agents (require results from core agents)
            const [earlyOpportunityAnalysis, narrativeAnalysis, smartMoneyAnalysis, survivalAnalysis] = await Promise.all([
                this.opportunityAgent.analyzeToken(tokenAddress, flowAnalysis, onchainAnalysis, marketAnalysis),
                this.narrativeAgent.analyzeToken(tokenAddress, tokenSymbol, onchainAnalysis, marketAnalysis),
                this.smartMoneyAgent.analyzeToken(tokenAddress, onchainAnalysis, flowAnalysis),
                this.survivalAgent.analyzeToken(tokenAddress, onchainAnalysis, marketAnalysis, flowAnalysis)
            ]);

            // Generate comprehensive intelligence report
            const report = await this.researchManager.generateIntelligenceReport(
                flowAnalysis,
                onchainAnalysis,
                marketAnalysis,
                earlyOpportunityAnalysis,
                narrativeAnalysis,
                smartMoneyAnalysis,
                survivalAnalysis
            );

            // Add metadata
            report.metadata = {
                token: tokenAddress,
                timestamp: new Date().toISOString(),
                dataSources: [
                    'Jupiter Websocket',
                    'Helius API',
                    'Birdeye API',
                    'CoinGecko API',
                    'AMD Cloud AI',
                    'Narrative Intelligence',
                    'Smart Money Database'
                ]
            };

            // Cache the report
            this.cacheReport(tokenAddress, report);

            return report;
        } catch (error) {
            console.error('Error in agent orchestration:', error);
            return this.createErrorReport(tokenAddress, error);
        }
    }

    /**
     * Analyze multiple tokens in batch
     */
    async analyzeMultipleTokens(tokenAddresses: string[], tokenSymbols: string[] = [], durationMinutes: number = 30): Promise<IntelligenceReport[]> {
        return Promise.all(
            tokenAddresses.map((address, index) => this.analyzeToken(address, tokenSymbols[index] || 'UNKNOWN', durationMinutes))
        );
    }

    /**
     * Get cached intelligence report
     */
    private getCachedReport(tokenAddress: string): IntelligenceReport | null {
        const cached = this.analysisCache.get(tokenAddress);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.report;
        }
        return null;
    }

    /**
     * Cache intelligence report
     */
    protected cacheReport(tokenAddress: string, report: IntelligenceReport): void {
        this.analysisCache.set(tokenAddress, {
            report,
            timestamp: Date.now()
        });
    }

    /**
     * Create error report when analysis fails
     */
    protected createErrorReport(tokenAddress: string, error: any): IntelligenceReport {
        return {
            rawResponse: '',
            executiveSummary: `Analysis failed for ${tokenAddress}`,
            keyInsights: [{
                insight: `Error: ${error.message}`,
                confidence: 0,
                category: 'risk'
            }],
            riskAssessment: { 'System Error': 'High' },
            opportunityAssessment: { 'Analysis': 'Failed' },
            patternDetection: 'No patterns detected due to error',
            recommendation: 'Unable to provide recommendation due to analysis failure',
            confidenceScore: 0,
            metadata: {
                token: tokenAddress,
                timestamp: new Date().toISOString(),
                dataSources: []
            }
        };
    }

    /**
     * Clear cache for a specific token
     */
    clearTokenCache(tokenAddress: string): void {
        this.analysisCache.delete(tokenAddress);
    }

    /**
     * Clear all cached reports
     */
    clearAllCache(): void {
        this.analysisCache.clear();
    }

    /**
     * Get current cache size
     */
    getCacheSize(): number {
        return this.analysisCache.size;
    }
}