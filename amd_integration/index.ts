/**
 * @file amd_integration/index.ts
 * @desc Barrel file for AMD Integration module
 * @exposes AgentOrchestrator, analysis types
 */

// NOTE: AgentOrchestrator is NOT re-exported statically to avoid pulling
// Node-only dependencies (process.env) into the Vite bundle.
// Use dynamic import via analyzeToken() instead.
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
    SignalConsensusResult,
    AgentConfig
} from './types/analysisTypes';

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
    SignalConsensusResult,
    AgentConfig
} from './types/analysisTypes';

// Import mock report generator (safe for Vite/browser context)
import { createMockIntelligenceReport } from './test/mockData';
import type { AgentOrchestrator } from './agentOrchestrator';

// Lazy singleton — only created if real API keys are present
let _orchestrator: AgentOrchestrator | null = null;
async function getOrchestrator(): Promise<AgentOrchestrator> {
    if (!_orchestrator) {
        const { AgentOrchestrator: AO } = await import('./agentOrchestrator');
        _orchestrator = new AO();
    }
    return _orchestrator;
}

/**
 * Check if real API keys are configured for AMD Intelligence
 * Falls back to mock data if no keys are available
 */
function hasRealApiKeys(): boolean {
    // Check core on-chain data providers
    if (!import.meta.env?.VITE_HELIUS_API_KEY) {
        console.warn('[AMD] VITE_HELIUS_API_KEY is not set. On-chain analysis will fail.');
        return false;
    }
    if (!import.meta.env?.VITE_BIRDEYE_API_KEY) {
        console.warn('[AMD] VITE_BIRDEYE_API_KEY is not set. Liquidity analysis will be limited.');
        // This is a partial failure, but Helius might still work.
        // We'll allow it to proceed but log a warning.
    }

    // Check for AI Intelligence providers (at least one required for AI analysis)
    const hasOpenRouter = import.meta.env?.VITE_OPENROUTER_ENDPOINT &&
        import.meta.env?.VITE_OPENROUTER_API_KEY &&
        import.meta.env?.VITE_OPENROUTER_ENABLED === 'true';

    if (!hasOpenRouter) {
        console.warn('[AMD] No AI Intelligence provider configured. Need VITE_OPENROUTER_ENDPOINT+KEY+ENABLED.');
        return false;
    }

    return !!(
        hasOpenRouter ||
        import.meta.env?.VITE_HELIUS_API_KEY
    );
}

/**
 * Helper function for quick analysis. Throws error if APIs are not configured or analysis fails.
 */
export async function analyzeToken(tokenAddress: string): Promise<any> {
    if (!hasRealApiKeys()) {
        throw new Error('AMD_API_NOT_CONFIGURED: Critical API keys (e.g., Helius) are missing. Please check .env file.');
    }

    try {
        const orchestrator = await getOrchestrator();
        return await orchestrator.analyzeToken(tokenAddress);
    } catch (error) {
        console.error('[AMD] Real analysis failed:', error);
        throw new Error(`AMD_ANALYSIS_FAILED: Failed to perform real-time analysis for ${tokenAddress}. Original error: ${(error as Error).message}`);
    }
}

/**
 * Generate comprehensive intelligence report from multiple data sources
 * Primary: OpenRouter → Fallback: Mistral → OpenRouter (free)
 */
export class AMDResearchManager {
    private endpoints: Map<string, string>;
    private currentModel: string;
    private apiKey: string;
    private taskModels: Record<string, string>;

    constructor() {
        // Add getEnv utility function
        const getEnv = (key: string, defaultValue: string): string => {
            // Browser environment (Vite)
            if (typeof import.meta !== 'undefined' && import.meta.env) {
                return import.meta.env[key] || defaultValue;
            }
            // Node.js environment
            if (typeof process !== 'undefined' && process.env) {
                return process.env[key] || defaultValue;
            }
            return defaultValue;
        };

        // OpenRouter (primary) and Mistral (fallback)
        this.endpoints = new Map([
            ['primary', 'https://openrouter.ai/api/v1/chat/completions'],
            ['fallback', 'https://openrouter.ai/api/v1/chat/completions'],
            ['last-resort', 'https://openrouter.ai/api/v1/chat/completions']
        ]);

        this.currentModel = 'primary'; // OpenRouter as primary
        this.apiKey = getEnv('VITE_OPENROUTER_API_KEY', '');

        // Task-specific model mapping
        this.taskModels = {
            'intelligence_report': 'deepseek-v4-flash-free', // Primary comprehensive analysis
            'flow_analysis': 'gpt-oss:120b', // Real-time flow analysis
            'onchain_analysis': 'gpt-oss:120b', // Onchain data analysis
            'market_analysis': 'gpt-oss:120b', // Market data analysis
            'pattern_detection': 'gpt-oss:120b', // Pattern detection
            'narrative_analysis': 'mistral-large-latest', // Narrative and sentiment analysis
            'smart_money_analysis': 'mistral-large-latest', // Smart money analysis
            'survival_analysis': 'mistral-large-latest', // Survival probability analysis
            'default': 'arblok' // Combo ini mencakup fallback chain: deepseek → gpt-oss → mistral
        };
    }

