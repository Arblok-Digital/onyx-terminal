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
import { queryModel, queryOpenRouter } from './queryModel';
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
    private apiKey: string;
    private endpoint: string;
    /** Task-specific model mapping */
    private taskModels: Record<string, string>;
    /** Whether the 9Router Gateway is available as primary */
    private use9Router: boolean;
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

        // 9Router Gateway (OpenAI-compatible endpoint)
        const gatewayUrl = getEnv('VITE_AI_GATEWAY_URL', 'http://localhost:20128/v1');
        const gatewayKey = getEnv('VITE_AI_GATEWAY_KEY', 'arblok');

        this.use9Router = !!gatewayKey;
        this.endpoint = this.use9Router ? `${gatewayUrl}/chat/completions` : '';
        this.apiKey = gatewayKey || getEnv('OPENROUTER_API_KEY', '');

        // Initialize endpoints map
        this.endpoints = new Map([
            ['primary', this.use9Router ? `${gatewayUrl}/chat/completions` : ''],
            ['fallback', this.use9Router ? `${gatewayUrl}/chat/completions` : ''],
            ['last-resort', this.use9Router ? `${gatewayUrl}/chat/completions` : '']
        ]);
        this.currentModel = 'primary';
        this.taskModels = TASK_MODEL_MAP;
        this.parser = new ReportParser();
        // Initialize performance optimizations
        this.cache = new ResponseCache(200, 1800000); // 200 entries, 30 min TTL
        this.deduplicator = new RequestDeduplicator(30000); // 30s dedup timeout
        this.cachingEnabled = true;
    }

    /**
     * Query with caching and deduplication
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
            const response = await queryModel(
                prompt,
                taskType,
                this.endpoint,
                this.apiKey,
                this.taskModels,
                this.currentModel
            );

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
     * Primary: 9Router Gateway → Fallback: OpenRouter (free models)
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
        try {
            console.log('[OpenRouter AI] Generating comprehensive intelligence report...');
            const prompt = buildResearchPrompt(
                flowAnalysis,
                onchainAnalysis,
                marketAnalysis,
                earlyOpportunityAnalysis,
                narrativeAnalysis,
                smartMoneyAnalysis,
                survivalAnalysis
            );

            const response = await this.queryWithCache(
                prompt,
                'intelligence_report',
                this.currentModel
            );

            console.log('[OpenRouter AI] Intelligence report generated successfully');
            return this.parseIntelligenceResponse(
                response,
                flowAnalysis,
                onchainAnalysis,
                marketAnalysis,
                earlyOpportunityAnalysis,
                narrativeAnalysis,
                smartMoneyAnalysis,
                survivalAnalysis
            );
        } catch (error) {
            console.error('[OpenRouter AI] Primary AI model failed:', error);
            return this.handleFallbacks(
                flowAnalysis, onchainAnalysis, marketAnalysis,
                earlyOpportunityAnalysis, narrativeAnalysis,
                smartMoneyAnalysis, survivalAnalysis
            );
        }
    }

    /**
     * Handle fallback chain: primary → fallback → last-resort → openrouter → mock
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

        // Try fallback model
        if (this.endpoints.get('fallback')) {
            try {
                console.log('[OpenRouter AI] Trying fallback AI model...');
                this.currentModel = 'fallback';
                const response = await this.queryWithCache(prompt, 'intelligence_report', this.currentModel);
                return this.parseIntelligenceResponse(
                    response, flowAnalysis, onchainAnalysis, marketAnalysis,
                    earlyOpportunityAnalysis, narrativeAnalysis, smartMoneyAnalysis, survivalAnalysis
                );
            } catch (fallbackError) {
                console.error('[OpenRouter AI] Fallback AI model failed:', fallbackError);
            }
        }

        // Try last-resort model
        if (this.endpoints.get('last-resort')) {
            try {
                console.log('[OpenRouter AI] Trying last-resort AI model...');
                this.currentModel = 'last-resort';
                const response = await this.queryWithCache(prompt, 'intelligence_report', this.currentModel);
                return this.parseIntelligenceResponse(
                    response, flowAnalysis, onchainAnalysis, marketAnalysis,
                    earlyOpportunityAnalysis, narrativeAnalysis, smartMoneyAnalysis, survivalAnalysis
                );
            } catch (lastResortError) {
                console.error('[OpenRouter AI] Last-resort AI model failed:', lastResortError);
            }
        }

        // Try OpenRouter (free models fallback)
        try {
            console.log('[OpenRouter AI] Trying OpenRouter (free models fallback)...');
            this.currentModel = 'openrouter';
            const response = await queryOpenRouter(prompt, this.apiKey);
            // Note: OpenRouter responses are not cached to avoid rate limits
            return this.parseIntelligenceResponse(
                response, flowAnalysis, onchainAnalysis, marketAnalysis,
                earlyOpportunityAnalysis, narrativeAnalysis, smartMoneyAnalysis, survivalAnalysis
            );
        } catch (openRouterError) {
            console.error('[OpenRouter AI] OpenRouter AI model failed:', openRouterError);
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
        return this.use9Router || !!this.apiKey;
    }
}

// Re-export main types and functions for backward compatibility
export { getModelForTask } from './models';
export { getSystemPrompt, TASK_TYPES } from './systemPrompts';
export type { TaskType } from './systemPrompts';