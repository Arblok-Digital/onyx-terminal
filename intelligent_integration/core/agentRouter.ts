/**
 * Agent Router for Onyx Terminal V3 Architecture
 * Intelligent routing system with fallback mechanism and signal consensus
 */
import { AgentOrchestrator } from '../agentOrchestrator';
import {
    IntelligenceReport,
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis,
    IntelligenceRanking,
    AttentionVelocityAnalysis,
    ConvictionScoreAnalysis,
    SignalConsensusResult
} from '../types/analysisTypes';
import { AgentConfig } from '../types/agentTypes';
import {
    OPENROUTER_MODELS,
    OPENROUTER_TASK_CONFIG,
    OpenRouterTask,
    isOpenRouterEnabled,
    getOpenRouterApiKey
} from '../models/openRouterModels';
import { getOpenRouterProvider } from './openRouterProvider';
import { getEnv } from '../utils/getEnv';
import { Logger } from './logger';
import { injectable, inject } from 'inversify';
import { TOKENS as TYPES } from './diTokens';

export interface RoutingDecision {
    primaryAgent: string;
    fallbackAgent?: string;
    reason: string;
    confidence: number;
    modelUsed: string;
    isFallback: boolean;
}

export interface FallbackStatus {
    currentModel: string;
    fallbackTriggered: boolean;
    fallbackReason: string;
    fallbackHistory: Array<{
        timestamp: string;
        fromModel: string;
        toModel: string;
        reason: string;
    }>;
}

@injectable()
export class AgentRouter extends AgentOrchestrator {
    private agentConfigs: AgentConfig[];
    private fallbackModels: AgentConfig[];
    private currentFallbackStatus: FallbackStatus;
    private signalConsensusEnabled: boolean = true;

    constructor(@inject(TYPES.Logger) private logger: Logger) {
        super();
        this.agentConfigs = this.loadAgentConfigs();
        this.fallbackModels = this.loadFallbackConfigs();
        this.currentFallbackStatus = {
            currentModel: '9router-gateway',
            fallbackTriggered: false,
            fallbackReason: '',
            fallbackHistory: []
        };
        this.logger.info('AgentRouter initialized');
    }


    /**
     * Load agent configurations
     * Priority: 9Router Gateway > 9Router Cloud > Fallback
     */
    private loadAgentConfigs(): AgentConfig[] {
        // In production, this would load from config file
        return [
            // === 9Router Gateway (Primary - Free) ===
            {
                name: '9router-gateway',
                model: getEnv('VITE_AI_MODEL', 'auto'),
                endpoint: getEnv('VITE_AI_GATEWAY_URL', 'http://localhost:20128/v1'),
                priority: 1,
                enabled: true
            },
            // === 9Router Cloud (Production) ===
            {
                name: '9router-llama-3.1-70b',
                model: 'llama-3.1-70b',
                endpoint: getEnv('VITE_9ROUTER_LLAMA_ENDPOINT', 'https://api.9router.ai/v1/llama-3.1-70b'),
                priority: 2,
                enabled: true
            },
            {
                name: '9router-mistral-large-2',
                model: 'mistral-large-2',
                endpoint: getEnv('VITE_9ROUTER_MISTRAL_ENDPOINT', 'https://api.9router.ai/v1/mistral-large-2'),
                priority: 3,
                enabled: true
            },
            // === OpenRouter (Fallback AI - Free Models) ===
            // DeepSeek R1 free - strong reasoning for report synthesis
            {
                name: 'openrouter-deepseek-r1',
                model: 'deepseek/deepseek-r1:free',
                endpoint: getEnv('VITE_OPENROUTER_ENDPOINT', 'https://openrouter.ai/api/v1/chat/completions'),
                priority: 4,
                enabled: isOpenRouterEnabled()
            },
            // Llama 3.3 70B free - backup for report/general tasks
            {
                name: 'openrouter-llama-3.3-70b',
                model: 'meta-llama/llama-3.3-70b-instruct:free',
                endpoint: getEnv('VITE_OPENROUTER_ENDPOINT', 'https://openrouter.ai/api/v1/chat/completions'),
                priority: 5,
                enabled: isOpenRouterEnabled()
            },
            // Mistral 7B free - fast for attention velocity
            {
                name: 'openrouter-mistral-7b',
                model: 'mistralai/mistral-7b-instruct:free',
                endpoint: getEnv('VITE_OPENROUTER_ENDPOINT', 'https://openrouter.ai/api/v1/chat/completions'),
                priority: 6,
                enabled: isOpenRouterEnabled()
            },
            // Qwen 2.5 7B free - numeric precision for conviction
            {
                name: 'openrouter-qwen-2.5-7b',
                model: 'qwen/qwen-2.5-7b-instruct:free',
                endpoint: getEnv('VITE_OPENROUTER_ENDPOINT', 'https://openrouter.ai/api/v1/chat/completions'),
                priority: 7,
                enabled: isOpenRouterEnabled()
            }
        ];
    }