    /**
     * Build flow analysis prompt
     */
    private buildFlowPrompt(flowData: any): string {
        return `
Analyze this token's real-time trading flow data:

${JSON.stringify(flowData, null, 2)}

Provide a comprehensive flow analysis containing:

1. FLOW PATTERNS (with confidence scores 0-1)
   - Identify buy/sell pressure patterns
   - Detect whale activity patterns
   - Identify accumulation/distribution phases
   - Detect potential manipulation signals

2. KEY INSIGHTS (with confidence scores 0-1)
   - Current market sentiment based on flow
   - Whale activity summary
   - Early signals of trend reversal
   - Potential risks from flow patterns

3. QUANTITATIVE METRICS
   - Buy/sell ratio
   - Whale transaction percentage
   - Volume concentration
   - Flow velocity score (0-100)

Focus on early discovery signals that provide trading advantage.
`;
    }

    /**
     * Build onchain analysis prompt
     */
    private buildOnchainPrompt(onchainData: any): string {
        return `
Analyze this token's onchain data:

${JSON.stringify(onchainData, null, 2)}

Provide a comprehensive onchain analysis containing:

1. HOLDER ANALYSIS
   - Top holders distribution
   - Holder growth trends
   - Concentration risk

2. WHALE ACTIVITY (with confidence scores 0-1)
   - Large transactions analysis
   - Accumulation/distribution by whales
   - Potential manipulation signals

3. RUG PULL INDICATORS (with confidence scores 0-1)
   - Liquidity lock status
   - Developer wallet activity
   - Suspicious transactions
   - Overall rug pull risk score (0-100)

4. TOKEN DISTRIBUTION
   - Initial distribution fairness
   - Current distribution health
   - Potential centralization risks

5. KEY INSIGHTS (with confidence scores 0-1)
   - Onchain health score
   - Early signals of potential issues
   - Strategic insights for traders

Focus on identifying risks and opportunities from onchain data.
`;
    }

    /**
     * Build market analysis prompt
     */
    private buildMarketPrompt(marketData: any): string {
        return `
Analyze this token's market data:

${JSON.stringify(marketData, null, 2)}

Provide a comprehensive market analysis containing:

1. PRICE TREND ANALYSIS
   - Current price trend
   - Support/resistance levels
   - Volatility assessment

2. VOLUME ANALYSIS (with confidence scores 0-1)
   - Volume trends
   - Volume vs price correlation
   - Unusual volume spikes

3. LIQUIDITY ASSESSMENT
   - Liquidity depth
   - Slippage potential
   - Market depth analysis

4. SENTIMENT ANALYSIS
   - Market sentiment score (0-100)
   - Sentiment trends
   - Potential hype cycles

5. KEY INSIGHTS (with confidence scores 0-1)
   - Market health score
   - Early signals of trend changes
   - Strategic insights for traders

Focus on identifying market opportunities and risks.
`;
    }

    /**
     * Build opportunity analysis prompt
     */
    private buildOpportunityPrompt(opportunityData: any): string {
        return `
Analyze this token for early opportunity signals:

${JSON.stringify(opportunityData, null, 2)}

Provide a comprehensive early opportunity analysis containing:

1. EARLY OPPORTUNITY INDEX (EOI)
   - Overall EOI score (0-100)
   - EOI rating (LOW/MEDIUM/HIGH/VERY HIGH)
   - Confidence in EOI assessment (0-1)

2. OPPORTUNITY FACTORS (with confidence scores 0-1)
   - Liquidity opportunity
   - Volume growth potential
   - Price momentum opportunity
   - Narrative potential
   - Community growth opportunity
   - Whale accumulation signals

3. PATTERN DETECTION (with confidence scores 0-1)
   - Early accumulation patterns
   - Breakout potential
   - Reversal signals
   - Momentum building

4. KEY INSIGHTS (with confidence scores 0-1)
   - Strategic opportunity assessment
   - Potential catalysts
   - Risk/reward assessment
   - Recommended actions

Focus on identifying early signals that provide trading advantage.
`;
    }

