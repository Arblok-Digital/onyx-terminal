/**
 * @file intelligent_integration/researchManager.ts
 * @desc Core research manager for 9Router Intelligence
 * @handles AI model queries, report generation, and fallback logic
 */

import { getEnv } from './utils';
import { ReportParser } from './reportParser';
import { PromptBuilder } from './promptBuilders';
import { generateIntelligenceReport } from './core/intelligenceReportGenerator';
import { AnalysisAggregator } from './core/analysisAggregator';
import { calculateDefaultRanking } from './core/rankingCalculator';
import type {
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis,
    IntelligenceRanking,
    IntelligenceReport
} from './types/analysisTypes';
import type { AgentConfig } from './types/agentTypes';

export class ResearchManager {
    private endpoints: Map<string, string>;
    private currentModel: string;
    private apiKey: string;
    private taskModels: Record<string, string>;

    constructor() {
        this.endpoints = new Map();
        this.currentModel = '';
        this.apiKey = '';
        this.taskModels = {};

        this.initializeEndpoints();
    }

    /**
     * Initialize available endpoints and models
     */
    private initializeEndpoints(): void {
        // OpenRouter configuration
        const openRouterEndpoint = getEnv('VITE_OPENROUTER_ENDPOINT', 'https://openrouter.ai/api/v1/chat/completions');
        const openRouterKey = getEnv('VITE_OPENROUTER_API_KEY', '');
        const openRouterEnabled = getEnv('VITE_OPENROUTER_ENABLED', 'false') === 'true';

        if (openRouterEnabled && openRouterKey) {
            this.endpoints.set('openrouter', openRouterEndpoint);
            this.apiKey = openRouterKey;
            this.currentModel = 'openrouter/auto';
        }

        // Task-specific model assignments
        this.taskModels = {
            flow: 'openrouter/auto',
            onchain: 'openrouter/auto',
            market: 'openrouter/auto',
            opportunity: 'openrouter/auto',
            narrative: 'openrouter/auto',
            smartMoney: 'openrouter/auto',
            survival: 'openrouter/auto',
            research: 'openrouter/auto'
        };
    }

    /**
     * Check if real API keys are available
     */
    hasRealApiKeys(): boolean {
        return this.apiKey !== '';
    }

    /**
     * Query the AI model with fallback logic
     */
    private async queryModel(prompt: string, taskType: string = 'research'): Promise<string> {
        if (!this.hasRealApiKeys()) {
            return this.generateMockResponse(prompt, taskType);
        }

        const model = this.taskModels[taskType] || this.currentModel;
        const endpoint = this.endpoints.get(model.split('/')[0]) || this.endpoints.get('openrouter');

        if (!endpoint) {
            return this.generateMockResponse(prompt, taskType);
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) {
                console.warn(`API request failed with status ${response.status}`);
                return this.generateMockResponse(prompt, taskType);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || this.generateMockResponse(prompt, taskType);

        } catch (error) {
            console.error('Error querying model:', error);
            return this.generateMockResponse(prompt, taskType);
        }
    }

