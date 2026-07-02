/**
 * Agent Orchestrator for Onyx Terminal
 * Coordinates multiple AI agents and synthesizes intelligence
 */

import { injectable } from 'inversify';
import { TOKENS } from './core/diTokens';

// Lazy container getter to avoid circular dependency
const getContainer = () => {
    const { container } = require('./core/inversify.config');
    return container;
};
import { FlowIntelligenceAgent } from './agents/flowIntelligenceAgent';
import { OnchainAgent } from './agents/onchainAgent';
import { MarketAgent } from './agents/marketAgent';
import { OpportunityAgent } from './agents/opportunityAgent';
import { NarrativeAgent } from './agents/narrativeAgent';
import { SmartMoneyAgent } from './agents/smartMoneyAgent';
import { SurvivalAgent } from './agents/survivalAgent';
import { OpenRouterResearchManager } from './services/openRouterService/index';
import { OnyxOnChainService } from './services/onyxOnChainService.js';
import { Connection } from '@solana/web3.js';
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

@injectable()
export class AgentOrchestrator {
    private _flowAgent?: FlowIntelligenceAgent;
    private _onchainAgent?: OnchainAgent;
    private _marketAgent?: MarketAgent;
    private _opportunityAgent?: OpportunityAgent;
    private _narrativeAgent?: NarrativeAgent;
    private _smartMoneyAgent?: SmartMoneyAgent;
    private _survivalAgent?: SurvivalAgent;
    private _researchManager?: OpenRouterResearchManager;
    protected onyxService?: OnyxOnChainService;
    protected analysisCache: Map<string, { report: IntelligenceReport; timestamp: number }>;
    protected cacheTTL: number = 3600000; // 1 hour

    constructor(connection?: Connection) {
        // NO container.get() calls here to avoid circular dependency
        this.analysisCache = new Map();
        if (connection) {
            this.onyxService = new OnyxOnChainService(connection);
            console.log('[AgentOrchestrator] OnyxOnChainService initialized');
        }
    }

    // Lazy getters - resolve agents only when accessed
    protected get flowAgent(): FlowIntelligenceAgent {
        if (!this._flowAgent) {
            this._flowAgent = getContainer().get<FlowIntelligenceAgent>(TOKENS.FlowIntelligenceAgent);
        }
        return this._flowAgent;
    }

    protected get onchainAgent(): OnchainAgent {
        if (!this._onchainAgent) {
            this._onchainAgent = getContainer().get<OnchainAgent>(TOKENS.OnchainAgent);
        }
        return this._onchainAgent;
    }

    protected get marketAgent(): MarketAgent {
        if (!this._marketAgent) {
            this._marketAgent = getContainer().get<MarketAgent>(TOKENS.MarketAgent);
        }
        return this._marketAgent;
    }

    protected get opportunityAgent(): OpportunityAgent {
        if (!this._opportunityAgent) {
            this._opportunityAgent = getContainer().get<OpportunityAgent>(TOKENS.OpportunityAgent);
        }
        return this._opportunityAgent;
    }

    protected get narrativeAgent(): NarrativeAgent {
        if (!this._narrativeAgent) {
            this._narrativeAgent = getContainer().get<NarrativeAgent>(TOKENS.NarrativeAgent);
        }
        return this._narrativeAgent;
    }

    protected get smartMoneyAgent(): SmartMoneyAgent {
        if (!this._smartMoneyAgent) {
            this._smartMoneyAgent = getContainer().get<SmartMoneyAgent>(TOKENS.SmartMoneyAgent);
        }
        return this._smartMoneyAgent;
    }

    protected get survivalAgent(): SurvivalAgent {
        if (!this._survivalAgent) {
            this._survivalAgent = getContainer().get<SurvivalAgent>(TOKENS.SurvivalAgent);
        }
        return this._survivalAgent;
    }

    protected get researchManager(): OpenRouterResearchManager {
        if (!this._researchManager) {
            this._researchManager = getContainer().get<OpenRouterResearchManager>(TOKENS.OpenRouterService);
        }
        return this._researchManager;
    }