    /**
     * Build narrative analysis prompt
     */
    private buildNarrativePrompt(narrativeData: any): string {
        return `
Analyze this token's narrative and sentiment:

${JSON.stringify(narrativeData, null, 2)}

Provide a comprehensive narrative analysis containing:

1. NARRATIVE CLASSIFICATION
   - Primary narrative theme
   - Secondary narrative themes
   - Narrative strength score (0-100)
   - Narrative development stage

2. SENTIMENT ANALYSIS
   - Overall sentiment score (-100 to +100)
   - Sentiment trends
   - Positive sentiment drivers
   - Negative sentiment drivers

3. COMMUNITY ENGAGEMENT
   - Engagement level
   - Growth trends
   - Influencer activity
   - Potential hype cycles

4. KEY INSIGHTS (with confidence scores 0-1)
   - Narrative momentum assessment
   - Potential narrative shifts
   - Strategic insights for traders
   - Risk factors from narrative

Focus on identifying narrative-driven opportunities and risks.
`;
    }

    /**
     * Build smart money analysis prompt
     */
    private buildSmartMoneyPrompt(smartMoneyData: any): string {
        return `
Analyze this token's smart money activity:

${JSON.stringify(smartMoneyData, null, 2)}

Provide a comprehensive smart money analysis containing:

1. WHALE ACTIVITY ANALYSIS
   - Top whale wallets
   - Whale transaction patterns
   - Accumulation/distribution phases

2. SMART MONEY METRICS
   - Smart money score (0-100)
   - Whale win rate
   - Conviction level
   - Accumulation intensity

3. PATTERN DETECTION (with confidence scores 0-1)
   - Smart accumulation patterns
   - Distribution signals
   - Potential dump signals
   - Institutional interest indicators

4. KEY INSIGHTS (with confidence scores 0-1)
   - Smart money sentiment
   - Potential market impact
   - Strategic insights for traders
   - Risk factors from whale activity

Focus on identifying smart money-driven opportunities and risks.
`;
    }

    /**
     * Build survival analysis prompt
     */
    private buildSurvivalPrompt(survivalData: any): string {
        return `
Analyze this token's long-term survival probability:

${JSON.stringify(survivalData, null, 2)}

Provide a comprehensive survival analysis containing:

1. SURVIVAL PROBABILITY
   - Overall survival probability (0-1)
   - Estimated lifespan (days/weeks/months)
   - Confidence in survival assessment (0-1)

2. KEY RISK FACTORS (with impact scores 0-1)
   - Liquidity risk
   - Regulatory risk
   - Competition risk
   - Team risk
   - Technology risk
   - Market adoption risk

3. SURVIVAL INDICATORS
   - Holder distribution health
   - Community strength
   - Development activity
   - Utility assessment

4. KEY INSIGHTS (with confidence scores 0-1)
   - Survival catalysts
   - Critical risk factors
   - Strategic insights for long-term holders
   - Recommended actions

Focus on identifying factors that influence long-term token survival.
`;
    }

