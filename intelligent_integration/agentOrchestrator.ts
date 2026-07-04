/**
 * Agent Orchestrator for Onyx Terminal
 * Coordinates multiple AI agents and synthesizes intelligence
 */

import { injectable } from 'inversify';
import { TOKENS } from './core/diTokens';
import { CircuitBreaker, CircuitBreakerError } from './core/circuitBreaker';

// Lazy container getter to avoid circular dependency
let _container: any = null;
const getContainer = async () => {
    if (!_container) {
        const mod = await import('./core/inversify.config');
        _container = mod.container;
    }
    return _container;
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

// ── Retry Config ─────────────────────────────────────────

export interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
}

const DEFAULT_RETRY: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
};

/**
 * Execute an async function with exponential backoff + jitter.
 * Throws the last error if all retries are exhausted.
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    label: string,
    config: RetryConfig = DEFAULT_RETRY,
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            // Don't retry circuit breaker rejection (circuit is OPEN)
            if (err instanceof CircuitBreakerError) throw err;

            if (attempt < config.maxRetries) {
                const delay = Math.min(
                    config.baseDelayMs * Math.pow(2, attempt) + Math.random() * 500,
                    config.maxDelayMs,
                );
                console.warn(
                    `[Retry] ${label} attempt ${attempt + 1}/${config.maxRetries + 1} failed, retrying in ${Math.round(delay)}ms`,
                );
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastError;
}

// ── Orchestrator ─────────────────────────────────────────

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
    protected circuitBreaker: CircuitBreaker;

    constructor(connection?: Connection) {
        this.analysisCache = new Map();
        this.circuitBreaker = new CircuitBreaker('AgentOrchestrator', {
            failureThreshold: 5,
            resetTimeoutMs: 30000,
        });

        if (connection) {
            this.onyxService = new OnyxOnChainService(connection);
            console.log('[AgentOrchestrator] OnyxOnChainService initialized');
        }
    }

    // Lazy getters — now async since getContainer() returns a Promise
    protected async getFlowAgent(): Promise<FlowIntelligenceAgent> {
        if (!this._flowAgent) {
            const container = await getContainer();
            this._flowAgent = container.get(TOKENS.FlowIntelligenceAgent) as FlowIntelligenceAgent;
        }
        return this._flowAgent!;
    }

    protected async getOnchainAgent(): Promise<OnchainAgent> {
        if (!this._onchainAgent) {
            const container = await getContainer();
            this._onchainAgent = container.get(TOKENS.OnchainAgent) as OnchainAgent;
        }
        return this._onchainAgent!;
    }

    protected async getMarketAgent(): Promise<MarketAgent> {
        if (!this._marketAgent) {
            const container = await getContainer();
            this._marketAgent = container.get(TOKENS.MarketAgent) as MarketAgent;
        }
        return this._marketAgent!;
    }

    protected async getOpportunityAgent(): Promise<OpportunityAgent> {
        if (!this._opportunityAgent) {
            const container = await getContainer();
            this._opportunityAgent = container.get(TOKENS.OpportunityAgent) as OpportunityAgent;
        }
        return this._opportunityAgent!;
    }

    protected async getNarrativeAgent(): Promise<NarrativeAgent> {
        if (!this._narrativeAgent) {
            const container = await getContainer();
            this._narrativeAgent = container.get(TOKENS.NarrativeAgent) as NarrativeAgent;
        }
        return this._narrativeAgent!;
    }

    protected async getSmartMoneyAgent(): Promise<SmartMoneyAgent> {
        if (!this._smartMoneyAgent) {
            const container = await getContainer();
            this._smartMoneyAgent = container.get(TOKENS.SmartMoneyAgent) as SmartMoneyAgent;
        }
        return this._smartMoneyAgent!;
    }

    protected async getSurvivalAgent(): Promise<SurvivalAgent> {
        if (!this._survivalAgent) {
            const container = await getContainer();
            this._survivalAgent = container.get(TOKENS.SurvivalAgent) as SurvivalAgent;
        }
        return this._survivalAgent!;
    }

    protected async getResearchManager(): Promise<OpenRouterResearchManager> {
        if (!this._researchManager) {
            const container = await getContainer();
            this._researchManager = container.get(TOKENS.OpenRouterService) as OpenRouterResearchManager;
        }
        return this._researchManager!;
    }

    /**
     * Analyze a token using all available agents with retry logic.
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

        // Wrap entire analysis in circuit breaker
        return this.circuitBreaker.call(async () => {
            try {
                // Resolve agents lazily
                const [flowAgent, onchainAgent, marketAgent] = await Promise.all([
                    this.getFlowAgent(),
                    this.getOnchainAgent(),
                    this.getMarketAgent(),
                ]);

                // Core agents (independent) — each with retry
                const [flowAnalysis, onchainAnalysis, marketAnalysis] = await Promise.all([
                    withRetry(() => flowAgent.analyzeToken(tokenAddress, durationMinutes), 'FlowAgent'),
                    withRetry(() => onchainAgent.analyzeToken(tokenAddress), 'OnchainAgent'),
                    withRetry(() => marketAgent.analyzeToken(tokenAddress), 'MarketAgent'),
                ]);

                // Resolve dependent agents
                const [opportunityAgent, narrativeAgent, smartMoneyAgent, survivalAgent] = await Promise.all([
                    this.getOpportunityAgent(),
                    this.getNarrativeAgent(),
                    this.getSmartMoneyAgent(),
                    this.getSurvivalAgent(),
                ]);

                // Dependent agents — each with retry
                const [earlyOpportunityAnalysis, narrativeAnalysis, smartMoneyAnalysis, survivalAnalysis] =
                    await Promise.all([
                        withRetry(
                            () => opportunityAgent.analyzeToken(tokenAddress, flowAnalysis, onchainAnalysis, marketAnalysis),
                            'OpportunityAgent'
                        ),
                        withRetry(
                            () => narrativeAgent.analyzeToken(tokenAddress, tokenSymbol, onchainAnalysis, marketAnalysis),
                            'NarrativeAgent'
                        ),
                        withRetry(
                            () => smartMoneyAgent.analyzeToken(tokenAddress, onchainAnalysis, flowAnalysis),
                            'SmartMoneyAgent'
                        ),
                        withRetry(
                            () => survivalAgent.analyzeToken(tokenAddress, onchainAnalysis, marketAnalysis, flowAnalysis),
                            'SurvivalAgent'
                        ),
                    ]);

                // Resolve research manager
                const researchManager = await this.getResearchManager();

                // Generate final report with retry
                const report = await withRetry(
                    () => researchManager.generateIntelligenceReport(
                        flowAnalysis,
                        onchainAnalysis,
                        marketAnalysis,
                        earlyOpportunityAnalysis,
                        narrativeAnalysis,
                        smartMoneyAnalysis,
                        survivalAnalysis
                    ),
                    'ResearchManager'
                );

                // Cache and return
                this.cacheReport(tokenAddress, report);
                return report;
            } catch (error: any) {
                console.error('[AgentOrchestrator] Analysis failed after retries:', error);
                return this.createErrorReport(tokenAddress, tokenSymbol, error);
            }
        });
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

    private getCachedReport(tokenAddress: string): IntelligenceReport | null {
        const cached = this.analysisCache.get(tokenAddress);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.report;
        }
        return null;
    }

    protected cacheReport(tokenAddress: string, report: IntelligenceReport): void {
        this.analysisCache.set(tokenAddress, {
            report,
            timestamp: Date.now()
        });
    }

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

    clearTokenCache(tokenAddress: string): void {
        this.analysisCache.delete(tokenAddress);
    }

    clearAllCache(): void {
        this.analysisCache.clear();
    }

    getCacheSize(): number {
        return this.analysisCache.size;
    }
}