    /**
     * Load fallback model configurations
     * 9Router with "arblok" combo is the primary fallback
     */
    private loadFallbackConfigs(): AgentConfig[] {
        // In production, this would load from config file
        const gatewayUrl = getEnv('VITE_AI_GATEWAY_URL', 'http://localhost:20128/v1');

        return [
            // === 9Router with "arblok" combo (Primary fallback) ===
            {
                name: '9router-arblok',
                model: 'arblok', // Use the pre-configured combo
                endpoint: `${gatewayUrl}/chat/completions`,
                priority: 1,
                enabled: true
            },
            // === Existing Fallbacks (as backup) ===
            {
                name: 'huggingface-llama',
                model: 'llama-3.1-70b',
                endpoint: getEnv('VITE_HF_LLAMA_ENDPOINT') ?? 'https://api-inference.huggingface.co/models/9router/llama-3.1-70b',
                priority: 2,
                enabled: true
            },
            {
                name: 'replicate-mistral',
                model: 'mistral-large-2',
                endpoint: getEnv('VITE_REPLICATE_MISTRAL_ENDPOINT') ?? 'https://api.replicate.com/v1/predictions',
                priority: 3,
                enabled: true
            },
            {
                name: 'local-model',
                model: 'local-llama',
                endpoint: 'http://localhost:11434/api/generate',
                priority: 4,
                enabled: true
            }
        ];
    }

    /**
     * Enhanced token analysis with routing and fallback
     */
    async analyzeToken(tokenAddress: string, tokenSymbol: string = 'UNKNOWN', durationMinutes: number = 30): Promise<IntelligenceReport> {
        // First, determine the best agent to use
        const routingDecision = await this.determineRouting(tokenAddress);

        // Update fallback status
        this.updateFallbackStatus(routingDecision);

        try {
            // Run core analysis with routing
            const [flowAnalysis, onchainAnalysis, marketAnalysis] = await this.runCoreAnalysisWithRouting(
                tokenAddress,
                durationMinutes,
                routingDecision
            );

            // Run dependent analysis
            const [earlyOpportunityAnalysis, narrativeAnalysis, smartMoneyAnalysis, survivalAnalysis] =
                await this.runDependentAnalysisWithRouting(
                    tokenAddress,
                    tokenSymbol,
                    flowAnalysis,
                    onchainAnalysis,
                    marketAnalysis,
                    routingDecision
                );

            // Generate attention velocity and conviction score
            const [attentionVelocity, convictionScore] = await Promise.all([
                this.analyzeAttentionVelocity(tokenAddress, durationMinutes, routingDecision),
                this.analyzeConvictionScore(tokenAddress, onchainAnalysis, routingDecision)
            ]);

            // Apply signal consensus
            const consensusResult = this.applySignalConsensus(
                flowAnalysis,
                onchainAnalysis,
                marketAnalysis,
                earlyOpportunityAnalysis,
                narrativeAnalysis,
                smartMoneyAnalysis,
                survivalAnalysis,
                attentionVelocity,
                convictionScore
            );

            // Generate comprehensive intelligence report
            const report = await this.generateEnhancedIntelligenceReport(
                flowAnalysis,
                onchainAnalysis,
                marketAnalysis,
                earlyOpportunityAnalysis,
                narrativeAnalysis,
                smartMoneyAnalysis,
                survivalAnalysis,
                attentionVelocity,
                convictionScore,
                consensusResult,
                routingDecision
            );

            // Cache the report
            this.cacheReport(tokenAddress, report);

            return report;

        } catch (error) {
            console.error('Error in agent routing:', error);
            return this.createErrorReport(tokenAddress, error, routingDecision);
        }
    }

    /**
     * Determine the best agent to use based on current conditions
     * Priority: 9Router Gateway > 9Router Cloud > Fallback
     */
    private async determineRouting(tokenAddress: string): Promise<RoutingDecision> {
        // Priority 1: 9Router Gateway (free, auto-fallback models)
        const has9RouterKey = !!getEnv('VITE_AI_GATEWAY_KEY', '');
        if (has9RouterKey) {
            return {
                primaryAgent: '9router-gateway',
                reason: 'Using 9Router Gateway with auto-fallback (DeepSeek v4 Flash / Mistral Large / GPT OSS 120b)',
                confidence: 0.95,
                modelUsed: 'auto',
                isFallback: false
            };
        }

        // Priority 2: 9Router Cloud (when available)
        const routerAvailable = await this.check9RouterAvailability();

        if (routerAvailable) {
            // Use primary 9Router model
            return {
                primaryAgent: '9router-llama-3.1-70b',
                reason: '9Router Cloud available and operational',
                confidence: 0.95,
                modelUsed: 'llama-3.1-70b',
                isFallback: false
            };
        }

        // Priority 3: OpenRouter (free models fallback)
        if (isOpenRouterEnabled()) {
            const provider = getOpenRouterProvider();
            if (provider.isAvailable()) {
                return {
                    primaryAgent: 'openrouter-deepseek-r1',
                    reason: 'Using OpenRouter free models (DeepSeek R1 / Llama 3.3 70B / Mistral 7B / Qwen 2.5 7B)',
                    confidence: 0.9,
                    modelUsed: 'deepseek/deepseek-r1:free',
                    isFallback: false
                };
            }
        }

        // Priority 4: Fallback options
        const bestFallback = this.fallbackModels
            .filter(model => model.enabled)
            .sort((a, b) => a.priority - b.priority)[0];

        return {
            primaryAgent: bestFallback.name,
            reason: 'No primary AI available, using fallback model',
            confidence: 0.8,
            modelUsed: bestFallback.model,
            isFallback: true
        };
    }