    /**
     * Query OpenRouter (free models fallback) with task-specific routing.
     * Uses DeepSeek R1 free for report synthesis (strong reasoning).
     * Falls back to Llama 3.3 70B free if DeepSeek fails.
     */
    private async queryModel(prompt: string, taskType: string = 'default'): Promise<string> {
        if (!this.endpoints.has(taskType)) {
            throw new Error('No endpoint configured for OpenRouter');
        }

        // Add getEnv utility function for this method
        const getEnv = (key: string, defaultValue: string): string => {
            // Browser environment (Vite)
            if (typeof import.meta !== 'undefined' && import.meta.env) {
                return import.meta.env[key] || defaultValue;
            }
            // Node.js environment
            if (typeof process !== 'undefined' && process.env) {
                return process.env[key] || defaultValue;
            }
            return defaultValue;
        };

        // Determine the appropriate model for a given task
        const model = this.taskModels[taskType] || this.taskModels['default'];

        // System prompt adjusted for the task
        let systemPrompt: string;

        switch (taskType) {
            case 'intelligence_report':
                systemPrompt = `You are a senior crypto intelligence analyst specializing in newborn token analysis.
Your task is to generate comprehensive intelligence reports from multiple data sources.
Focus on early discovery signals, pattern detection, and early opportunity signals.
Provide actionable intelligence with confidence scores for each insight.`;
                break;

            case 'flow_analysis':
                systemPrompt = `You are a real-time data flow analyst for crypto tokens.
Your task is to analyze trading patterns, volume spikes, and liquidity changes.
Focus on identifying early signals of market activity, buy/sell pressure, and whale movements.
Provide insights with confidence scores.`;
                break;

            case 'onchain_analysis':
                systemPrompt = `You are an onchain data analyst for crypto tokens.
Your task is to analyze blockchain data including transactions, wallet activity, and smart contract interactions.
Focus on identifying whale activity, token distribution, potential manipulation, and rug pull indicators.
Provide quantitative metrics and confidence scores.`;
                break;

            case 'market_analysis':
                systemPrompt = `You are a market analyst for crypto tokens.
Your task is to analyze market data, sentiment, and trading patterns.
Provide insights on market trends, liquidity, volatility, and price movements.
Include confidence scores for your assessments.`;
                break;

            case 'pattern_detection':
                systemPrompt = `You are an AI pattern recognition analyst for crypto tokens.
Your task is to detect patterns, anomalies, and early signals in token behavior.
Focus on identifying rug pull patterns, accumulation/distribution patterns, and market manipulation signals.
Provide confidence scores for each detected pattern.`;
                break;

            case 'narrative_analysis':
                systemPrompt = `You are a narrative and sentiment analyst for crypto tokens.
Your task is to analyze social media, community sentiment, and narrative development.
Provide insights on narrative strength, sentiment trends, community engagement, and potential hype cycles.
Include sentiment scores and narrative classification.`;
                break;

            case 'smart_money_analysis':
                systemPrompt = `You are a smart money analyst for crypto tokens.
Your task is to track and analyze whale activity, institutional movements, and smart money patterns.
Provide insights on accumulation/distribution by large holders, win rates, and conviction levels.
Include quantitative metrics and confidence scores.`;
                break;

            case 'survival_analysis':
                systemPrompt = `You are a survival probability analyst for crypto tokens.
Your task is to predict the likelihood of a token's long-term survival based on multiple factors.
Provide quantitative survival probability scores, estimated lifespan, and key risk factors.
Include confidence levels for your predictions.`;
                break;

            default:
                systemPrompt = `You are a helpful AI assistant specializing in crypto token analysis.
Provide comprehensive and strategic insights based on the provided data.`;
        }

        // Query the model
        const response = await fetch(this.endpoints.get(model)!, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 2000,
            stream: false
        })
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`AI API error(\${ this.currentModel
        }): \${ response.status } \${ errText }`);
    }

    const result = await response.json();
    // OpenRouter uses 'choices' and 'message'
    return result.choices?.[0]?.message?.content || '';
}

    /**
     * Generate comprehensive intelligence report from multiple data sources
     * Primary: OpenRouter → Fallback: Mistral → OpenRouter (free)
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
        console.log('[AMD AI] Generating comprehensive intelligence report...');
        const prompt = this.buildResearchPrompt(
            flowAnalysis,
            onchainAnalysis,
            marketAnalysis,
            earlyOpportunityAnalysis,
            narrativeAnalysis,
            smartMoneyAnalysis,
            survivalAnalysis
        );

        // Use model specific for task (intelligence_report)
        const response = await this.queryModel(prompt, 'intelligence_report');

        console.log('[AMD AI] Intelligence report generated successfully');
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
        console.error('[AMD AI] Primary AI model failed:', error);

        // Try fallback model if available
        if (this.endpoints.get('fallback')) {
            this.currentModel = 'fallback';
            try {
                console.log('[AMD AI] Trying fallback AI model (gpt-oss-120b via OpenRouter)...');
                const prompt = this.buildResearchPrompt(
                    flowAnalysis,
                    onchainAnalysis,
                    marketAnalysis,
                    earlyOpportunityAnalysis,
                    narrativeAnalysis,
                    smartMoneyAnalysis,
                    survivalAnalysis
                );
                const response = await this.queryModel(prompt, 'intelligence_report');
                console.log('[AMD AI] Fallback AI model succeeded');
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
            } catch (fallbackError) {
                console.error('[AMD AI] Fallback AI model failed:', fallbackError);
            }
        }

        // Try last-resort model if available
        if (this.endpoints.get('last-resort')) {
            this.currentModel = 'last-resort';
            try {
                console.log('[AMD AI] Trying last-resort AI model (mistral-large-latest via OpenRouter)...');
                const prompt = this.buildResearchPrompt(
                    flowAnalysis,
                    onchainAnalysis,
                    marketAnalysis,
                    earlyOpportunityAnalysis,
                    narrativeAnalysis,
                    smartMoneyAnalysis,
                    survivalAnalysis
                );
                const response = await this.queryModel(prompt, 'intelligence_report');
                console.log('[AMD AI] Last-resort AI model succeeded');
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
            } catch (lastResortError) {
                console.error('[AMD AI] Last-resort AI model failed:', lastResortError);
            }
        }

        // Try OpenRouter (free models fallback) if available
        this.currentModel = 'openrouter';
        try {
            console.log('[AMD AI] Trying OpenRouter (free models fallback)...');
            const prompt = this.buildResearchPrompt(
                flowAnalysis,
                onchainAnalysis,
                marketAnalysis,
                earlyOpportunityAnalysis,
                narrativeAnalysis,
                smartMoneyAnalysis,
                survivalAnalysis
            );
            const response = await this.queryModel(prompt, 'intelligence_report');
            console.log('[AMD AI] OpenRouter succeeded');
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
        } catch (openRouterError) {
            console.error('[AMD AI] OpenRouter AI model failed:', openRouterError);
        }

        // If all AI endpoints fail, return a mock response
        console.warn('[AMD AI] All AI endpoints failed. Returning mock intelligence report.');
        return this.generateMockIntelligenceReport(
            flowAnalysis,
            onchainAnalysis,
            marketAnalysis,
            earlyOpportunityAnalysis,
            narrativeAnalysis,
            smartMoneyAnalysis,
            survivalAnalysis
        );
    }
}

    /**
     * Build research prompt from multiple data sources
     */
