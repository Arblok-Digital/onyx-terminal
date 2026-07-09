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
import { isNvidiaEnabled } from '../models/nvidiaModels';
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
            // 🥇 NVIDIA NIM - Nemotron (PRIMARY - no local server needed)
            {
                name: 'nvidia-nemotron-ultra-550b',
                model: 'nvidia/nemotron-3-ultra-550b-a55b',
                endpoint: getEnv('VITE_NVIDIA_ENDPOINT', 'https://integrate.api.nvidia.com/v1/chat/completions'),
                priority: 1,
                enabled: isNvidiaEnabled(),
                weight: 0.95,
                cacheTTL: 300_000,
                retries: 2,
            },
            {
                name: 'nvidia-nemotron-super-120b',
                model: 'nvidia/nemotron-3-super-120b-a12b',
                endpoint: getEnv('VITE_NVIDIA_ENDPOINT', 'https://integrate.api.nvidia.com/v1/chat/completions'),
                priority: 2,
                enabled: isNvidiaEnabled(),
                weight: 0.9,
                cacheTTL: 300_000,
                retries: 2,
            },
            // 🥈 OpenRouter - Gemma 4 31B (FALLBACK)
            {
                name: 'openrouter-gemma-4-31b',
                model: 'google/gemma-4-31b-it:free',
                endpoint: getEnv('VITE_OPENROUTER_ENDPOINT', 'https://openrouter.ai/api/v1/chat/completions'),
                priority: 3,
                enabled: isOpenRouterEnabled(),
                weight: 0.85,
                cacheTTL: 300_000,
                retries: 2,
            },
            {
                name: 'openrouter-llama-3.3-70b',
                model: 'meta-llama/llama-3.3-70b-instruct:free',
                endpoint: getEnv('VITE_OPENROUTER_ENDPOINT', 'https://openrouter.ai/api/v1/chat/completions'),
                priority: 4,
                enabled: isOpenRouterEnabled(),
                weight: 0.8,
                cacheTTL: 300_000,
                retries: 2,
            },
            // 🥉 9Router - butuh VPS (LAST RESORT)
            {
                name: '9router-gateway',
                model: getEnv('VITE_AI_MODEL', 'auto'),
                endpoint: getEnv('VITE_AI_GATEWAY_URL', 'http://localhost:20128/v1'),
                priority: 5,
                enabled: true,
                weight: 0.75,
                cacheTTL: 300_000,
                retries: 2,
            },
            {
                name: '9router-llama-3.1-70b',
                model: 'llama-3.1-70b',
                endpoint: getEnv('VITE_9ROUTER_LLAMA_ENDPOINT', 'https://api.9router.ai/v1/llama-3.1-70b'),
                priority: 6,
                enabled: true,
                weight: 0.7,
                cacheTTL: 300_000,
                retries: 2,
            },
            {
                name: '9router-mistral-large-2',
                model: 'mistral-large-2',
                endpoint: getEnv('VITE_9ROUTER_MISTRAL_ENDPOINT', 'https://api.9router.ai/v1/mistral-large-2'),
                priority: 7,
                enabled: true,
                weight: 0.65,
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
        // 🥇 NVIDIA NIM - Primary (no local server, always available)
        if (isNvidiaEnabled()) {
            return {
                primaryAgent: 'nvidia-nemotron-ultra-550b',
                reason: 'Using NVIDIA NIM Nemotron Ultra 550B (primary)',
                confidence: 0.95,
                modelUsed: 'nvidia/nemotron-3-ultra-550b-a55b',
                isFallback: false,
            };
        }

        // 🥈 OpenRouter - Fallback
        if (isOpenRouterEnabled()) {
            return {
                primaryAgent: 'openrouter-gemma-4-31b',
                reason: 'Using OpenRouter Gemma 4 31B free (fallback)',
                confidence: 0.9,
                modelUsed: 'google/gemma-4-31b-it:free',
                isFallback: false,
            };
        }

        // 🥉 9Router - Last resort (needs local VPS)
        // Check if 9Router gateway is reachable (non-localhost endpoint means VPS is set up)
        const gatewayUrl = getEnv('VITE_AI_GATEWAY_URL', 'http://localhost:20128/v1');
        const is9RouterAvailable = !gatewayUrl.includes('localhost') && !gatewayUrl.includes('127.0.0.1');
        if (is9RouterAvailable) {
            return {
                primaryAgent: '9router-gateway',
                reason: 'Using 9Router Gateway (needs VPS)',
                confidence: 0.75,
                modelUsed: 'auto',
                isFallback: true,
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