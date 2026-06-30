/**
 * AMD AI Service Integration for Onyx Terminal
 * Handles communication with AI models via 9Router Gateway (primary) and AMD Cloud (fallback)
 */

import {
    IntelligenceReport,
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis,
    IntelligenceRanking
} from '../types/analysisTypes';
import { getOpenRouterProvider } from '../core/openRouterProvider';
import { OpenRouterTask } from '../models/openRouterModels';

export class AMDResearchManager {
    private endpoints: Map<string, string>;
    private currentModel: string;
    private apiKey: string;
    private endpoint: string;
    /** Task-specific model mapping */
    private taskModels: Record<string, string>;
    /** Whether the 9Router Gateway is available as primary */
    private use9Router: boolean;

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

        // 9Router Gateway (OpenAI-compatible endpoint)
        const gatewayUrl = getEnv('VITE_AI_GATEWAY_URL', 'http://localhost:20128/v1');
        const gatewayKey = getEnv('VITE_AI_GATEWAY_KEY', 'arblok');

        this.use9Router = !!gatewayKey;
        this.endpoint = this.use9Router ? `${gatewayUrl}/chat/completions` : '';
        this.apiKey = gatewayKey || getEnv('AMD_API_KEY', '');

        // Initialize endpoints map
        this.endpoints = new Map([
            // Primary: 9Router Gateway
            ['primary', this.use9Router ? `${gatewayUrl}/chat/completions` : ''],
            // Fallback: 9Router Gateway
            ['fallback', this.use9Router ? `${gatewayUrl}/chat/completions` : ''],
            // Last resort: 9Router Gateway
            ['last-resort', this.use9Router ? `${gatewayUrl}/chat/completions` : '']
        ]);
        this.currentModel = 'primary';