private buildResearchPrompt(
    flow: FlowAnalysis,
    onchain: OnchainAnalysis,
    market: MarketAnalysis,
    earlyOpportunity?: EarlyOpportunityAnalysis,
    narrative?: NarrativeAnalysis,
    smartMoney?: SmartMoneyAnalysis,
    survival?: SurvivalAnalysis
): string {
    return `
Analyze this newborn token based on the following multi - source intelligence:

FLOW INTELLIGENCE(Realtime Websocket Data):
${ JSON.stringify(flow, null, 2) }

ONCHAIN DATA(Helius / Birdeye):
${ JSON.stringify(onchain, null, 2) }

MARKET DATA(Jupiter / CoinGecko):
${ JSON.stringify(market, null, 2) }

${
            earlyOpportunity ? `EARLY OPPORTUNITY ANALYSIS:
${JSON.stringify(earlyOpportunity, null, 2)}` : ''
        }

${
            narrative ? `NARRATIVE INTELLIGENCE:
${JSON.stringify(narrative, null, 2)}` : ''
        }

${
            smartMoney ? `SMART MONEY ANALYSIS:
${JSON.stringify(smartMoney, null, 2)}` : ''
        }

${
            survival ? `SURVIVAL ANALYSIS:
${JSON.stringify(survival, null, 2)}` : ''
        }

Generate a comprehensive intelligence report containing:

        1. EXECUTIVE SUMMARY(3 - 5 bullet points max)
            - Include Early Opportunity Index(EOI) rating if available
                - Include Rug Pull Risk level if high
                    - Include Narrative strength if relevant
                        - Include Smart Money score if significant

2. KEY INSIGHTS with confidence scores 0 - 1 and categories
            - Use categories: flow, onchain, market, sentiment, risk, opportunity, narrative, smart - money, survival
                - Include 8 - 12 insights covering all aspects

        3. QUANTITATIVE METRICS
            - Opportunity Score: [0 - 100]
                - Risk Score: [0 - 100]
                    - Smart Money Score: [0 - 100]
                        - Survival Score: [0 - 100]
                            - Narrative Score: [0 - 100]
                                - Overall Score: [0 - 100]
                                    - Rating: [AVOID / CAUTION / MONITOR / WATCH / POTENTIAL / OPPORTUNITY / STRONG OPPORTUNITY]

Focus on identifying risks and opportunities from multi - source data.
`;
}

    /**
     * Parse raw model response into structured intelligence report
     */
    private parseIntelligenceResponse(
        response: string,
        flow: FlowAnalysis,
        onchain: OnchainAnalysis,
        market: MarketAnalysis,
        earlyOpportunity?: EarlyOpportunityAnalysis,
        narrative?: NarrativeAnalysis,
        smartMoney?: SmartMoneyAnalysis,
        survival?: SurvivalAnalysis
    ): IntelligenceReport {
        // Extract sections from response
        const executiveSummary = this.extractSection(response, 'EXECUTIVE SUMMARY');
        const keyInsights = this.extractKeyInsights(response);
        const opportunityAssessment = this.extractAssessment(response, 'OPPORTUNITY ASSESSMENT');
        const riskAssessment = this.extractAssessment(response, 'RISK ASSESSMENT');
        const patternDetection = this.extractSection(response, 'PATTERN DETECTION');
        const recommendation = this.extractSection(response, 'FINAL RECOMMENDATION');
        const intelligenceRanking = this.extractIntelligenceRanking(response);

        // Calculate confidence score
        const confidenceScore = this.calculateConfidenceScore(
            keyInsights,
            earlyOpportunity,
            narrative,
            smartMoney,
            survival
        );

        // Build the report
        const report: IntelligenceReport = {
            rawResponse: response,
            executiveSummary,
            keyInsights,
            opportunityAssessment,
            riskAssessment,
            patternDetection,
            recommendation,
            confidenceScore,
            intelligenceRanking: intelligenceRanking || this.calculateDefaultRanking(
                earlyOpportunity,
                onchain,
                smartMoney,
                survival,
                narrative
            )
        };

        // Add specific analysis sections if available
        if (onchain.rugPullIndicators) {
            report.rugPullIndicators = {
                ...onchain.rugPullIndicators,
            warningLevel: this.calculateWarningLevel(onchain.rugPullIndicators.overallRugScore).toLowerCase() as 'low' | 'medium' | 'high' | 'critical'
            };
        }

        if (market.sentimentAnalysis) {
            report.sentimentAnalysis = market.sentimentAnalysis;
        }

        if (earlyOpportunity) {
            report.earlyOpportunityAnalysis = earlyOpportunity;
        }

        if (narrative) {
            report.narrativeAnalysis = narrative;
        }

        if (smartMoney) {
            report.smartMoneyAnalysis = smartMoney;
        }

        if (survival) {
            report.survivalAnalysis = survival;
        }

        return report;
    }

    /**
     * Extract section from response
     */