    /**
     * Check 9Router Cloud availability
     */
    private async check9RouterAvailability(): Promise<boolean> {
        try {
            // In production, this would ping the actual 9Router endpoints
            const primaryConfig = this.agentConfigs.find(c => c.name === '9router-llama-3.1-70b');
            if (!primaryConfig || !primaryConfig.enabled) return false;

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${primaryConfig.endpoint}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getEnv('VITE_9ROUTER_API_KEY', '')}`
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            console.warn('9Router Cloud availability check failed:', error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    /**
     * Update fallback status
     */
    private updateFallbackStatus(routingDecision: RoutingDecision): void {
        if (routingDecision.isFallback && !this.currentFallbackStatus.fallbackTriggered) {
            this.currentFallbackStatus = {
                currentModel: routingDecision.primaryAgent,
                fallbackTriggered: true,
                fallbackReason: routingDecision.reason,
                fallbackHistory: [
                    ...this.currentFallbackStatus.fallbackHistory,
                    {
                        timestamp: new Date().toISOString(),
                        fromModel: this.currentFallbackStatus.currentModel,
                        toModel: routingDecision.primaryAgent,
                        reason: routingDecision.reason
                    }
                ]
            };
        } else if (!routingDecision.isFallback) {
            this.currentFallbackStatus = {
                currentModel: routingDecision.primaryAgent,
                fallbackTriggered: false,
                fallbackReason: '',
                fallbackHistory: this.currentFallbackStatus.fallbackHistory
            };
        }
    }

    /**
     * Run core analysis with routing
     */
    private async runCoreAnalysisWithRouting(
        tokenAddress: string,
        durationMinutes: number,
        routingDecision: RoutingDecision
    ): Promise<[FlowAnalysis, OnchainAnalysis, MarketAnalysis]> {
        // Get the appropriate agent config
        const agentConfig = this.getAgentConfig(routingDecision.primaryAgent);

        // Run core agents with the selected model
        return Promise.all([
            this.flowAgent.analyzeToken(tokenAddress, durationMinutes),
            this.onchainAgent.analyzeToken(tokenAddress),
            this.marketAgent.analyzeToken(tokenAddress)
        ]);
    }

    /**
     * Run dependent analysis with routing
     */
    private async runDependentAnalysisWithRouting(
        tokenAddress: string,
        tokenSymbol: string,
        flowAnalysis: FlowAnalysis,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis,
        routingDecision: RoutingDecision
    ): Promise<[EarlyOpportunityAnalysis, NarrativeAnalysis, SmartMoneyAnalysis, SurvivalAnalysis]> {
        // Get the appropriate agent config
        const agentConfig = this.getAgentConfig(routingDecision.primaryAgent);

        return Promise.all([
            this.opportunityAgent.analyzeToken(
                tokenAddress,
                flowAnalysis,
                onchainAnalysis,
                marketAnalysis
            ),
            this.narrativeAgent.analyzeToken(
                tokenAddress,
                tokenSymbol,
                onchainAnalysis,
                marketAnalysis
            ),
            this.smartMoneyAgent.analyzeToken(
                tokenAddress,
                onchainAnalysis,
                flowAnalysis
            ),
            this.survivalAgent.analyzeToken(
                tokenAddress,
                onchainAnalysis,
                marketAnalysis,
                flowAnalysis
            )
        ]);
    }

    /**
     * Get agent configuration
     */
    private getAgentConfig(agentName: string): AgentConfig {
        const allConfigs = [...this.agentConfigs, ...this.fallbackModels];
        const config = allConfigs.find(c => c.name === agentName);
        if (!config) {
            throw new Error(`Agent configuration not found: ${agentName}`);
        }
        return config;
    }

    /**
     * Analyze attention velocity for a token
     */
    private async analyzeAttentionVelocity(
        tokenAddress: string,
        durationMinutes: number,
        routingDecision: RoutingDecision
    ): Promise<AttentionVelocityAnalysis> {
        const agentConfig = this.getAgentConfig(routingDecision.primaryAgent);

        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(agentConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getApiKey(agentConfig)}`
                },
                body: JSON.stringify({
                    model: agentConfig.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert crypto market analyst specializing in attention velocity analysis.'
                        },
                        {
                            role: 'user',
                            content: `Analyze the attention velocity for token ${tokenAddress} over the last ${durationMinutes} minutes.
                            Provide:
                            1. Attention velocity score (0-100)
                            2. Velocity trend (INCREASING, STABLE, DECREASING)
                            3. Evidence supporting the analysis
                            4. Confidence score (0-1)

                            Consider:
                            - Social media mentions growth rate
                            - Trading volume growth
                            - New wallet growth rate
                            - Price momentum
                            - Time window: ${durationMinutes} minutes`
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.3
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const result = await response.json();
            return this.parseAttentionVelocityResponse(result, tokenAddress, durationMinutes);

        } catch (error) {
            console.error('Error analyzing attention velocity:', error instanceof Error ? error.message : String(error));
            return this.createDefaultAttentionVelocity(tokenAddress, durationMinutes);
        }
    }

