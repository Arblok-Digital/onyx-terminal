/**
 * @file buildPrompts.ts
 * @layer service
 * @desc Prompt building functions for various analysis types
 * @exposes buildFlowPrompt, buildOnchainPrompt, buildMarketPrompt, etc.
 */

import {
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis
} from '../../types/analysisTypes';

/**
 * Build flow analysis prompt
 */
export function buildFlowPrompt(flowData: FlowAnalysis): string {
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
export function buildOnchainPrompt(onchainData: OnchainAnalysis): string {
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
export function buildMarketPrompt(marketData: MarketAnalysis): string {
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
export function buildOpportunityPrompt(opportunityData: EarlyOpportunityAnalysis): string {
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
export function buildNarrativePrompt(narrativeData: NarrativeAnalysis): string {
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
export function buildSmartMoneyPrompt(smartMoneyData: SmartMoneyAnalysis): string {
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
export function buildSurvivalPrompt(survivalData: SurvivalAnalysis): string {
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
 * Build comprehensive research prompt combining all analyses
 */
export function buildResearchPrompt(
    flowAnalysis: FlowAnalysis,
    onchainAnalysis: OnchainAnalysis,
    marketAnalysis: MarketAnalysis,
    earlyOpportunityAnalysis?: EarlyOpportunityAnalysis,
    narrativeAnalysis?: NarrativeAnalysis,
    smartMoneyAnalysis?: SmartMoneyAnalysis,
    survivalAnalysis?: SurvivalAnalysis
): string {
    const sections: string[] = [];

    sections.push('# COMPREHENSIVE TOKEN INTELLIGENCE REPORT\n');
    sections.push('Generate a comprehensive intelligence report from the following data sources:\n');

    sections.push('## 1. FLOW ANALYSIS\n');
    sections.push(JSON.stringify(flowAnalysis, null, 2));
    sections.push('');

    sections.push('## 2. ONCHAIN ANALYSIS\n');
    sections.push(JSON.stringify(onchainAnalysis, null, 2));
    sections.push('');

    sections.push('## 3. MARKET ANALYSIS\n');
    sections.push(JSON.stringify(marketAnalysis, null, 2));
    sections.push('');

    if (earlyOpportunityAnalysis) {
        sections.push('## 4. EARLY OPPORTUNITY ANALYSIS\n');
        sections.push(JSON.stringify(earlyOpportunityAnalysis, null, 2));
        sections.push('');
    }

    if (narrativeAnalysis) {
        sections.push('## 5. NARRATIVE ANALYSIS\n');
        sections.push(JSON.stringify(narrativeAnalysis, null, 2));
        sections.push('');
    }

    if (smartMoneyAnalysis) {
        sections.push('## 6. SMART MONEY ANALYSIS\n');
        sections.push(JSON.stringify(smartMoneyAnalysis, null, 2));
        sections.push('');
    }

    if (survivalAnalysis) {
        sections.push('## 7. SURVIVAL ANALYSIS\n');
        sections.push(JSON.stringify(survivalAnalysis, null, 2));
        sections.push('');
    }

    sections.push('\n## REQUIRED OUTPUT FORMAT\n');
    sections.push('Provide a comprehensive intelligence report with:');
    sections.push('- Executive Summary (2-3 sentences)');
    sections.push('- Key Insights (3-5 bullet points with confidence scores)');
    sections.push('- Risk Assessment (with specific risk levels)');
    sections.push('- Opportunity Assessment (with specific opportunities)');
    sections.push('- Pattern Detection (identified patterns with confidence)');
    sections.push('- Rug Pull Indicators (with overall risk score 0-100)');
    sections.push('- Recommendation (STRONG BUY / BUY / HOLD / SELL / AVOID)');
    sections.push('- Confidence Score (0-1)');

    return sections.join('\n');
}