private extractSection(response: string, sectionName: string): string {
    const regex = new RegExp(`${ sectionName }: (.*?)(?=\\n\\n |\\n\\d\\.|\\n[A - Z]{ 2, } | $)`, 's');
    const match = response.match(regex);
    return match ? match[1].trim() : `No ${ sectionName.toLowerCase() } available`;
}

    /**
     * Extract key insights from response
     */
    private extractKeyInsights(response: string): Array<{ insight: string; confidence: number; category?: 'system' | 'flow' | 'onchain' | 'market' | 'sentiment' | 'risk' | 'opportunity' | 'narrative' | 'smart-money' | 'survival' }> {
        const insights: Array<{ insight: string; confidence: number; category?: 'system' | 'flow' | 'onchain' | 'market' | 'sentiment' | 'risk' | 'opportunity' | 'narrative' | 'smart-money' | 'survival' }> = [];
        const regex = /-\s*\[([A-Za-z-]+)\]\s*(.*?)\s*\(Confidence:\s*([0-9.]+)\)/g;
        let match;

        while ((match = regex.exec(response)) !== null) {
            const category = match[1].trim() as any;
            insights.push({
                category: ['system', 'flow', 'onchain', 'market', 'sentiment', 'risk', 'opportunity', 'narrative', 'smart-money', 'survival'].includes(category) ? category : undefined,
                insight: match[2].trim(),
                confidence: parseFloat(match[3])
            });
        }

        // Fallback if no categorized insights found
        if (insights.length === 0) {
            const fallbackRegex = /-\s*(.*?)\s*\(Confidence:\s*([0-9.]+)\)/g;
            while ((match = fallbackRegex.exec(response)) !== null) {
                insights.push({
                    insight: match[1].trim(),
                    confidence: parseFloat(match[2])
                });
            }
        }

        return insights.length > 0 ? insights : [{ insight: 'No key insights extracted', confidence: 0 }];
    }

    /**
     * Extract assessment from response
     */