    /**
     * Parse attention velocity response from AI model
     */
    private parseAttentionVelocityResponse(
        response: any,
        tokenAddress: string,
        durationMinutes: number
    ): AttentionVelocityAnalysis {
        try {
            // Extract data from the response
            const content = response.choices?.[0]?.message?.content || '';

            // Simple parsing - in production this would be more robust
            const velocityMatch = content.match(/attention velocity score.*?(\d+)/i);
            const trendMatch = content.match(/velocity trend.*?(increasing|stable|decreasing)/i);
            const confidenceMatch = content.match(/confidence.*?(\d+\.?\d*)/i);

            return {
                token: tokenAddress,
                attentionVelocity: velocityMatch ? parseInt(velocityMatch[1]) : 50,
                velocityTrend: trendMatch ? trendMatch[1].toUpperCase() as 'INCREASING' | 'STABLE' | 'DECREASING' : 'STABLE',
                timeWindow: durationMinutes,
                evidence: {
                    socialMediaMentions: this.extractNumberFromText(content, 'social media mentions'),
                    tradingVolumeGrowth: this.extractNumberFromText(content, 'trading volume growth'),
                    walletGrowthRate: this.extractNumberFromText(content, 'wallet growth rate'),
                    priceMomentum: this.extractNumberFromText(content, 'price momentum')
                },
                confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7
            };
        } catch (error) {
            console.error('Error parsing attention velocity response:', error);
            return this.createDefaultAttentionVelocity(tokenAddress, durationMinutes);
        }
    }

    /**
     * Extract number from text response
     */
    private extractNumberFromText(text: string, keyword: string): number {
        const regex = new RegExp(`${keyword}.*?(\\d+\\.?\\d*)`, 'i');
        const match = text.match(regex);
        return match ? parseFloat(match[1]) : 0;
    }

    /**
     * Create default attention velocity analysis
     */
    private createDefaultAttentionVelocity(
        tokenAddress: string,
        durationMinutes: number
    ): AttentionVelocityAnalysis {
        return {
            token: tokenAddress,
            attentionVelocity: 50,
            velocityTrend: 'STABLE',
            timeWindow: durationMinutes,
            evidence: {
                socialMediaMentions: 0,
                tradingVolumeGrowth: 0,
                walletGrowthRate: 0,
                priceMomentum: 0
            },
            confidence: 0.5
        };
    }