    /**
     * Analyze a token using all available agents
     */
    async analyzeToken(
        tokenAddress: string,
        tokenSymbol: string = 'UNKNOWN',
        durationMinutes: number = 30
    ): Promise<IntelligenceReport> {
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
            const [earlyOpportunityAnalysis, narrativeAnalysis, smartMoneyAnalysis, survivalAnalysis] =
                await Promise.all([
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

            // Cache the report
            this.cacheReport(tokenAddress, report);

            return report;
        } catch (error) {
            console.error('Error in agent orchestration:', error);
            return this.createErrorReport(tokenAddress, tokenSymbol, error);
        }
    }

    /**
     * Analyze multiple tokens in batch
     */
    async analyzeMultipleTokens(
        tokenAddresses: string[],
        tokenSymbols: string[] = [],
        durationMinutes: number = 30
    ): Promise<IntelligenceReport[]> {
        return Promise.all(
            tokenAddresses.map((address, index) =>
                this.analyzeToken(address, tokenSymbols[index] || 'UNKNOWN', durationMinutes)
            )
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
    protected createErrorReport(
        tokenAddress: string,
        tokenSymbol: string = 'UNKNOWN',
        _error?: any
    ): IntelligenceReport {
        return {
            id: `error-${tokenAddress}-${Date.now()}`,
            timestamp: Date.now(),
            tokenAddress,
            tokenSymbol,
            flowAnalysis: {
                token: tokenAddress,
                inflow: 0,
                outflow: 0,
                netFlow: 0,
                majorInflows: [],
                majorOutflows: [],
                exchangeFlow: { inflowToExchanges: 0, outflowFromExchanges: 0, netExchangeFlow: 0 },
                anomalousTransactions: []
            },
            onchainAnalysis: {
                token: tokenAddress,
                whaleActivity: { largeTransfers: 0, whaleWallets: 0, concentration: 0 },
                holderGrowth: { newHolders: 0, growthRate: 0 },
                developerActivity: {
                    devWalletTransactions: 0,
                    suspiciousTransfers: 0,
                    devWalletBalance: 0,
                    devWallets: []
                },
                liquidityAnalysis: {
                    liquidityDepth: 0,
                    liquidityChange24h: 0,
                    lockedLiquidity: 0,
                    liquidityConcentration: 0
                },
                rugPullIndicators: {
                    dumpScore: 0,
                    liquidityRemovalScore: 0,
                    devWalletActivityScore: 0,
                    overallRugScore: 0
                },
                riskScore: 0.5,
                contractAnalysis: {
                    age: 0,
                    creator: 'Unknown',
                    mintAuthority: false,
                    freezeAuthority: false,
                    isVerified: false,
                    renounced: false
                }
            },
            marketAnalysis: {
                token: tokenAddress,
                priceTrend: { current: 0, change24h: 0, change7d: 0 },
                volumeAnalysis: { volume24h: 0, volumeChange: 0 },
                liquidityAnalysis: { depth: 0, slippage: 0 },
                volatilityScore: 0,
                marketCap: 0,
                sentimentAnalysis: {
                    sentimentScore: 0,
                    positiveMentions: 0,
                    negativeMentions: 0,
                    neutralMentions: 0,
                    sentimentTrend: 0,
                    source: 'error'
                }
            },
            opportunityAnalysis: {
                token: tokenAddress,
                opportunityScore: 0,
                entryStrategy: { suggestedEntryPrice: 0, entryConfidence: 0, entryTiming: 'N/A' },
                exitStrategy: {
                    suggestedExitPrice: 0,
                    takeProfitLevels: [],
                    stopLoss: 0
                },
                riskRewardRatio: 0,
                predictedPotential: { shortTerm: 0, midTerm: 0, longTerm: 0 },
                discoveryTimestamp: Date.now(),
                validationMetrics: {
                    liquidityCheck: false,
                    holderDistribution: 'healthy',
                    contractSafety: 'unknown',
                    socialVolume: 0
                },
                competitionAnalysis: {
                    marketShare: 0,
                    comparableProjects: [],
                    uniqueAdvantages: []
                }
            },
            narrativeAnalysis: {
                token: tokenAddress,
                narrativeScore: 0,
                trendingTopics: [],
                communitySentiment: { overall: 0, breakdown: { twitter: 0, discord: 0, telegram: 0 } },
                influencerActivity: { totalInfluencers: 0, positiveMentions: 0, negativeMentions: 0, topInfluencers: [] },
                brandHealth: { awareness: 0, trustLevel: 0, communityEngagement: 0 },
                competitivePositioning: {
                    marketSegment: 'Unknown',
                    uniqueSellingPoints: [],
                    threatLevel: 0,
                    competitorMentions: []
                }
            },
            smartMoneyAnalysis: {
                token: tokenAddress,
                smartMoneyScore: 0,
                trackedWallets: [],
                capitalFlows: {
                    inflow24h: 0,
                    outflow24h: 0,
                    netFlow: 0,
                    significantTransactions: []
                },
                accumulationPattern: {
                    isAccumulating: false,
                    accumulationRate: 0,
                    averageEntryPrice: 0,
                    smartMoneyConfidence: 0
                },
                correlationAnalysis: { correlatedTokens: [], marketCorrelation: 0 }
            },
            survivalAnalysis: {
                token: tokenAddress,
                survivalScore: 0,
                liquidityHealth: { ratio: 0, depth: 0, volatility: 0, sustainability: 'critical' },
                holderRetention: { retentionRate: 0, averageHoldingPeriod: 0, churnRate: 0 },
                marketResilience: { priceStability: 0, recoveryRate: 0, crashResistance: 0 },
                riskMetrics: {
                    impermanentLossRisk: 0,
                    liquidationRisk: 0,
                    regulatoryRisk: 0,
                    overallRisk: 'high'
                },
                sustainabilityIndicators: {
                    revenueModel: 'Unknown',
                    tokenEmissionRate: 0,
                    stakingParticipation: 0,
                    treasuryHealth: 0
                },
                timelineForecast: { shortTerm: 'bearish', midTerm: 'bearish', longTerm: 'bearish', confidence: 0 }
            },
            summary: `Analysis failed for ${tokenAddress}`,
            recommendations: ['Unable to provide recommendation due to analysis failure']
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