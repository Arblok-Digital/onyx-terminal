/// <reference types="node" />
/**
 * OpenRouter AI Service - Main Orchestrator
 * Refactored into focused modules:
 * - models.ts: Model configuration & task-to-model mapping
 * - systemPrompts.ts: System prompts for each task type
 * - buildPrompts.ts: Prompt building functions
 * - queryModel.ts: API query logic & fallback chain
 */

import {
    IntelligenceReport,
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis
} from '../../types/analysisTypes';
import { TASK_MODEL_MAP, getModelForTask } from './models';
import {
    buildFlowPrompt,
    buildOnchainPrompt,
    buildMarketPrompt,
    buildOpportunityPrompt,
    buildNarrativePrompt,
    buildSmartMoneyPrompt,
    buildSurvivalPrompt,
    buildResearchPrompt
} from './buildPrompts';
import { queryModel, queryOpenRouter, queryNvidia } from './queryModel';
import { ResponseCache } from './cache';
import { RequestDeduplicator } from './requestDeduplicator';
import {
    calculateDefaultRanking as calcDefaultRanking,
    calculateWarningLevel as calcWarningLevel,
    generateMockIntelligenceReport as genMockIntelligenceReport,
    generateMockFlowAnalysis as genMockFlowAnalysis,
    generateMockOnchainAnalysis as genMockOnchainAnalysis,
    generateMockMarketAnalysis as genMockMarketAnalysis,
    generateMockOpportunityAnalysis as genMockOpportunityAnalysis,
    generateMockNarrativeAnalysis as genMockNarrativeAnalysis,
    generateMockSmartMoneyAnalysis as genMockSmartMoneyAnalysis,
    generateMockSurvivalAnalysis as genMockSurvivalAnalysis
} from '../../tests/mocks/mockGenerators';
import { ReportParser } from '../../reportParser';

export class OpenRouterResearchManager {
    private endpoints: Map<string, string>;
    private currentModel: string;
    /** API keys untuk setiap provider, disimpan terpisah */
    private nvidiaKey: string;
    private gatewayKey: string;
    private openRouterKey: string;
    private endpoint: string;
    /** Task-specific model mapping */
    private taskModels: Record<string, string>;
    /** Report parser instance */
    private parser: ReportParser;
    /** Response cache for AI responses */
    private cache: ResponseCache;
    /** Request deduplicator for in-flight requests */
    private deduplicator: RequestDeduplicator;
    /** Whether caching is enabled */
    private cachingEnabled: boolean;

    constructor() {
        // Add getEnv utility function
        const getEnv = (key: string, defaultValue: string): string => {
            // Browser environment (Vite)
            if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
                return (import.meta as any).env[key] || defaultValue;
            }
            // Node.js environment
            if (typeof process !== 'undefined' && (process as any).env) {
                return (process as any).env[key] || defaultValue;
            }
            return defaultValue;
        };

        // ── NVIDIA NIM (Primary AI Provider) ──
        // Free tier: ~40 RPM, prototyping only. Production needs Enterprise license.
        this.nvidiaKey = getEnv('VITE_NVIDIA_API_KEY', '');
        const nvidiaEndpoint = getEnv('VITE_NVIDIA_ENDPOINT', 'https://integrate.api.nvidia.com/v1/chat/completions');
        const hasNvidia = !!this.nvidiaKey;

        // ── 9Router Gateway (Secondary — fallback kalo NVIDIA rate-limited) ──
        // Local gateway: localhost:20128/v1. Perlu VPS 24/7 untuk production.
        const gatewayUrl = getEnv('VITE_AI_GATEWAY_URL', 'http://localhost:20128/v1');
        this.gatewayKey = getEnv('VITE_AI_GATEWAY_KEY', 'arblok');
        const has9Router = !!this.gatewayKey;

        // ── OpenRouter (Last resort fallback — free models) ──
        this.openRouterKey = getEnv('OPENROUTER_API_KEY', '');

