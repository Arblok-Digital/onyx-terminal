/**
 * @file agentRouter.ts
 * @layer core
 * @desc Simplified Agent Router - uses composition over inheritance.
 *       Wraps AgentOrchestrator and adds routing/fallback logic on top.
 */

import { AgentOrchestrator } from '../agentOrchestrator';
import { IntelligenceError } from './intelligenceErrors';
import type { IntelligenceReport } from '../types/analysisTypes';
import type { AgentConfig } from '../types/agentTypes';
import { isOpenRouterEnabled } from '../models/openRouterModels';
import { getEnv } from '../utils/getEnv';
import { consoleLogger, type AgentLogger } from '../agents/agentUtils';

export interface RoutingDecision {
    primaryAgent: string;
    fallbackAgent?: string;
    reason: string;
    confidence: number;
    modelUsed: string;
    isFallback: boolean;
}

export class AgentRouter {
    private orchestrator: AgentOrchestrator;
    private logger: AgentLogger;
    private agentConfigs: AgentConfig[];
    private fallbackModels: AgentConfig[];

    constructor(logger?: AgentLogger) {
        this.logger = logger ?? consoleLogger;
        this.orchestrator = new AgentOrchestrator({ logger: this.logger });
        this.agentConfigs = this.loadAgentConfigs();
        this.fallbackModels = this.loadFallbackConfigs();
        this.logger.info('AgentRouter initialized (composition mode)');
    }

    /** Get the underlying orchestrator (for access to Helius service, etc.) */
    getOrchestrator(): AgentOrchestrator {
        return this.orchestrator;
    }

    /** Load agent configurations */
    private loadAgentConfigs(): AgentConfig[] {
        return [
            {
                name: '9router-gateway',
                model: getEnv('VITE_AI_MODEL', 'auto'),
                endpoint: getEnv('VITE_AI_GATEWAY_URL', 'http://localhost:20128/v1'),
                priority: 1,
                enabled: true,
                weight: 1,
                cacheTTL: 300_000,
                retries: 2,
            },
            {
                name: '9router-llama-3.1-70b',
                model: 'llama-3.1-70b',
                endpoint: getEnv('VITE_9ROUTER_LLAMA_ENDPOINT', 'https://api.9router.ai/v1/llama-3.1-70b'),
                priority: 2,
                enabled: true,
                weight: 0.95,
                cacheTTL: 300_000,
                retries: 2,
            },
            {
                name: '9router-mistral-large-2',
                model: 'mistral-large-2',
                endpoint: getEnv('VITE_9ROUTER_MISTRAL_ENDPOINT', 'https://api.9router.ai/v1/mistral-large-2'),
                priority: 3,
                enabled: true,
                weight: 0.9,
                cacheTTL: 300_000,
                retries: 2,
            },
            {
                name: 'openrouter-deepseek-r1',
                model: 'deepseek/deepseek-r1:free',
                endpoint: getEnv('VITE_OPENROUTER_ENDPOINT', 'https://openrouter.ai/api/v1/chat/completions'),
                priority: 4,
                enabled: isOpenRouterEnabled(),
                weight: 0.85,
                cacheTTL: 300_000,
                retries: 2,
            },
            {
                name: 'openrouter-llama-3.3-70b',
                model: 'meta-llama/llama-3.3-70b-instruct:free',
                endpoint: getEnv('VITE_OPENROUTER_ENDPOINT', 'https://openrouter.ai/api/v1/chat/completions'),
                priority: 5,
                enabled: isOpenRouterEnabled(),
                weight: 0.8,
                cacheTTL: 300_000,
                retries: 2,
            },
        ];
    }

    /** Load fallback model configurations */
    private loadFallbackConfigs(): AgentConfig[] {
        return [
            {
                name: '9router-arblok',
                model: 'arblok',
                endpoint: `${getEnv('VITE_AI_GATEWAY_URL', 'http://localhost:20128/v1')}/chat/completions`,
                priority: 1,
                enabled: true,
                weight: 1,
                cacheTTL: 300_000,
                retries: 2,
            },
            {
                name: 'huggingface-llama',
                model: 'llama-3.1-70b',
                endpoint: getEnv('VITE_HF_LLAMA_ENDPOINT') ?? 'https://api-inference.huggingface.co/models/9router/llama-3.1-70b',
                priority: 2,
                enabled: true,
                weight: 0.9,
                cacheTTL: 300_000,
                retries: 2,
            },
            {
                name: 'replicate-mistral',
                model: 'mistral-large-2',
                endpoint: getEnv('VITE_REPLICATE_MISTRAL_ENDPOINT') ?? 'https://api.replicate.com/v1/predictions',
                priority: 3,
                enabled: true,
                weight: 0.85,
                cacheTTL: 300_000,
                retries: 2,
            },
        ];
    }

    /** Determine the best agent to use based on current conditions */
    private determineRouting(): RoutingDecision {
        const has9RouterKey = !!getEnv('VITE_AI_GATEWAY_KEY', '');
        if (has9RouterKey) {
            return {
                primaryAgent: '9router-gateway',
                reason: 'Using 9Router Gateway with auto-fallback',
                confidence: 0.95,
                modelUsed: 'auto',
                isFallback: false,
            };
        }

        // Check OpenRouter availability
        if (isOpenRouterEnabled()) {
            return {
                primaryAgent: 'openrouter-deepseek-r1',
                reason: 'Using OpenRouter free models',
                confidence: 0.9,
                modelUsed: 'deepseek/deepseek-r1:free',
                isFallback: false,
            };
        }

        // Fallback to first available model
        const enabledFallbacks = this.fallbackModels.filter(m => m.enabled);
        const bestFallback = enabledFallbacks.length > 0
            ? enabledFallbacks.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))[0]
            : this.fallbackModels[0];

        return {
            primaryAgent: bestFallback.name,
            reason: 'No primary AI available, using fallback model',
            confidence: 0.8,
            modelUsed: bestFallback.model ?? 'unknown',
            isFallback: true,
        };
    }

    /** Main token analysis entry point */
    async analyzeToken(tokenAddress: string, tokenSymbol: string = 'UNKNOWN'): Promise<IntelligenceReport> {
        const routing = this.determineRouting();
        
        this.logger.info(`[AgentRouter] Starting analysis for ${tokenSymbol} (${tokenAddress.slice(0, 8)})`);
        this.logger.info(`[AgentRouter] Using: ${routing.primaryAgent} (${routing.reason})`);

        try {
            // Delegate to orchestrator for full 4-phase analysis
            const report = await this.orchestrator.analyzeToken(tokenAddress, tokenSymbol);
            
            // Add routing metadata
            report.metadata = {
                ...report.metadata,
                routingDecision: routing.reason,
                modelUsed: routing.modelUsed,
                isFallback: routing.isFallback,
                durationMs: report.metadata?.durationMs ?? 0,
                processingSteps: report.metadata?.processingSteps ?? [],
            };

            this.logger.info(`[AgentRouter] Analysis complete in ${report.metadata?.durationMs ?? 0}ms`, {
                rating: report.intelligenceRanking?.rating,
                score: report.intelligenceRanking?.overallScore,
            });

            return report;
        } catch (error) {
            this.logger.error('[AgentRouter] Analysis failed', error);

            // Throw typed error instead of silent mock return
            // Caller can catch and display appropriate error message
            throw new IntelligenceError(
                `Analysis failed for ${tokenSymbol} (${tokenAddress.slice(0, 8)})`,
                'ANALYSIS_FAILED',
                'routing',
                { originalError: error },
            );
        }
    }
}