    /**
     * Generate a mock response for testing or when API is unavailable
     */
    private generateMockResponse(prompt: string, taskType: string): string {
        // Extract the section name from the prompt
        const sectionMatch = prompt.match(/## (.*?) Prompt/);
        const sectionName = sectionMatch ? sectionMatch[1] : 'Analysis';

        return `
${sectionName}:
This is a mock response. In a real implementation, this would contain detailed analysis based on the provided data.

Key Insights:
- Insight 1: Mock insight based on ${taskType} analysis (Confidence: 75%)
- Insight 2: Additional mock insight for demonstration purposes (Confidence: 65%)

Confidence Score: 70%
`;
    }

    /**
     * Build comprehensive research prompt
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
        const flowPrompt = PromptBuilder.buildFlowPrompt(flow);
        const onchainPrompt = PromptBuilder.buildOnchainPrompt(onchain);
        const marketPrompt = PromptBuilder.buildMarketPrompt(market);

        const opportunityPrompt = earlyOpportunity ? PromptBuilder.buildOpportunityPrompt(earlyOpportunity) : '';
        const narrativePrompt = narrative ? PromptBuilder.buildNarrativePrompt(narrative) : '';
        const smartMoneyPrompt = smartMoney ? PromptBuilder.buildSmartMoneyPrompt(smartMoney) : '';
        const survivalPrompt = survival ? PromptBuilder.buildSurvivalPrompt(survival) : '';

        return `
## Comprehensive Intelligence Research Prompt

Analyze the following token from multiple perspectives to generate a comprehensive intelligence report.
Combine insights from all available data sources and provide actionable recommendations.

### Individual Analysis Sections:
${flowPrompt}

${onchainPrompt}

${marketPrompt}

${opportunityPrompt}

${narrativePrompt}

${smartMoneyPrompt}

${survivalPrompt}

### Synthesis Instructions:
1. Combine insights from all individual analyses
2. Identify cross-cutting themes and patterns
3. Assess overall opportunity vs. risk balance
4. Calculate confidence scores for each section
5. Generate an executive summary
6. Provide key insights with confidence levels
7. Calculate an overall intelligence ranking
8. Provide a final recommendation

### Response Format:
Executive Summary:
[Concise summary of key findings]

Key Insights:
- Insight 1: [description] (Confidence: [X]%)
- Insight 2: [description] (Confidence: [X]%)
- Insight 3: [description] (Confidence: [X]%)

Opportunity Assessment:
- Factor 1: [description]
- Factor 2: [description]
- Factor 3: [description]

Risk Assessment:
- Risk 1: [description]
- Risk 2: [description]
- Risk 3: [description]

Pattern Detection:
[Description of any detected patterns or anomalies]

Intelligence Ranking:
- Opportunity: [X]%
- Risk: [X]%
- Smart Money: [X]%
- Survival: [X]%
- Narrative: [X]%
- Overall: [X]% (Rating: [AVOID/CAUTION/MONITOR/WATCH/POTENTIAL/OPPORTUNITY/STRONG OPPORTUNITY])

Recommendation:
[Actionable recommendation based on analysis]

Confidence Score: [X]%
`;
    }

    /**
     * Generate comprehensive intelligence report
     */
    async generateIntelligenceReport(
        flow: FlowAnalysis,
        onchain: OnchainAnalysis,
        market: MarketAnalysis,
        earlyOpportunity?: EarlyOpportunityAnalysis,
        narrative?: NarrativeAnalysis,
        smartMoney?: SmartMoneyAnalysis,
        survival?: SurvivalAnalysis
    ): Promise<IntelligenceReport> {
        if (!this.hasRealApiKeys()) {
            return this.generateMockIntelligenceReport(flow, onchain, market, earlyOpportunity, narrative, smartMoney, survival);
        }

        try {
            const researchPrompt = this.buildResearchPrompt(flow, onchain, market, earlyOpportunity, narrative, smartMoney, survival);
            const rawResponse = await this.queryModel(researchPrompt, 'research');

            return ReportParser.parseIntelligenceResponse(rawResponse);

        } catch (error) {
            console.error('Error generating intelligence report:', error);
            return this.generateMockIntelligenceReport(flow, onchain, market, earlyOpportunity, narrative, smartMoney, survival);
        }
    }

    /**
     * Generate mock intelligence report for testing
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
        return AnalysisAggregator.generateMockIntelligenceReport(
            flow, onchain, market, earlyOpportunity, narrative, smartMoney, survival
        );
    }

    /**
     * Generate mock flow analysis
     */
    private generateMockFlowAnalysis(flowData: any): FlowAnalysis {
        return AnalysisAggregator.generateMockFlowAnalysis(flowData);
    }

    /**
     * Generate mock onchain analysis
     */
    private generateMockOnchainAnalysis(onchainData: any): OnchainAnalysis {
        return AnalysisAggregator.generateMockOnchainAnalysis(onchainData);
    }

    /**
     * Generate mock market analysis
     */
    private generateMockMarketAnalysis(marketData: any): MarketAnalysis {
        return AnalysisAggregator.generateMockMarketAnalysis(marketData);
    }

    /**
     * Generate mock opportunity analysis
     */
    private generateMockOpportunityAnalysis(opportunityData: any): EarlyOpportunityAnalysis {
        return AnalysisAggregator.generateMockOpportunityAnalysis(opportunityData);
    }

    /**
     * Generate mock narrative analysis
     */
    private generateMockNarrativeAnalysis(narrativeData: any): NarrativeAnalysis {
        return AnalysisAggregator.generateMockNarrativeAnalysis(narrativeData);
    }

    /**
     * Generate mock smart money analysis
     */
    private generateMockSmartMoneyAnalysis(smartMoneyData: any): SmartMoneyAnalysis {
        return AnalysisAggregator.generateMockSmartMoneyAnalysis(smartMoneyData);
    }

    /**
     * Generate mock survival analysis
     */
    private generateMockSurvivalAnalysis(survivalData: any): SurvivalAnalysis {
        return AnalysisAggregator.generateMockSurvivalAnalysis(survivalData);
    }
}