        // NVIDIA NIM endpoint
        this.endpoint = hasNvidia ? nvidiaEndpoint : '';

        // Fallback chain priority:
        // 1. NVIDIA NIM (Nemotron 3 Ultra 550B — deep research, 40 RPM)
        // 2. 9Router Gateway (local AI, unlimited, but butuh VPS)
        // 3. OpenRouter (free models, rate limited)
        this.endpoints = new Map([
            ['nvidia', hasNvidia ? nvidiaEndpoint : ''],
            ['9router', has9Router ? `${gatewayUrl}/chat/completions` : ''],
            ['openrouter', this.openRouterKey ? 'https://openrouter.ai/api/v1/chat/completions' : ''],
        ]);

        // Set current model based on availability
        this.currentModel = hasNvidia ? 'nvidia' : (has9Router ? '9router' : 'openrouter');
        this.taskModels = TASK_MODEL_MAP;
        this.parser = new ReportParser();
        // Initialize performance optimizations
        this.cache = new ResponseCache(200, 1800000); // 200 entries, 30 min TTL
        this.deduplicator = new RequestDeduplicator(30000); // 30s dedup timeout
        this.cachingEnabled = true;

        console.log('[OpenRouter AI] Initialized', {
            primary: this.currentModel,
            nvidia: hasNvidia ? '✅ configured (40 RPM)' : '❌ not configured',
            '9router': has9Router ? '✅ configured' : '❌ not configured',
            openRouter: this.openRouterKey ? '✅ configured' : '❌ not configured',
        });
    }

    /**
     * Query with caching and deduplication
     * Routes to the correct provider based on current model:
     * - 'nvidia': Uses queryNvidia() with 40 RPM rate limiter
     * - '9router': Uses queryModel() with 9Router Gateway
     * - 'openrouter': Uses queryOpenRouter() with OpenRouter API
     */
    private async queryWithCache(
        prompt: string,
        taskType: string,
        model: string
    ): Promise<string> {
        // Check cache first
        if (this.cachingEnabled) {
            const cached = this.cache.get<string>(prompt, taskType, model);
            if (cached) {
                return cached;
            }
        }

        // Deduplicate concurrent requests
        return this.deduplicator.dedupe(prompt, taskType, model, async () => {
            let response: string;

            if (model === 'nvidia') {
                // NVIDIA NIM — with 40 RPM rate limiting
                const nvidiaEndpoint = this.endpoints.get('nvidia') || '';
                response = await queryNvidia(
                    prompt,
                    taskType,
                    nvidiaEndpoint,
                    this.nvidiaKey,
                    this.taskModels,
                );
            } else if (model === '9router') {
                // 9Router Gateway — local, unlimited
                const gatewayEndpoint = this.endpoints.get('9router') || '';
                response = await queryModel(
                    prompt,
                    taskType,
                    gatewayEndpoint,
                    this.gatewayKey,
                    this.taskModels,
                    '9router',
                );
            } else {
                // OpenRouter — external API (fallback via queryOpenRouter)
                response = await queryModel(
                    prompt,
                    taskType,
                    this.endpoint,
                    this.openRouterKey,
                    this.taskModels,
                    this.currentModel
                );
            }

            // Store in cache
            if (this.cachingEnabled && response) {
                this.cache.set(prompt, taskType, model, response);
            }

            return response;
        });
    }

    /**
     * Clear all caches and in-flight requests
     */
    clearCache(): void {
        this.cache.clear();
        this.deduplicator.clear();
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            cache: this.cache.getStats(),
            deduplicator: this.deduplicator.getStats()
        };
    }

    /** Parse intelligence response - delegated to ReportParser */
    private parseIntelligenceResponse(
        response: string,
        flowAnalysis: FlowAnalysis,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis,
        earlyOpportunityAnalysis?: EarlyOpportunityAnalysis,
        narrativeAnalysis?: NarrativeAnalysis,
        smartMoneyAnalysis?: SmartMoneyAnalysis,
        survivalAnalysis?: SurvivalAnalysis
    ): IntelligenceReport {
        // Use parser if method exists, otherwise generate mock
        if (typeof (this.parser as any).parseIntelligence === 'function') {
            return (this.parser as any).parseIntelligence(
                response, flowAnalysis, onchainAnalysis, marketAnalysis,
                earlyOpportunityAnalysis, narrativeAnalysis, smartMoneyAnalysis, survivalAnalysis
            );
        }
        return genMockIntelligenceReport(earlyOpportunityAnalysis);
    }

    private parseFlowResponse(response: string, flowData: FlowAnalysis): FlowAnalysis {
        if (typeof (this.parser as any).parseFlow === 'function') {
            return (this.parser as any).parseFlow(response, flowData);
        }
        return genMockFlowAnalysis(flowData);
    }

    private parseOnchainResponse(response: string, onchainData: OnchainAnalysis): OnchainAnalysis {
        if (typeof (this.parser as any).parseOnchain === 'function') {
            return (this.parser as any).parseOnchain(response, onchainData);
        }
        return genMockOnchainAnalysis(onchainData);
    }

    private parseMarketResponse(response: string, marketData: MarketAnalysis): MarketAnalysis {
        if (typeof (this.parser as any).parseMarket === 'function') {
            return (this.parser as any).parseMarket(response, marketData);
        }
        return genMockMarketAnalysis(marketData);
    }

    private parseOpportunityResponse(response: string, opportunityData: EarlyOpportunityAnalysis): EarlyOpportunityAnalysis {
        if (typeof (this.parser as any).parseOpportunity === 'function') {
            return (this.parser as any).parseOpportunity(response, opportunityData);
        }
        return genMockOpportunityAnalysis(opportunityData);
    }

    private parseNarrativeResponse(response: string, narrativeData: NarrativeAnalysis): NarrativeAnalysis {
        if (typeof (this.parser as any).parseNarrative === 'function') {
            return (this.parser as any).parseNarrative(response, narrativeData);
        }
        return genMockNarrativeAnalysis(narrativeData);
    }

    private parseSmartMoneyResponse(response: string, smartMoneyData: SmartMoneyAnalysis): SmartMoneyAnalysis {
        if (typeof (this.parser as any).parseSmartMoney === 'function') {
            return (this.parser as any).parseSmartMoney(response, smartMoneyData);
        }
        return genMockSmartMoneyAnalysis(smartMoneyData);
    }

    private parseSurvivalResponse(response: string, survivalData: SurvivalAnalysis): SurvivalAnalysis {
        if (typeof (this.parser as any).parseSurvival === 'function') {
            return (this.parser as any).parseSurvival(response, survivalData);
        }
        return genMockSurvivalAnalysis(survivalData);
    }

    /**
     * Generate comprehensive intelligence report from multiple data sources
     * Primary: NVIDIA NIM (Nemotron 3 Ultra 550B) → 9Router Gateway → OpenRouter (free models)
     */
    async generateIntelligenceReport(
        flowAnalysis: FlowAnalysis,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis,
        earlyOpportunityAnalysis?: EarlyOpportunityAnalysis,
        narrativeAnalysis?: NarrativeAnalysis,
        smartMoneyAnalysis?: SmartMoneyAnalysis,
        survivalAnalysis?: SurvivalAnalysis
    ): Promise<IntelligenceReport> {
        // Try NVIDIA NIM first (primary provider)
        if (this.endpoints.get('nvidia')) {
            try {
                console.log('[OpenRouter AI] Generating intelligence report with NVIDIA NIM...');
                this.currentModel = 'nvidia';
                const prompt = buildResearchPrompt(
                    flowAnalysis, onchainAnalysis, marketAnalysis,
                    earlyOpportunityAnalysis, narrativeAnalysis,
                    smartMoneyAnalysis, survivalAnalysis
                );

                const response = await this.queryWithCache(
                    prompt,
                    'intelligence_report',
                    'nvidia'
                );

                console.log('[OpenRouter AI] Intelligence report generated with NVIDIA NIM');
                return this.parseIntelligenceResponse(
                    response, flowAnalysis, onchainAnalysis, marketAnalysis,
                    earlyOpportunityAnalysis, narrativeAnalysis,
                    smartMoneyAnalysis, survivalAnalysis
                );
            } catch (nvidiaError) {
                console.error('[OpenRouter AI] NVIDIA NIM failed:', nvidiaError);
                // Fall through to 9Router
            }
        }

        // Fallback: 9Router Gateway (kalo NVIDIA rate-limited atau error)
        try {
            console.log('[OpenRouter AI] Generating intelligence report with 9Router Gateway...');
            this.currentModel = '9router';
            const prompt = buildResearchPrompt(
                flowAnalysis, onchainAnalysis, marketAnalysis,
                earlyOpportunityAnalysis, narrativeAnalysis,
                smartMoneyAnalysis, survivalAnalysis
            );

            const response = await this.queryWithCache(
                prompt,
                'intelligence_report',
                '9router'
            );

            console.log('[OpenRouter AI] Intelligence report generated with 9Router Gateway');
            return this.parseIntelligenceResponse(
                response, flowAnalysis, onchainAnalysis, marketAnalysis,
                earlyOpportunityAnalysis, narrativeAnalysis,
                smartMoneyAnalysis, survivalAnalysis
            );
        } catch (error) {
            console.error('[OpenRouter AI] 9Router Gateway failed:', error);
            return this.handleFallbacks(
                flowAnalysis, onchainAnalysis, marketAnalysis,
                earlyOpportunityAnalysis, narrativeAnalysis,
                smartMoneyAnalysis, survivalAnalysis
            );
        }
    }

    /**
     * Handle fallback chain: OpenRouter → mock
     * 9Router sudah dicoba di generateIntelligenceReport(), jadi skip di sini.
     */
    private async handleFallbacks(
        flowAnalysis: FlowAnalysis,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis,
        earlyOpportunityAnalysis?: EarlyOpportunityAnalysis,
        narrativeAnalysis?: NarrativeAnalysis,
        smartMoneyAnalysis?: SmartMoneyAnalysis,
        survivalAnalysis?: SurvivalAnalysis
    ): Promise<IntelligenceReport> {
        const prompt = buildResearchPrompt(
            flowAnalysis, onchainAnalysis, marketAnalysis,
            earlyOpportunityAnalysis, narrativeAnalysis,
            smartMoneyAnalysis, survivalAnalysis
        );

        // Try OpenRouter (free models fallback — last resort)
        if (this.endpoints.get('openrouter')) {
            try {
                console.log('[OpenRouter AI] Trying OpenRouter (free models fallback)...');
                this.currentModel = 'openrouter';
                const response = await queryOpenRouter(prompt, this.openRouterKey);
                return this.parseIntelligenceResponse(
                    response, flowAnalysis, onchainAnalysis, marketAnalysis,
                    earlyOpportunityAnalysis, narrativeAnalysis, smartMoneyAnalysis, survivalAnalysis
                );
            } catch (openRouterError) {
                console.error('[OpenRouter AI] OpenRouter fallback failed:', openRouterError);
            }
        }

        // If all AI endpoints fail, return a mock response
        console.warn('[OpenRouter AI] All AI endpoints failed. Returning mock intelligence report.');
        return genMockIntelligenceReport(earlyOpportunityAnalysis);
    }

    /**
     * Generate flow intelligence analysis
     */
    async generateFlowIntelligence(flowData: FlowAnalysis): Promise<FlowAnalysis> {
        try {
            const prompt = buildFlowPrompt(flowData);
            const response = await this.queryWithCache(prompt, 'flow_analysis', this.currentModel);
            return this.parseFlowResponse(response, flowData);
        } catch (error) {
            console.error('[OpenRouter AI] Flow intelligence analysis failed:', error);
            return genMockFlowAnalysis(flowData);
        }
    }

    /**
     * Generate onchain intelligence analysis
     */
    async generateOnchainIntelligence(onchainData: OnchainAnalysis): Promise<OnchainAnalysis> {
        try {
            const prompt = buildOnchainPrompt(onchainData);
            const response = await this.queryWithCache(prompt, 'onchain_analysis', this.currentModel);
            return this.parseOnchainResponse(response, onchainData);
        } catch (error) {
            console.error('[OpenRouter AI] Onchain intelligence analysis failed:', error);
            return genMockOnchainAnalysis(onchainData);
        }
    }

    /**
     * Generate market intelligence analysis
     */
    async generateMarketIntelligence(marketData: MarketAnalysis): Promise<MarketAnalysis> {
        try {
            const prompt = buildMarketPrompt(marketData);
            const response = await this.queryWithCache(prompt, 'market_analysis', this.currentModel);
            return this.parseMarketResponse(response, marketData);
        } catch (error) {
            console.error('[OpenRouter AI] Market intelligence analysis failed:', error);
            return genMockMarketAnalysis(marketData);
        }
    }

    /**
     * Generate opportunity intelligence analysis
     */
    async generateOpportunityIntelligence(opportunityData: EarlyOpportunityAnalysis): Promise<EarlyOpportunityAnalysis> {
        try {
            const prompt = buildOpportunityPrompt(opportunityData);
            const response = await this.queryWithCache(prompt, 'pattern_detection', this.currentModel);
            return this.parseOpportunityResponse(response, opportunityData);
        } catch (error) {
            console.error('[OpenRouter AI] Opportunity intelligence analysis failed:', error);
            return genMockOpportunityAnalysis(opportunityData);
        }
    }

    /**
     * Generate narrative intelligence analysis
     */
    async generateNarrativeIntelligence(narrativeData: NarrativeAnalysis): Promise<NarrativeAnalysis> {
        try {
            const prompt = buildNarrativePrompt(narrativeData);
            const response = await this.queryWithCache(prompt, 'narrative_analysis', this.currentModel);
            return this.parseNarrativeResponse(response, narrativeData);
        } catch (error) {
            console.error('[OpenRouter AI] Narrative intelligence analysis failed:', error);
            return genMockNarrativeAnalysis(narrativeData);
        }
    }

    /**
     * Generate smart money intelligence analysis
     */
    async generateSmartMoneyIntelligence(smartMoneyData: SmartMoneyAnalysis): Promise<SmartMoneyAnalysis> {
        try {
            const prompt = buildSmartMoneyPrompt(smartMoneyData);
            const response = await this.queryWithCache(prompt, 'smart_money_analysis', this.currentModel);
            return this.parseSmartMoneyResponse(response, smartMoneyData);
        } catch (error) {
            console.error('[OpenRouter AI] Smart money intelligence analysis failed:', error);
            return genMockSmartMoneyAnalysis(smartMoneyData);
        }
    }

    /**
     * Generate survival intelligence analysis
     */
    async generateSurvivalIntelligence(survivalData: SurvivalAnalysis): Promise<SurvivalAnalysis> {
        try {
            const prompt = buildSurvivalPrompt(survivalData);
            const response = await this.queryWithCache(prompt, 'survival_analysis', this.currentModel);
            return this.parseSurvivalResponse(response, survivalData);
        } catch (error) {
            console.error('[OpenRouter AI] Survival intelligence analysis failed:', error);
            return genMockSurvivalAnalysis(survivalData);
        }
    }

    /**
     * Check if real API keys are available
     */
    hasRealApiKeys(): boolean {
        return !!(this.nvidiaKey || this.gatewayKey || this.openRouterKey);
    }
}

// Re-export main types and functions for backward compatibility
export { getModelForTask } from './models';
export { getSystemPrompt, TASK_TYPES } from './systemPrompts';
export type { TaskType } from './systemPrompts';