private extractAssessment(response: string, sectionName: string): Record<string, string> {
    const assessment: Record<string, string> = {};
    const regex = new RegExp(`${ sectionName }: (.*?)(?=\\n\\n |\\n\\d\\.|\\n[A - Z]{ 2, } | $)`, 's');
    const match = response.match(regex);

    if (match) {
        const sectionContent = match[1];
        const itemRegex = /([A-Za-z\s]+):\s*(High|Medium|Low)/g;
        let itemMatch;

        while ((itemMatch = itemRegex.exec(sectionContent)) !== null) {
            assessment[itemMatch[1].trim()] = itemMatch[2];
        }
    }

    return Object.keys(assessment).length > 0 ? assessment : { General: 'Medium' };
}

    /**
     * Extract intelligence ranking from response
     */
    private extractIntelligenceRanking(response: string): IntelligenceRanking | null {
        const regex = /INTELLIGENCE RANKING:\s*(.*)/s;
        const match = response.match(regex);

        if (match) {
            const rankingString = match[1].trim();
            const rankings = rankingString.split(',').map(item => item.trim().split(':'));
            const ranking: Partial<IntelligenceRanking> = {};

            rankings.forEach(([key, value]) => {
                const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '');
                if (normalizedKey === 'opportunity' || normalizedKey === 'opportunityscore') {
                    ranking.opportunityScore = parseFloat(value.trim());
                } else if (normalizedKey === 'risk' || normalizedKey === 'riskscore') {
                    ranking.riskScore = parseFloat(value.trim());
                } else if (normalizedKey === 'smartmoney' || normalizedKey === 'smartmoneyscore') {
                    ranking.smartMoneyScore = parseFloat(value.trim());
                } else if (normalizedKey === 'survival' || normalizedKey === 'survivalscore') {
                    ranking.survivalScore = parseFloat(value.trim());
                } else if (normalizedKey === 'narrative' || normalizedKey === 'narrativescore') {
                    ranking.narrativeScore = parseFloat(value.trim());
                } else if (normalizedKey === 'overall' || normalizedKey === 'overallscore') {
                    ranking.overallScore = parseFloat(value.trim());
                }
            });

            return ranking as IntelligenceRanking;
        }

        return null;
    }

    /**
     * Calculate confidence score based on key insights
     */
    private calculateConfidenceScore(
        keyInsights: Array<{ insight: string; confidence: number; category?: 'system' | 'flow' | 'onchain' | 'market' | 'sentiment' | 'risk' | 'opportunity' | 'narrative' | 'smart-money' | 'survival' }>,
        earlyOpportunity?: EarlyOpportunityAnalysis,
        narrative?: NarrativeAnalysis,
        smartMoney?: SmartMoneyAnalysis,
        survival?: SurvivalAnalysis
    ): number {
        const totalConfidence = keyInsights.reduce((sum, insight) => sum + insight.confidence, 0);
        const averageConfidence = keyInsights.length > 0 ? totalConfidence / keyInsights.length : 0;

        return averageConfidence;
    }

    /**
     * Calculate default ranking based on available data
     */
    private calculateDefaultRanking(
        earlyOpportunity?: EarlyOpportunityAnalysis,
        onchain?: OnchainAnalysis,
        smartMoney?: SmartMoneyAnalysis,
        survival?: SurvivalAnalysis,
        narrative?: NarrativeAnalysis
    ): IntelligenceRanking {
        const ranking: Partial<IntelligenceRanking> = {};

        if (earlyOpportunity) {
            ranking.opportunityScore = earlyOpportunity.eoiScore;
        }

        if (onchain) {
            ranking.riskScore = onchain.rugPullIndicators.overallRugScore;
        }

        if (smartMoney) {
            ranking.smartMoneyScore = smartMoney.smartMoneyScore;
        }

        if (survival) {
            ranking.survivalScore = survival.survivalProbability * 100;
        }

        if (narrative) {
            ranking.narrativeScore = narrative.narrativeStrength;
        }

        ranking.overallScore = this.calculateOverallScore(ranking as IntelligenceRanking);
        ranking.rating = this.calculateRating(ranking.overallScore);

        return ranking as IntelligenceRanking;
    }

    /**
     * Calculate overall score based on individual scores
     */
    private calculateOverallScore(ranking: IntelligenceRanking): number {
        const scores = Object.values(ranking).filter(score => typeof score === 'number');
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        return scores.length > 0 ? totalScore / scores.length : 0;
    }

    /**
     * Calculate rating based on overall score
     */
    private calculateRating(overallScore: number): 'AVOID' | 'CAUTION' | 'MONITOR' | 'WATCH' | 'POTENTIAL' | 'OPPORTUNITY' | 'STRONG OPPORTUNITY' {
        if (overallScore >= 90) {
            return 'STRONG OPPORTUNITY';
        } else if (overallScore >= 70) {
            return 'OPPORTUNITY';
        } else if (overallScore >= 50) {
            return 'POTENTIAL';
        } else if (overallScore >= 30) {
            return 'WATCH';
        } else if (overallScore >= 10) {
            return 'CAUTION';
        } else {
            return 'AVOID';
        }
    }

    /**
     * Calculate warning level based on rug pull score
     */
    private calculateWarningLevel(rugPullScore: number): 'low' | 'medium' | 'high' | 'critical' {
        if (rugPullScore >= 90) {
            return 'critical';
        } else if (rugPullScore >= 70) {
            return 'high';
        } else if (rugPullScore >= 40) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Generate mock intelligence report
     */
    private generateMockIntelligenceReport(
        flow: FlowAnalysis,
        onchain: OnchainAnalysis,
        market: MarketAnalysis,
        earlyOpportunity?: EarlyOpportunityAnalysis,
        narrative?: NarrativeAnalysis,
        smartMoney?: SmartMoneyAnalysis,
        survival?: SurvivalAnalysis
    ): IntelligenceReport {
        const executiveSummary = 'No real-time data available. Returning mock report.';
        const keyInsights = [
            { insight: 'No insights available', confidence: 0 }
        ];
        const opportunityAssessment = {
            General: 'No early opportunity signals detected'
        };
        const riskAssessment = {
            General: 'No risk factors detected'
        };
        const patternDetection = 'No patterns detected';
        const recommendation = 'Monitor token activity for early signals.';
        const intelligenceRanking = this.calculateDefaultRanking(
            earlyOpportunity,
            onchain,
            smartMoney,
            survival,
            narrative
        );

        return {
            rawResponse: executiveSummary,
            executiveSummary,
            keyInsights,
            opportunityAssessment,
            riskAssessment,
            patternDetection,
            recommendation,
            confidenceScore: 0,
            intelligenceRanking
        };
    }

    /**
     * Generate mock flow analysis
     */
    private generateMockFlowAnalysis(flowData: any): FlowAnalysis {
        return {
            token: '',
            patterns: [],
            confidence: 0,
            evidence: []
        };
    }

    /**
     * Generate mock onchain analysis
     */
    private generateMockOnchainAnalysis(onchainData: any): OnchainAnalysis {
        return {
            token: '',
            whaleActivity: {
                largeTransfers: 0,
                whaleWallets: 0,
                concentration: 0
            },
            holderGrowth: {
                newHolders: 0,
                growthRate: 0
            },
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
            riskScore: 0
        };
    }

    /**
     * Generate mock market analysis
     */
    private generateMockMarketAnalysis(marketData: any): MarketAnalysis {
        return {
            token: '',
            priceTrend: {
                current: 0,
                change24h: 0,
                change7d: 0
            },
            volumeAnalysis: {
                volume24h: 0,
                volumeChange: 0
            },
            liquidityAnalysis: {
                depth: 0,
                slippage: 0
            },
            volatilityScore: 0,
            sentimentAnalysis: {
                sentimentScore: 0,
                positiveMentions: 0,
                negativeMentions: 0,
                neutralMentions: 0,
                sentimentTrend: 0,
                source: 'n/a'
            }
        };
    }

    /**
     * Generate mock opportunity analysis
     */
    private generateMockOpportunityAnalysis(opportunityData: any): EarlyOpportunityAnalysis {
        return {
            token: '',
            eoiScore: 0,
            rating: 'LOW OPPORTUNITY',
            factors: {
                volumeVelocity: 0,
                freshWalletGrowth: 0,
                whaleEntry: 0,
                liquidityGrowth: 0,
                buyPressure: 0,
                marketMomentum: 0
            },
            evidence: [],
            confidence: 0
        };
    }

    /**
     * Generate mock narrative analysis
     */
    private generateMockNarrativeAnalysis(narrativeData: any): NarrativeAnalysis {
        return {
            token: '',
            narrative: '',
            confidence: 0,
            evidence: [],
            narrativeStrength: 0,
            relatedTokens: []
        };
    }

    /**
     * Generate mock smart money analysis
     */
    private generateMockSmartMoneyAnalysis(smartMoneyData: any): SmartMoneyAnalysis {
        return {
            token: '',
            smartMoneyScore: 0,
            smartWhales: [],
            totalSmartMoneyVolume: 0,
            smartMoneyPercentage: 0,
            confidence: 0
        };
    }

    /**
     * Generate mock survival analysis
     */
    private generateMockSurvivalAnalysis(survivalData: any): SurvivalAnalysis {
        return {
            token: '',
            survivalProbability: 0,
            estimatedLifespan: '',
            factors: {
                liquidityRetention: 0,
                holderGrowth: 0,
                buySellRatio: 0,
                whaleBehavior: 0,
                developerActivity: 0
            },
            confidence: 0
        };
    }
}