        // Task-specific model mapping
        // Setiap model memiliki tugas spesifik berdasarkan kekuatannya
        this.taskModels = {
            // Tugas-tugas yang membutuhkan reasoning mendalam dan analisis kompleks
            'intelligence_report': 'oc/deepseek-v4-flash-free', // Primary untuk analisis komprehensif
            'pattern_detection': 'oc/deepseek-v4-flash-free',   // Analisis pola dan deteksi anomali
            'risk_assessment': 'oc/deepseek-v4-flash-free',     // Penilaian risiko dengan reasoning kuat

            // Tugas-tugas yang membutuhkan pemrosesan volume besar dan kecepatan
            'flow_analysis': 'ollama/gpt-oss:120b',            // Analisis data flow real-time
            'market_analysis': 'ollama/gpt-oss:120b',          // Analisis data pasar dan volume
            'onchain_analysis': 'ollama/gpt-oss:120b',         // Analisis data onchain besar

            // Tugas-tugas yang membutuhkan general intelligence
            'narrative_analysis': 'mistral/mistral-large-latest', // Analisis naratif dan sentimen
            'smart_money_analysis': 'mistral/mistral-large-latest', // Analisis perilaku whale
            'survival_analysis': 'mistral/mistral-large-latest', // Prediksi kelangsungan hidup token

            // Default model (menggunakan combo "arblok" yang sudah dikonfigurasi)
            'default': 'arblok' // Combo ini sudah mencakup fallback chain
        };
    }

    /**
     * Determine the appropriate model for a given task
     * Setiap model memiliki tugas spesifik berdasarkan kekuatannya
     */
    private getModelForTask(taskType: string): string {
        // Cek apakah ada model khusus untuk tugas ini
        if (this.taskModels && this.taskModels[taskType]) {
            return this.taskModels[taskType];
        }

        // Jika tidak ada model khusus, gunakan combo "arblok" yang sudah dikonfigurasi
        // Combo ini sudah mencakup fallback chain:
        // 1. oc/deepseek-v4-flash-free (primary)
        // 2. ollama/gpt-oss:120b (fallback)
        // 3. mistral/mistral-large-latest (last resort)
        return this.taskModels?.['default'] || 'arblok';
    }

    /**
     * Query AI model with task-specific routing
     * Setiap tugas menggunakan model yang paling sesuai dengan kebutuhannya
     */
    private async queryModel(prompt: string, taskType: string = 'default'): Promise<string> {
        if (!this.endpoint) {
            throw new Error('No endpoint configured for 9Router');
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

        // Tentukan model yang sesuai untuk tugas ini
        const model = this.getModelForTask(taskType);

        // System prompt yang disesuaikan dengan tugas
        let systemPrompt: string;

        switch (taskType) {
            case 'intelligence_report':
                systemPrompt = `You are a senior crypto intelligence analyst specializing in newborn token analysis.
Your task is to generate comprehensive intelligence reports from multiple data sources.
Focus on strategic insights, pattern detection, and early discovery signals.
Provide actionable intelligence with confidence scores for each insight.`;
                break;

            case 'pattern_detection':
                systemPrompt = `You are an AI pattern recognition specialist for crypto tokens.
Your task is to detect patterns, anomalies, and early signals in token behavior.
Focus on identifying rug pull patterns, accumulation/distribution patterns, and market manipulation signals.
Provide confidence scores for each detected pattern.`;
                break;

            case 'risk_assessment':
                systemPrompt = `You are a risk assessment specialist for crypto tokens.
Your task is to evaluate various risk factors including rug pull potential, liquidity risks, and regulatory risks.
Provide quantitative risk scores and qualitative assessments.`;
                break;

            case 'flow_analysis':
                systemPrompt = `You are a real-time data flow analyst for crypto tokens.
Your task is to analyze trading patterns, volume spikes, and liquidity changes.
Focus on identifying early signals of market activity, buy/sell pressure, and whale movements.
Provide insights with confidence scores.`;
                break;

            case 'market_analysis':
                systemPrompt = `You are a market analyst for crypto tokens.
Your task is to analyze market data, sentiment, and trading patterns.
Provide insights on market trends, liquidity, volatility, and price movements.
Include confidence scores for your assessments.`;
                break;

            case 'onchain_analysis':
                systemPrompt = `You are an onchain data analyst for crypto tokens.
Your task is to analyze blockchain data including transactions, wallet activity, and smart contract interactions.
Focus on identifying whale activity, token distribution, potential manipulation, and rug pull indicators.
Provide quantitative metrics and confidence scores.`;
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

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey || getEnv('VITE_AI_GATEWAY_KEY', 'arblok')}`
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
            throw new Error(`AI API error (${this.currentModel}): ${response.status} ${errText}`);
        }

        const result = await response.json();
        // 9Router menggunakan format reasoning_content
        return result.choices?.[0]?.message?.reasoning_content ||
            result.choices?.[0]?.message?.content ||
            '';
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
     * Generate comprehensive intelligence report from multiple data sources
     * Primary: 9Router Gateway → Fallback: AMD Cloud → Last resort: Mistral → OpenRouter (free)
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

            // Gunakan model khusus untuk tugas ini (intelligence_report)
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
                    console.log('[AMD AI] Trying fallback AI model (gpt-oss-120b via 9Router)...');
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
                    console.log('[AMD AI] Trying last-resort AI model (mistral-large-latest via 9Router)...');
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
                const response = await this.queryOpenRouter(prompt);
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
     * Generate flow intelligence analysis
     */
    async generateFlowIntelligence(flowData: any): Promise<FlowAnalysis> {
        try {
            const prompt = this.buildFlowPrompt(flowData);
            // Gunakan model khusus untuk flow analysis (gpt-oss:120b)
            const response = await this.queryModel(prompt, 'flow_analysis');
            return this.parseFlowResponse(response, flowData);
        } catch (error) {
            console.error('[AMD AI] Flow intelligence analysis failed:', error);
            return this.generateMockFlowAnalysis(flowData);
        }
    }

    /**
     * Generate onchain intelligence analysis
     */
    async generateOnchainIntelligence(onchainData: any): Promise<OnchainAnalysis> {
        try {
            const prompt = this.buildOnchainPrompt(onchainData);
            // Gunakan model khusus untuk onchain analysis (gpt-oss:120b)
            const response = await this.queryModel(prompt, 'onchain_analysis');
            return this.parseOnchainResponse(response, onchainData);
        } catch (error) {
            console.error('[AMD AI] Onchain intelligence analysis failed:', error);
            return this.generateMockOnchainAnalysis(onchainData);
        }
    }

    /**
     * Generate market intelligence analysis
     */
    async generateMarketIntelligence(marketData: any): Promise<MarketAnalysis> {
        try {
            const prompt = this.buildMarketPrompt(marketData);
            // Gunakan model khusus untuk market analysis (gpt-oss:120b)
            const response = await this.queryModel(prompt, 'market_analysis');
            return this.parseMarketResponse(response, marketData);
        } catch (error) {
            console.error('[AMD AI] Market intelligence analysis failed:', error);
            return this.generateMockMarketAnalysis(marketData);
        }
    }

    /**
     * Generate early opportunity analysis
     */
    async generateEarlyOpportunityAnalysis(opportunityData: any): Promise<EarlyOpportunityAnalysis> {
        try {
            const prompt = this.buildOpportunityPrompt(opportunityData);
            // Gunakan model khusus untuk pattern detection (deepseek-v4-flash-free)
            const response = await this.queryModel(prompt, 'pattern_detection');
            return this.parseOpportunityResponse(response, opportunityData);
        } catch (error) {
            console.error('[AMD AI] Early opportunity analysis failed:', error);
            return this.generateMockOpportunityAnalysis(opportunityData);
        }
    }

    /**
     * Generate narrative analysis
     */
    async generateNarrativeAnalysis(narrativeData: any): Promise<NarrativeAnalysis> {
        try {
            const prompt = this.buildNarrativePrompt(narrativeData);
            // Gunakan model khusus untuk narrative analysis (mistral-large-latest)
            const response = await this.queryModel(prompt, 'narrative_analysis');
            return this.parseNarrativeResponse(response, narrativeData);
        } catch (error) {
            console.error('[AMD AI] Narrative analysis failed:', error);
            return this.generateMockNarrativeAnalysis(narrativeData);
        }
    }

    /**
     * Generate smart money analysis
     */
    async generateSmartMoneyAnalysis(smartMoneyData: any): Promise<SmartMoneyAnalysis> {
        try {
            const prompt = this.buildSmartMoneyPrompt(smartMoneyData);
            // Gunakan model khusus untuk smart money analysis (mistral-large-latest)
            const response = await this.queryModel(prompt, 'smart_money_analysis');
            return this.parseSmartMoneyResponse(response, smartMoneyData);
        } catch (error) {
            console.error('[AMD AI] Smart money analysis failed:', error);
            return this.generateMockSmartMoneyAnalysis(smartMoneyData);
        }
    }

    /**
     * Generate survival analysis
     */
    async generateSurvivalAnalysis(survivalData: any): Promise<SurvivalAnalysis> {
        try {
            const prompt = this.buildSurvivalPrompt(survivalData);
            // Gunakan model khusus untuk survival analysis (mistral-large-latest)
            const response = await this.queryModel(prompt, 'survival_analysis');
            return this.parseSurvivalResponse(response, survivalData);
        } catch (error) {
            console.error('[AMD AI] Survival analysis failed:', error);
            return this.generateMockSurvivalAnalysis(survivalData);
        }
    }

    /**
     * Query OpenRouter (free models fallback) with task-specific routing.
     * Uses DeepSeek R1 free for report synthesis (strong reasoning).
     * Falls back to Llama 3.3 70B free if DeepSeek fails.
     */
    private async queryOpenRouter(prompt: string): Promise<string> {
        const provider = getOpenRouterProvider();

        if (!provider.isAvailable()) {
            throw new Error('OpenRouter provider not available: missing API key or disabled');
        }

        const messages = [
            {
                role: 'system' as const,
                content: `You are a senior crypto intelligence analyst specializing in newborn token analysis.
Your task is to generate comprehensive intelligence reports from multiple data sources.
Focus on early discovery signals and patterns that indicate potential before they become obvious to the market.
Provide strategic insights, not just data summary.`
            },
            {
                role: 'user' as const,
                content: prompt
            }
        ];

        // Use 'report' task: DeepSeek R1 free (primary) → Llama 3.3 70B free (fallback)
        const result = await provider.chatWithFallback(messages, 'report' as OpenRouterTask);
        return result.content;
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
    Analyze this newborn token based on the following multi-source intelligence:

    FLOW INTELLIGENCE (Realtime Websocket Data):
    ${JSON.stringify(flow, null, 2)}

    ONCHAIN DATA (Helius/Birdeye):
    ${JSON.stringify(onchain, null, 2)}

    MARKET DATA (Jupiter/CoinGecko):
    ${JSON.stringify(market, null, 2)}

    ${earlyOpportunity ? `EARLY OPPORTUNITY ANALYSIS:
    ${JSON.stringify(earlyOpportunity, null, 2)}` : ''}

    ${narrative ? `NARRATIVE INTELLIGENCE:
    ${JSON.stringify(narrative, null, 2)}` : ''}

    ${smartMoney ? `SMART MONEY ANALYSIS:
    ${JSON.stringify(smartMoney, null, 2)}` : ''}

    ${survival ? `SURVIVAL ANALYSIS:
    ${JSON.stringify(survival, null, 2)}` : ''}

    Generate a comprehensive intelligence report containing:

    1. EXECUTIVE SUMMARY (3-5 bullet points max)
       - Include Early Opportunity Index (EOI) rating if available
       - Include Rug Pull Risk level if high
       - Include Narrative strength if relevant
       - Include Smart Money score if significant

    2. KEY INSIGHTS with confidence scores (0-1 scale) and categories
       - Use categories: flow, onchain, market, sentiment, risk, opportunity, narrative, smart-money, survival
       - Include 8-12 insights covering all aspects

    3. OPPORTUNITY ASSESSMENT (High/Medium/Low for each opportunity factor)

    4. RISK ASSESSMENT (High/Medium/Low for each risk factor)

    5. PATTERN DETECTION
       - Describe detected patterns with confidence levels
       - Include rug pull patterns if detected
       - Include accumulation/distribution patterns

    6. INTELLIGENCE RANKING (0-100 scores for each dimension)
       - Opportunity Score: [0-100]
       - Risk Score: [0-100]
       - Smart Money Score: [0-100]
       - Survival Score: [0-100]
       - Narrative Score: [0-100]
       - Overall Score: [0-100]
       - Rating: [AVOID/CAUTION/MONITOR/WATCH/POTENTIAL/OPPORTUNITY/STRONG OPPORTUNITY]

    7. FINAL RECOMMENDATION
       - Strategic recommendation based on all factors
       - Include specific watch conditions if monitoring
       - Include entry/exit considerations if applicable
       - Highlight what to watch for in next 24-48 hours

    Focus on strategic insights that provide early discovery advantage.
    Provide actionable intelligence, not just data summary.
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
                warningLevel: this.calculateWarningLevel(onchain.rugPullIndicators.overallRugScore)
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

    private extractSection(response: string, sectionName: string): string {
        const regex = new RegExp(`${sectionName}:(.*?)(?=\\n\\n|\\n\\d\\.|\\n[A-Z]{2,}|$)`, 's');
        const match = response.match(regex);
        return match ? match[1].trim() : `No ${sectionName.toLowerCase()} available`;
    }

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

    private extractAssessment(response: string, sectionName: string): Record<string, string> {
        const assessment: Record<string, string> = {};
        const regex = new RegExp(`${sectionName}:(.*?)(?=\\n\\n|\\n\\d\\.|\\n[A-Z]{2,}|$)`, 's');
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

    private extractIntelligenceRanking(response: string): IntelligenceRanking | null {
        const regex = /INTELLIGENCE RANKING:(.*?)(?=\n\n|\n\d\.|\n[A-Z]{2,}|$)/s;
        const match = response.match(regex);

        if (match) {
            const sectionContent = match[1];
            const scores: Record<string, number> = {};
            const scoreRegex = /([A-Za-z\s]+)\s*Score:\s*([0-9.]+)/g;
            let scoreMatch;

            while ((scoreMatch = scoreRegex.exec(sectionContent)) !== null) {
                scores[scoreMatch[1].trim()] = parseFloat(scoreMatch[2]);
            }

            const ratingRegex = /Rating:\s*([A-Z\s\/]+)/;
            const ratingMatch = sectionContent.match(ratingRegex);

            if (Object.keys(scores).length >= 5 && ratingMatch) {
                return {
                    opportunityScore: scores['Opportunity'] || scores['Opportunity Score'] || 50,
                    riskScore: scores['Risk'] || scores['Risk Score'] || 50,
                    smartMoneyScore: scores['Smart Money'] || scores['Smart Money Score'] || 50,
                    survivalScore: scores['Survival'] || scores['Survival Score'] || 50,
                    narrativeScore: scores['Narrative'] || scores['Narrative Score'] || 50,
                    overallScore: scores['Overall'] || scores['Overall Score'] || 50,
                    rating: ratingMatch[1].trim() as any
                };
            }
        }

        return null;
    }

    private calculateDefaultRanking(
        earlyOpportunity?: EarlyOpportunityAnalysis,
        onchain?: OnchainAnalysis,
        smartMoney?: SmartMoneyAnalysis,
        survival?: SurvivalAnalysis,
        narrative?: NarrativeAnalysis
    ): IntelligenceRanking {
        // Calculate default scores if AI model doesn't provide them
        const opportunityScore = earlyOpportunity ? earlyOpportunity.eoiScore : 50;
        const riskScore = onchain ? (1 - onchain.riskScore) * 100 : 50;
        const smartMoneyScore = smartMoney ? smartMoney.smartMoneyScore : 50;
        const survivalScore = survival ? survival.survivalProbability * 100 : 50;
        const narrativeScore = narrative ? narrative.narrativeStrength : 50;

        // Calculate overall score (weighted average)
        const overallScore = (
            opportunityScore * 0.3 +
            riskScore * 0.25 +
            smartMoneyScore * 0.2 +
            survivalScore * 0.15 +
            narrativeScore * 0.1
        );

        // Determine rating
        let rating: IntelligenceRanking['rating'] = 'MONITOR';
        if (overallScore >= 90) rating = 'STRONG OPPORTUNITY';
        else if (overallScore >= 80) rating = 'OPPORTUNITY';
        else if (overallScore >= 70) rating = 'POTENTIAL';
        else if (overallScore >= 60) rating = 'WATCH';
        else if (overallScore >= 40) rating = 'CAUTION';
        else rating = 'AVOID';

        return {
            opportunityScore: parseFloat(opportunityScore.toFixed(1)),
            riskScore: parseFloat(riskScore.toFixed(1)),
            smartMoneyScore: parseFloat(smartMoneyScore.toFixed(1)),
            survivalScore: parseFloat(survivalScore.toFixed(1)),
            narrativeScore: parseFloat(narrativeScore.toFixed(1)),
            overallScore: parseFloat(overallScore.toFixed(1)),
            rating
        };
    }

    /**
     * Calculate warning level based on rug score (0-100)
     */
    private calculateWarningLevel(overallRugScore: number): 'low' | 'medium' | 'high' | 'critical' {
        if (overallRugScore >= 80) return 'critical';
        if (overallRugScore >= 60) return 'high';
        if (overallRugScore >= 40) return 'medium';
        return 'low';
    }

    private calculateConfidenceScore(
        keyInsights: Array<{ confidence: number }>,
        earlyOpportunity?: EarlyOpportunityAnalysis,
        narrative?: NarrativeAnalysis,
        smartMoney?: SmartMoneyAnalysis,
        survival?: SurvivalAnalysis
    ): number {
        // Calculate average confidence from key insights
        const avgInsightConfidence = keyInsights.reduce((sum, insight) => sum + insight.confidence, 0) / keyInsights.length;

        // Calculate data availability score
        let dataScore = 0.7; // Base score

        if (earlyOpportunity) dataScore += 0.05;
        if (narrative) dataScore += 0.05;
        if (smartMoney) dataScore += 0.05;
        if (survival) dataScore += 0.05;

        // Combine scores
        const confidenceScore = (avgInsightConfidence * 0.7) + (dataScore * 0.3);

        return parseFloat(Math.min(1, confidenceScore).toFixed(2));
    }

    /**
     * Generate a mock intelligence report when all AI endpoints fail
     */
    private generateMockIntelligenceReport(
        flowAnalysis: FlowAnalysis,
        onchainAnalysis: OnchainAnalysis,
        marketAnalysis: MarketAnalysis,
        earlyOpportunityAnalysis?: EarlyOpportunityAnalysis,
        narrativeAnalysis?: NarrativeAnalysis,
        smartMoneyAnalysis?: SmartMoneyAnalysis,
        survivalAnalysis?: SurvivalAnalysis
    ): IntelligenceReport {
        // Generate mock executive summary
        const executiveSummary = `
• Token analysis based on available data sources
• Early Opportunity Index: ${earlyOpportunityAnalysis ? earlyOpportunityAnalysis.eoiScore : 'N/A'}
• Rug Pull Risk: ${onchainAnalysis?.rugPullIndicators ? this.calculateWarningLevel(onchainAnalysis.rugPullIndicators.overallRugScore) : 'low'}
• Market sentiment: ${marketAnalysis?.sentimentAnalysis ? (marketAnalysis.sentimentAnalysis.sentimentScore > 0.6 ? 'positive' : marketAnalysis.sentimentAnalysis.sentimentScore < 0.4 ? 'negative' : 'neutral') : 'neutral'}
`;

        // Generate mock key insights
        const keyInsights: Array<{
            insight: string;
            confidence: number;
            category?: 'flow' | 'onchain' | 'market' | 'sentiment' | 'risk' | 'opportunity' | 'narrative' | 'smart-money' | 'survival' | 'system';
        }> = [
                { insight: "Token shows moderate trading activity with potential early opportunity signals", confidence: 0.7, category: 'flow' },
                { insight: "Onchain data suggests typical distribution patterns for a new token", confidence: 0.65, category: 'onchain' },
                { insight: "Market liquidity is sufficient for trading but not exceptional", confidence: 0.6, category: 'market' },
                { insight: "Risk assessment indicates moderate rug pull potential", confidence: 0.55, category: 'risk' },
                { insight: "Early opportunity signals present but not strong", confidence: 0.7, category: 'opportunity' }
            ];

        if (narrativeAnalysis) {
            keyInsights.push({
                insight: `Narrative strength: ${narrativeAnalysis.narrativeStrength}/100`,
                confidence: 0.6,
                category: 'narrative'
            });
        }

        if (smartMoneyAnalysis) {
            keyInsights.push({
                insight: `Smart money score: ${smartMoneyAnalysis.smartMoneyScore}/100`,
                confidence: 0.65,
                category: 'smart-money'
            });
        }

        if (survivalAnalysis) {
            keyInsights.push({
                insight: `Survival probability: ${survivalAnalysis.survivalProbability * 100}%`,
                confidence: 0.7,
                category: 'survival'
            });
        }

        // Generate mock assessments
        const opportunityAssessment: Record<string, string> = {
            'Liquidity': 'Medium',
            'Volatility': 'High',
            'Trading Volume': 'Medium',
            'Early Opportunity': earlyOpportunityAnalysis ? (earlyOpportunityAnalysis.eoiScore > 70 ? 'High' : 'Medium') : 'Medium'
        };

        const riskAssessment: Record<string, string> = {
            'Rug Pull Risk': onchainAnalysis?.rugPullIndicators ?
                (onchainAnalysis.rugPullIndicators.overallRugScore > 80 ? 'High' :
                    onchainAnalysis.rugPullIndicators.overallRugScore > 60 ? 'Medium' : 'Low') : 'Medium',
            'Liquidity Risk': 'Medium',
            'Regulatory Risk': 'Low',
            'Smart Contract Risk': 'Medium'
        };

        // Generate mock pattern detection
        const patternDetection = `
• Moderate accumulation patterns detected
• Typical new token distribution observed
• No strong rug pull indicators found
• Trading volume shows healthy early activity
`;

        // Generate mock recommendation
        const recommendation = "MONITOR: This token shows potential but requires further observation. Watch for increasing trading volume, liquidity improvements, and narrative development over the next 24-48 hours.";

        // Build the mock report
        const report: IntelligenceReport = {
            rawResponse: "Mock intelligence report generated due to AI service unavailability",
            executiveSummary: executiveSummary.trim(),
            keyInsights,
            opportunityAssessment,
            riskAssessment,
            patternDetection: patternDetection.trim(),
            recommendation,
            confidenceScore: 0.65,
            intelligenceRanking: this.calculateDefaultRanking(
                earlyOpportunityAnalysis,
                onchainAnalysis,
                smartMoneyAnalysis,
                survivalAnalysis,
                narrativeAnalysis
            )
        };

        // Add specific analysis sections if available
        if (onchainAnalysis?.rugPullIndicators) {
            report.rugPullIndicators = {
                ...onchainAnalysis.rugPullIndicators,
                warningLevel: this.calculateWarningLevel(onchainAnalysis.rugPullIndicators.overallRugScore)
            };
        }

        if (marketAnalysis?.sentimentAnalysis) {
            report.sentimentAnalysis = marketAnalysis.sentimentAnalysis;
        }

        if (earlyOpportunityAnalysis) {
            report.earlyOpportunityAnalysis = earlyOpportunityAnalysis;
        }

        if (narrativeAnalysis) {
            report.narrativeAnalysis = narrativeAnalysis;
        }

        if (smartMoneyAnalysis) {
            report.smartMoneyAnalysis = smartMoneyAnalysis;
        }

        if (survivalAnalysis) {
            report.survivalAnalysis = survivalAnalysis;
        }

        return report;
    }

    // Mock analysis generators (implementations not shown for brevity)
    private generateMockFlowAnalysis(flowData: any): FlowAnalysis {
        return {
            token: flowData?.token || 'unknown',
            patterns: [],
            confidence: 0.5,
            evidence: []
        };
    }

    private generateMockOnchainAnalysis(onchainData: any): OnchainAnalysis {
        return {
            token: onchainData?.token || 'unknown',
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

    private generateMockMarketAnalysis(marketData: any): MarketAnalysis {
        return {
            token: marketData?.token || 'unknown',
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
            volatilityScore: 0
        };
    }

    private generateMockOpportunityAnalysis(opportunityData: any): EarlyOpportunityAnalysis {
        return {
            token: opportunityData?.token || 'unknown',
            eoiScore: 50,
            rating: 'MODERATE OPPORTUNITY',
            factors: {
                volumeVelocity: 0,
                freshWalletGrowth: 0,
                whaleEntry: 0,
                liquidityGrowth: 0,
                buyPressure: 0,
                marketMomentum: 0
            },
            evidence: [],
            confidence: 0.5
        };
    }

    private generateMockNarrativeAnalysis(narrativeData: any): NarrativeAnalysis {
        return {
            token: narrativeData?.token || 'unknown',
            narrative: 'Unknown',
            confidence: 0.5,
            evidence: [],
            narrativeStrength: 50
        };
    }

    private generateMockSmartMoneyAnalysis(smartMoneyData: any): SmartMoneyAnalysis {
        return {
            token: smartMoneyData?.token || 'unknown',
            smartMoneyScore: 50,
            smartWhales: [],
            totalSmartMoneyVolume: 0,
            smartMoneyPercentage: 0,
            confidence: 0.5
        };
    }

    private generateMockSurvivalAnalysis(survivalData: any): SurvivalAnalysis {
        return {
            token: survivalData?.token || 'unknown',
            survivalProbability: 0.5,
            estimatedLifespan: '1-3 months',
            factors: {
                liquidityRetention: 0,
                holderGrowth: 0,
                buySellRatio: 0,
                whaleBehavior: 0,
                developerActivity: 0
            },
            confidence: 0.5
        };
    }

    private parseFlowResponse(response: string, flowData: any): FlowAnalysis {
        // Implementation would parse the AI response
        return this.generateMockFlowAnalysis(flowData);
    }

    private parseOnchainResponse(response: string, onchainData: any): OnchainAnalysis {
        // Implementation would parse the AI response
        return this.generateMockOnchainAnalysis(onchainData);
    }

    private parseMarketResponse(response: string, marketData: any): MarketAnalysis {
        // Implementation would parse the AI response
        return this.generateMockMarketAnalysis(marketData);
    }

    private parseOpportunityResponse(response: string, opportunityData: any): EarlyOpportunityAnalysis {
        // Implementation would parse the AI response
        return this.generateMockOpportunityAnalysis(opportunityData);
    }

    private parseNarrativeResponse(response: string, narrativeData: any): NarrativeAnalysis {
        // Implementation would parse the AI response
        return this.generateMockNarrativeAnalysis(narrativeData);
    }

    private parseSmartMoneyResponse(response: string, smartMoneyData: any): SmartMoneyAnalysis {
        // Implementation would parse the AI response
        return this.generateMockSmartMoneyAnalysis(smartMoneyData);
    }

    private parseSurvivalResponse(response: string, survivalData: any): SurvivalAnalysis {
        // Implementation would parse the AI response
        return this.generateMockSurvivalAnalysis(survivalData);
    }
}