    /**
     * Analyze conviction score for a token
     */
    private async analyzeConvictionScore(
        tokenAddress: string,
        onchainAnalysis: OnchainAnalysis,
        routingDecision: RoutingDecision
    ): Promise<ConvictionScoreAnalysis> {
        const agentConfig = this.getAgentConfig(routingDecision.primaryAgent);

        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(agentConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getApiKey(agentConfig)}`
                },
                body: JSON.stringify({
                    model: agentConfig.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert crypto market analyst specializing in conviction score analysis.'
                        },
                        {
                            role: 'user',
                            content: `Analyze the conviction score for token ${tokenAddress} based on the following onchain data:
                            ${JSON.stringify(onchainAnalysis, null, 2)}

                            Provide:
                            1. Conviction score (0-100)
                            2. Conviction trend (INCREASING, STABLE, DECREASING)
                            3. Smart money conviction (0-100)
                            4. Retail conviction (0-100)
                            5. Evidence supporting the analysis
                            6. Confidence score (0-1)

                            Consider:
                            - Smart money holdings and entry points
                            - Retail FOMO indicators
                            - Liquidity lock status
                            - Whale activity patterns
                            - Developer wallet behavior`
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.3
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const result = await response.json();
            return this.parseConvictionScoreResponse(result, tokenAddress);

        } catch (error) {
            console.error('Error analyzing conviction score:', error instanceof Error ? error.message : String(error));
            return this.createDefaultConvictionScore(tokenAddress);
        }
    }

    /**
     * Parse conviction score response from AI model
     */
    private parseConvictionScoreResponse(
        response: any,
        tokenAddress: string
    ): ConvictionScoreAnalysis {
        try {
            const content = response.choices?.[0]?.message?.content || '';

            const scoreMatch = content.match(/conviction score.*?(\d+)/i);
            const trendMatch = content.match(/conviction trend.*?(increasing|stable|decreasing)/i);
            const smartMoneyMatch = content.match(/smart money conviction.*?(\d+)/i);
            const retailMatch = content.match(/retail conviction.*?(\d+)/i);
            const confidenceMatch = content.match(/confidence.*?(\d+\.?\d*)/i);

            return {
                token: tokenAddress,
                convictionScore: scoreMatch ? parseInt(scoreMatch[1]) : 50,
                convictionTrend: trendMatch ? trendMatch[1].toUpperCase() as 'INCREASING' | 'STABLE' | 'DECREASING' : 'STABLE',
                smartMoneyConviction: smartMoneyMatch ? parseInt(smartMoneyMatch[1]) : 50,
                retailConviction: retailMatch ? parseInt(retailMatch[1]) : 50,
                evidence: {
                    smartMoneyHoldings: this.extractNumberFromText(content, 'smart money holdings'),
                    smartMoneyEntryPoints: this.extractNumberFromText(content, 'smart money entry points'),
                    retailFomoIndicator: this.extractNumberFromText(content, 'retail fomo'),
                    liquidityLockStatus: content.toLowerCase().includes('liquidity locked')
                },
                confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7
            };
        } catch (error) {
            console.error('Error parsing conviction score response:', error);
            return this.createDefaultConvictionScore(tokenAddress);
        }
    }

    /**
     * Create default conviction score analysis
     */
    private createDefaultConvictionScore(tokenAddress: string): ConvictionScoreAnalysis {
        return {
            token: tokenAddress,
            convictionScore: 50,
            convictionTrend: 'STABLE',
            smartMoneyConviction: 50,
            retailConviction: 50,
            evidence: {
                smartMoneyHoldings: 0,
                smartMoneyEntryPoints: 0,
                retailFomoIndicator: 0,
                liquidityLockStatus: false
            },
            confidence: 0.5
        };
    }

    /**
     * Get API key for the given agent
     */
    private getApiKey(agentConfig: AgentConfig): string {
        switch (agentConfig.name) {
            case '9router-gateway':
            case '9router-arblok':
                return getEnv('VITE_AI_GATEWAY_KEY') ?? 'arblok';
            case '9router-llama-3.1-70b':
            case '9router-mistral-large-2':
                return getEnv('VITE_9ROUTER_API_KEY') ?? '';
            case 'openrouter-deepseek-r1':
            case 'openrouter-llama-3.3-70b':
            case 'openrouter-mistral-7b':
            case 'openrouter-qwen-2.5-7b':
                return getOpenRouterApiKey();
            case 'huggingface-llama':
                return getEnv('VITE_HF_API_KEY') ?? '';
            case 'replicate-mistral':
                return getEnv('VITE_REPLICATE_API_KEY') ?? '';
            default:
                return '';
        }
    }

    /**
     * Apply signal consensus to resolve conflicting signals from different agents
     */
    private applySignalConsensus(
        flowAnalysis: FlowAnalysis,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis,
        earlyOpportunityAnalysis: EarlyOpportunityAnalysis,
        narrativeAnalysis: NarrativeAnalysis,
        smartMoneyAnalysis: SmartMoneyAnalysis,
        survivalAnalysis: SurvivalAnalysis,
        attentionVelocity: AttentionVelocityAnalysis,
        convictionScore: ConvictionScoreAnalysis
    ): SignalConsensusResult {
        if (!this.signalConsensusEnabled) {
            return {
                token: flowAnalysis.token,
                consensusScore: 100,
                conflictingSignals: [],
                resolvedSignals: [],
                finalDecision: 'Signal consensus disabled',
                confidence: 1.0
            };
        }

        // Collect all signals from different agents
        const allSignals = [
            {
                agent: 'flow',
                signal: `Flow pattern: ${flowAnalysis.patterns[0]?.type || 'unknown'}`,
                confidence: flowAnalysis.confidence,
                data: flowAnalysis
            },
            {
                agent: 'onchain',
                signal: `Risk score: ${onchainAnalysis.riskScore}`,
                confidence: onchainAnalysis.riskScore > 0 ? 1 - (onchainAnalysis.riskScore / 100) : 0.5,
                data: onchainAnalysis
            },
            {
                agent: 'market',
                signal: `Volatility: ${marketAnalysis.volatilityScore}`,
                confidence: 1 - (marketAnalysis.volatilityScore / 100),
                data: marketAnalysis
            },
            {
                agent: 'opportunity',
                signal: `EOI: ${earlyOpportunityAnalysis.rating}`,
                confidence: earlyOpportunityAnalysis.confidence,
                data: earlyOpportunityAnalysis
            },
            {
                agent: 'narrative',
                signal: `Narrative: ${narrativeAnalysis.narrative}`,
                confidence: narrativeAnalysis.confidence,
                data: narrativeAnalysis
            },
            {
                agent: 'smart-money',
                signal: `Smart money: ${smartMoneyAnalysis.smartMoneyScore}`,
                confidence: smartMoneyAnalysis.confidence,
                data: smartMoneyAnalysis
            },
            {
                agent: 'survival',
                signal: `Survival: ${survivalAnalysis.estimatedLifespan}`,
                confidence: survivalAnalysis.confidence,
                data: survivalAnalysis
            },
            {
                agent: 'attention',
                signal: `Attention velocity: ${attentionVelocity.attentionVelocity} (${attentionVelocity.velocityTrend})`,
                confidence: attentionVelocity.confidence,
                data: attentionVelocity
            },
            {
                agent: 'conviction',
                signal: `Conviction: ${convictionScore.convictionScore} (${convictionScore.convictionTrend})`,
                confidence: convictionScore.confidence,
                data: convictionScore
            }
        ];

        // Identify conflicting signals
        const conflictingSignals = this.identifyConflicts(allSignals);
        const resolvedSignals = this.resolveConflicts(allSignals, conflictingSignals);

        // Calculate consensus score
        const consensusScore = this.calculateConsensusScore(resolvedSignals);

        // Generate final decision
        const finalDecision = this.generateFinalDecision(resolvedSignals, consensusScore);

        return {
            token: flowAnalysis.token,
            consensusScore,
            conflictingSignals,
            resolvedSignals,
            finalDecision,
            confidence: consensusScore / 100
        };
    }

    /**
     * Identify conflicting signals from different agents
     */
    private identifyConflicts(signals: Array<{
        agent: string;
        signal: string;
        confidence: number;
        data: any
    }>): Array<{
        agent: string;
        signal: string;
        confidence: number;
        resolution: string;
    }> {
        const conflicts: Array<{
            agent: string;
            signal: string;
            confidence: number;
            resolution: string;
        }> = [];

        // Check for conflicts between specific agent pairs
        for (let i = 0; i < signals.length; i++) {
            for (let j = i + 1; j < signals.length; j++) {
                const conflict = this.checkSignalConflict(signals[i], signals[j]);
                if (conflict) {
                    conflicts.push(conflict);
                }
            }
        }

        return conflicts;
    }

    /**
     * Check if two signals conflict with each other
     */
    private checkSignalConflict(
        signal1: { agent: string; signal: string; confidence: number; data: any },
        signal2: { agent: string; signal: string; confidence: number; data: any }
    ): {
        agent: string;
        signal: string;
        confidence: number;
        resolution: string;
    } | null {
        // Example conflict checks - in production these would be more sophisticated

        // Conflict between high risk and high opportunity
        if (signal1.agent === 'onchain' && signal2.agent === 'opportunity') {
            const riskScore = signal1.data.riskScore;
            const opportunityRating = signal2.data.rating;

            if (riskScore > 70 && opportunityRating === 'HIGH OPPORTUNITY') {
                return {
                    agent: `${signal1.agent} vs ${signal2.agent}`,
                    signal: `${signal1.signal} conflicts with ${signal2.signal}`,
                    confidence: Math.min(signal1.confidence, signal2.confidence),
                    resolution: 'High risk typically outweighs high opportunity in early-stage tokens'
                };
            }
        }

        // Conflict between high attention velocity and low smart money conviction
        if (signal1.agent === 'attention' && signal2.agent === 'smart-money') {
            const attentionVelocity = signal1.data.attentionVelocity;
            const smartMoneyScore = signal2.data.smartMoneyScore;

            if (attentionVelocity > 80 && smartMoneyScore < 30) {
                return {
                    agent: `${signal1.agent} vs ${signal2.agent}`,
                    signal: `${signal1.signal} conflicts with ${signal2.signal}`,
                    confidence: Math.min(signal1.confidence, signal2.confidence),
                    resolution: 'High attention with low smart money conviction often indicates retail FOMO rather than genuine opportunity'
                };
            }
        }

        // Conflict between high conviction and low survival probability
        if (signal1.agent === 'conviction' && signal2.agent === 'survival') {
            const convictionScore = signal1.data.convictionScore;
            const survivalProbability = signal2.data.survivalProbability;

            if (convictionScore > 70 && survivalProbability < 0.3) {
                return {
                    agent: `${signal1.agent} vs ${signal2.agent}`,
                    signal: `${signal1.signal} conflicts with ${signal2.signal}`,
                    confidence: Math.min(signal1.confidence, signal2.confidence),
                    resolution: 'High conviction in a low-survival token is typically a warning sign'
                };
            }
        }

        return null;
    }

    /**
     * Resolve conflicts between signals
     */
    private resolveConflicts(
        signals: Array<{ agent: string; signal: string; confidence: number; data: any }>,
        conflicts: Array<{ agent: string; signal: string; confidence: number; resolution: string }>
    ): Array<{ agent: string; signal: string; confidence: number; weight: number }> {
        // Create a map of agent weights based on conflict resolution
        const agentWeights: Record<string, number> = {
            'flow': 1.0,
            'onchain': 1.2, // Onchain data is typically more reliable
            'market': 1.0,
            'opportunity': 0.9,
            'narrative': 0.8,
            'smart-money': 1.3, // Smart money data is highly valuable
            'survival': 1.1,
            'attention': 0.9,
            'conviction': 1.0
        };

        // Adjust weights based on conflicts
        conflicts.forEach(conflict => {
            const [agent1, agent2] = conflict.agent.split(' vs ');

            // Reduce weight for agents involved in conflicts
            if (agentWeights[agent1]) agentWeights[agent1] *= 0.8;
            if (agentWeights[agent2]) agentWeights[agent2] *= 0.8;
        });

        // Create resolved signals with adjusted weights
        return signals.map(signal => ({
            agent: signal.agent,
            signal: signal.signal,
            confidence: signal.confidence,
            weight: agentWeights[signal.agent] || 1.0
        }));
    }

    /**
     * Calculate consensus score from resolved signals
     */
    private calculateConsensusScore(
        resolvedSignals: Array<{ agent: string; confidence: number; weight: number }>
    ): number {
        // Calculate weighted average confidence
        const totalWeight = resolvedSignals.reduce((sum, signal) => sum + signal.weight, 0);
        const weightedSum = resolvedSignals.reduce((sum, signal) => sum + (signal.confidence * signal.weight), 0);

        // Normalize to 0-100 scale
        return Math.round((weightedSum / totalWeight) * 100);
    }

    /**
     * Generate final decision based on resolved signals
     */
    private generateFinalDecision(
        resolvedSignals: Array<{ agent: string; signal: string; confidence: number; weight: number }>,
        consensusScore: number
    ): string {
        // Get the most confident signals
        const topSignals = resolvedSignals
            .sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight))
            .slice(0, 3);

        // Generate decision based on top signals
        if (consensusScore > 80) {
            return `STRONG CONSENSUS: ${topSignals[0].signal}. Supported by ${topSignals[1].signal} and ${topSignals[2].signal}`;
        } else if (consensusScore > 60) {
            return `MODERATE CONSENSUS: ${topSignals[0].signal}. Consider ${topSignals[1].signal}`;
        } else if (consensusScore > 40) {
            return `WEAK CONSENSUS: Mixed signals detected. Primary signal: ${topSignals[0].signal}`;
        } else {
            return `NO CONSENSUS: Conflicting signals require manual review. Top signals: ${topSignals.map(s => s.signal).join(', ')}`;
        }
    }

    /**
     * Generate enhanced intelligence report with V3 features
     */
    private async generateEnhancedIntelligenceReport(
        flowAnalysis: FlowAnalysis,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis,
        earlyOpportunityAnalysis: EarlyOpportunityAnalysis,
        narrativeAnalysis: NarrativeAnalysis,
        smartMoneyAnalysis: SmartMoneyAnalysis,
        survivalAnalysis: SurvivalAnalysis,
        attentionVelocity: AttentionVelocityAnalysis,
        convictionScore: ConvictionScoreAnalysis,
        consensusResult: SignalConsensusResult,
        routingDecision: RoutingDecision
    ): Promise<IntelligenceReport> {
        // Generate base report using parent class method
        const baseReport = await this.researchManager.generateIntelligenceReport(
            flowAnalysis,
            onchainAnalysis,
            marketAnalysis,
            earlyOpportunityAnalysis,
            narrativeAnalysis,
            smartMoneyAnalysis,
            survivalAnalysis
        );

        // Create metadata with routing information
        const metadata = {
            token: flowAnalysis.token,
            timestamp: new Date().toISOString(),
            dataSources: baseReport.metadata?.dataSources || [
                'Jupiter Websocket',
                'Helius API',
                'Birdeye API',
                '9Router Cloud AI',
                'Narrative Intelligence',
                'Smart Money Database'
            ],
            routingDecision: {
                modelUsed: routingDecision.modelUsed,
                isFallback: routingDecision.isFallback,
                confidence: routingDecision.confidence
            },
            analysisVersion: '3.0',
            featuresUsed: [
                'Agent Routing',
                'Signal Consensus Engine',
                'Attention Velocity Score',
                'Conviction Score',
                routingDecision.isFallback ? 'Fallback Model' : 'Primary Model'
            ]
        };

        // Enhance with V3 features
        const enhancedReport: IntelligenceReport = {
            ...baseReport,
            attentionVelocityAnalysis: attentionVelocity,
            convictionScoreAnalysis: convictionScore,
            signalConsensus: consensusResult,
            metadata: metadata
        };

        // Generate enhanced executive summary
        enhancedReport.executiveSummary = this.generateEnhancedSummary(
            enhancedReport,
            attentionVelocity,
            convictionScore,
            consensusResult
        );

        // Generate enhanced key insights
        enhancedReport.keyInsights = this.generateEnhancedInsights(
            enhancedReport,
            attentionVelocity,
            convictionScore,
            consensusResult
        );

        // Generate enhanced recommendation
        enhancedReport.recommendation = this.generateEnhancedRecommendation(
            enhancedReport,
            attentionVelocity,
            convictionScore,
            consensusResult
        );

        return enhancedReport;
    }

    /**
     * Generate enhanced executive summary
     */
    private generateEnhancedSummary(
        report: IntelligenceReport,
        attentionVelocity: AttentionVelocityAnalysis,
        convictionScore: ConvictionScoreAnalysis,
        consensusResult: SignalConsensusResult
    ): string {
        const velocityText = `Attention Velocity: ${attentionVelocity.attentionVelocity}/100 (${attentionVelocity.velocityTrend})`;
        const convictionText = `Conviction Score: ${convictionScore.convictionScore}/100 (${convictionScore.convictionTrend})`;
        const consensusText = `Consensus: ${consensusResult.consensusScore}/100 - ${consensusResult.finalDecision}`;

        return `${report.executiveSummary}\n\nV3 Enhancements:\n- ${velocityText}\n- ${convictionText}\n- ${consensusText}`;
    }

    /**
     * Generate enhanced key insights
     */
    private generateEnhancedInsights(
        report: IntelligenceReport,
        attentionVelocity: AttentionVelocityAnalysis,
        convictionScore: ConvictionScoreAnalysis,
        consensusResult: SignalConsensusResult
    ): Array<{
        insight: string;
        confidence: number;
        category?: 'flow' | 'onchain' | 'market' | 'sentiment' | 'risk' | 'opportunity' | 'narrative' | 'smart-money' | 'survival' | 'system';
    }> {
        const enhancedInsights = [...report.keyInsights];

        // Add attention velocity insights
        enhancedInsights.push({
            insight: `Attention Velocity: ${attentionVelocity.attentionVelocity}/100 (${attentionVelocity.velocityTrend}) - ${this.getVelocityInterpretation(attentionVelocity)}`,
            confidence: attentionVelocity.confidence,
            category: 'flow'
        });

        // Add conviction score insights
        enhancedInsights.push({
            insight: `Conviction Score: ${convictionScore.convictionScore}/100 (${convictionScore.convictionTrend}) - ${this.getConvictionInterpretation(convictionScore)}`,
            confidence: convictionScore.confidence,
            category: 'smart-money'
        });

        // Add consensus insights
        enhancedInsights.push({
            insight: `Signal Consensus: ${consensusResult.consensusScore}/100 - ${consensusResult.finalDecision}`,
            confidence: consensusResult.confidence,
            category: 'system'
        });

        // Add specific conflict resolutions
        if (consensusResult.conflictingSignals.length > 0) {
            consensusResult.conflictingSignals.forEach(conflict => {
                enhancedInsights.push({
                    insight: `Conflict Resolution: ${conflict.resolution}`,
                    confidence: conflict.confidence,
                    category: 'system'
                });
            });
        }

        return enhancedInsights;
    }

    /**
     * Get interpretation of attention velocity
     */
    private getVelocityInterpretation(velocity: AttentionVelocityAnalysis): string {
        if (velocity.attentionVelocity > 80) {
            return velocity.velocityTrend === 'INCREASING'
                ? 'Extreme attention growth - potential FOMO or genuine interest'
                : 'High sustained attention - strong market interest';
        } else if (velocity.attentionVelocity > 60) {
            return velocity.velocityTrend === 'INCREASING'
                ? 'Rapid attention growth - emerging opportunity'
                : 'Moderate sustained attention - watch for developments';
        } else if (velocity.attentionVelocity > 40) {
            return 'Normal attention levels - typical market activity';
        } else {
            return velocity.velocityTrend === 'DECREASING'
                ? 'Declining attention - potential loss of interest'
                : 'Low attention - limited market interest';
        }
    }

    /**
     * Get interpretation of conviction score
     */
    private getConvictionInterpretation(score: ConvictionScoreAnalysis): string {
        if (score.convictionScore > 80) {
            return score.convictionTrend === 'INCREASING'
                ? 'Extreme conviction growth - strong accumulation by smart money'
                : 'High sustained conviction - strong holder base';
        } else if (score.convictionScore > 60) {
            return score.convictionTrend === 'INCREASING'
                ? 'Growing conviction - smart money accumulation detected'
                : 'Moderate conviction - stable holder base';
        } else if (score.convictionScore > 40) {
            return 'Neutral conviction - typical market behavior';
        } else {
            return score.convictionTrend === 'DECREASING'
                ? 'Declining conviction - potential distribution by smart money'
                : 'Low conviction - weak holder base';
        }
    }

    /**
     * Generate enhanced recommendation
     */
    private generateEnhancedRecommendation(
        report: IntelligenceReport,
        attentionVelocity: AttentionVelocityAnalysis,
        convictionScore: ConvictionScoreAnalysis,
        consensusResult: SignalConsensusResult
    ): string {
        // Base recommendation
        let recommendation = report.recommendation;

        // Enhance based on attention velocity
        if (attentionVelocity.attentionVelocity > 70 && attentionVelocity.velocityTrend === 'INCREASING') {
            recommendation += `\n\n⚠️ High Attention Alert: Rapid attention growth detected (${attentionVelocity.attentionVelocity}/100). ` +
                `This could indicate emerging FOMO. Monitor closely for price action and volume confirmation.`;
        }

        // Enhance based on conviction score
        if (convictionScore.convictionScore > 70 && convictionScore.smartMoneyConviction > 70) {
            recommendation += `\n\n💎 Smart Money Signal: High conviction score (${convictionScore.convictionScore}/100) ` +
                `with strong smart money participation (${convictionScore.smartMoneyConviction}/100). ` +
                `This suggests informed accumulation.`;
        } else if (convictionScore.convictionScore > 70 && convictionScore.retailConviction > 70) {
            recommendation += `\n\n🚨 Retail FOMO Warning: High conviction score driven by retail activity. ` +
                `Be cautious of potential pump-and-dump dynamics.`;
        }

        // Enhance based on consensus
        if (consensusResult.consensusScore > 80) {
            recommendation += `\n\n✅ Strong Consensus: Multiple agents agree on this assessment (${consensusResult.consensusScore}/100). ` +
                `Confidence in this recommendation is high.`;
        } else if (consensusResult.consensusScore < 40) {
            recommendation += `\n\n⚠️ Low Consensus: Significant disagreement between agents (${consensusResult.consensusScore}/100). ` +
                `Manual review recommended.`;
        }

        // Add specific recommendations based on patterns
        if (attentionVelocity.attentionVelocity > 80 &&
            convictionScore.convictionScore > 80 &&
            convictionScore.smartMoneyConviction > 80) {
            recommendation += `\n\n🚀 STRONG BUY SIGNAL: High attention velocity combined with high smart money conviction ` +
                `suggests a potential early-stage opportunity. This pattern has historically preceded significant price movements.`;
        }

        if (attentionVelocity.attentionVelocity > 80 &&
            convictionScore.convictionScore < 40) {
            recommendation += `\n\n🚨 PUMP-AND-DUMP WARNING: High attention with low conviction suggests retail-driven FOMO. ` +
                `Be extremely cautious of potential manipulation.`;
        }

        return recommendation;
    }

    /**
     * Create error report with routing information
     */
    protected createErrorReport(
        tokenAddress: string,
        error: any,
        routingDecision?: RoutingDecision
    ): IntelligenceReport {
        const baseError = error instanceof Error ? error : new Error(String(error));
        const baseReport = super.createErrorReport(tokenAddress, baseError);

        // Create metadata with routing information
        const metadata = {
            token: tokenAddress,
            timestamp: new Date().toISOString(),
            dataSources: [],
            ...(routingDecision ? {
                routingDecision: {
                    modelUsed: routingDecision.modelUsed,
                    isFallback: routingDecision.isFallback,
                    confidence: routingDecision.confidence
                }
            } : {}),
            errorDetails: {
                message: baseError.message,
                stack: baseError.stack || '',
                timestamp: new Date().toISOString()
            }
        };

        return {
            ...baseReport,
            metadata: metadata
        };
    }

    /**
     * Get current fallback status
     */
    getFallbackStatus(): FallbackStatus {
        return this.currentFallbackStatus;
    }

    /**
     * Enable or disable signal consensus
     */
    setSignalConsensusEnabled(enabled: boolean): void {
        this.signalConsensusEnabled = enabled;
    }

    /**
     * Update agent configurations
     */
    updateAgentConfigs(configs: AgentConfig[]): void {
        this.agentConfigs = configs;
    }

    /**
     * Update fallback configurations
     */
    updateFallbackConfigs(configs: AgentConfig[]): void {
        this.fallbackModels = configs;
    }
}