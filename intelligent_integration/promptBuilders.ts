/**
 * @file intelligent_integration/promptBuilders.ts
 * @desc Prompt building methods for different analysis types.
 *       All field access is null-safe for V3 optional types.
 */

import type {
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis
} from './types/analysisTypes';

/**
 * Safe fallback for optional nested objects.
 * When a V3 optional field is undefined, provides an empty object
 * cast to the proper type so property access (with ?? chaining) compiles.
 */
function safeObj<T extends object>(val: T | undefined): T {
    return val ?? ({} as T);
}

export class PromptBuilder {
    /** Build prompt for flow analysis */
    static buildFlowPrompt(flowData: FlowAnalysis): string {
        const patternsStr = (flowData.patterns ?? []).map(p =>
            `- ${p.type}: ${p.strength ?? 'N/A'}/100`
        ).join('\n') || 'No patterns detected';

        const rt = flowData.realtimeData;
        const realtimeStr = rt
            ? `\n- Buy Pressure: ${rt.buyPressure ?? 'N/A'}\n- Sell Pressure: ${rt.sellPressure ?? 'N/A'}\n- Volume Growth: ${rt.volumeGrowth ?? 'N/A'}\n- Whale Activity: ${rt.whaleActivity ?? 'N/A'}`
            : 'Not available';

        return `
## Flow Analysis Prompt

Analyze the token flow patterns for ${flowData.token} based on the following data:

### Flow Patterns Detected:
${patternsStr}

### Realtime Data (if available):
${realtimeStr}

### Analysis Instructions:
1. Identify the dominant flow patterns and their significance
2. Assess the balance between buy and sell pressure
3. Evaluate the potential impact of whale activity on price movement
4. Provide a confidence score (0-100) for your analysis
5. List key insights with supporting evidence
6. Suggest potential trading strategies based on flow patterns

### Response Format:
Flow Analysis:
[Your analysis here]

Key Insights:
- Insight 1: [description] (Confidence: [X]%)
- Insight 2: [description] (Confidence: [X]%)

Confidence Score: [X]%
`;
    }

    /** Build prompt for onchain analysis */
    static buildOnchainPrompt(onchainData: OnchainAnalysis): string {
        const wa = safeObj(onchainData.whaleActivity);
        const hg = safeObj(onchainData.holderGrowth);
        const da = safeObj(onchainData.developerActivity);
        const la = safeObj(onchainData.liquidityAnalysis);
        const ri = safeObj(onchainData.rugPullIndicators);
        const ca = onchainData.contractAnalysis;

        const devWallets = (da.devWallets ?? []).length > 0
            ? `- Dev Wallets: ${(da.devWallets ?? []).join(', ')}`
            : '';

        const contractStr = ca
            ? `\n- Age: ${ca.age} days\n- Creator: ${ca.creator}\n- Mint Authority: ${ca.mintAuthority}\n- Freeze Authority: ${ca.freezeAuthority}\n- Verified: ${ca.isVerified}\n- Renounced: ${ca.renounced}`
            : 'Not available';

        return `
## Onchain Analysis Prompt

Analyze the onchain metrics for ${onchainData.token} based on the following data:

### Whale Activity:
- Large Transfers: ${wa.largeTransfers ?? 'N/A'}
- Whale Wallets: ${wa.whaleWallets ?? 'N/A'}
- Concentration: ${wa.concentration ?? 'N/A'}%

### Holder Growth:
- New Holders: ${hg.newHolders ?? 'N/A'}
- Growth Rate: ${hg.growthRate ?? 'N/A'}%

### Developer Activity:
- Dev Wallet Transactions: ${da.devWalletTransactions ?? 'N/A'}
- Suspicious Transfers: ${da.suspiciousTransfers ?? 'N/A'}
- Dev Wallet Balance: ${da.devWalletBalance ?? 'N/A'}
${devWallets}

### Liquidity Analysis:
- Liquidity Depth: ${la.liquidityDepth ?? 'N/A'}
- Liquidity Change (24h): ${la.liquidityChange24h ?? 'N/A'}%
- Locked Liquidity: ${la.lockedLiquidity ?? 'N/A'}%
- Liquidity Concentration: ${la.liquidityConcentration ?? 'N/A'}%

### Rug Pull Indicators:
- Dump Score: ${ri.dumpScore ?? 'N/A'}/100
- Liquidity Removal Score: ${ri.liquidityRemovalScore ?? 'N/A'}/100
- Dev Wallet Activity Score: ${ri.devWalletActivityScore ?? 'N/A'}/100
- Overall Rug Score: ${ri.overallRugScore ?? 'N/A'}/100

### Contract Analysis (if available):
${contractStr}

### Analysis Instructions:
1. Assess the risk level based on rug pull indicators
2. Evaluate whale activity and its potential impact
3. Analyze holder distribution and growth trends
4. Examine developer activity for suspicious behavior
5. Evaluate liquidity health and concentration risks
6. Calculate an overall risk score (0-100)
7. Provide key insights with confidence levels
8. Suggest risk mitigation strategies

### Response Format:
Onchain Analysis:
[Your analysis here]

Risk Assessment:
- Centralization Risk: [description]
- Liquidity Risk: [description]
- Developer Risk: [description]
- Contract Risk: [description]

Key Insights:
- Insight 1: [description] (Confidence: [X]%)
- Insight 2: [description] (Confidence: [X]%)

Rug Pull Indicators:
- Dump Risk: [X]/100
- Liquidity Removal Risk: [X]/100
- Dev Wallet Risk: [X]/100
- Overall Rug Score: [X]/100 (Warning Level: [low/medium/high/critical])

Risk Score: [X]/100
`;
    }

    /** Build prompt for market analysis */
    static buildMarketPrompt(marketData: MarketAnalysis): string {
        const pt = safeObj(marketData.priceTrend);
        const va = safeObj(marketData.volumeAnalysis);
        const la = safeObj(marketData.liquidityAnalysis);

        const suspiciousVolStr = va.suspiciousVolume
            ? `- Suspicious Volume: $${va.suspiciousVolume}`
            : '';

        const liqChangeStr = la.change24h !== undefined
            ? `- 24h Change: ${la.change24h}%`
            : '';

        const mcapStr = marketData.marketCap
            ? `- Market Cap: $${marketData.marketCap}`
            : 'Not available';

        const sa = marketData.sentimentAnalysis;
        const sentimentStr = sa
            ? `\n- Sentiment Score: ${sa.sentimentScore}/100\n- Positive Mentions: ${sa.positiveMentions}\n- Negative Mentions: ${sa.negativeMentions}\n- Neutral Mentions: ${sa.neutralMentions}\n- Sentiment Trend: ${sa.sentimentTrend}\n- Source: ${sa.source}`
            : 'Not available';

        return `
## Market Analysis Prompt

Analyze the market dynamics for ${marketData.token} based on the following data:

### Price Trend:
- Current Price: $${pt.current ?? 'N/A'}
- 24h Change: ${pt.change24h ?? 'N/A'}%
- 7d Change: ${pt.change7d ?? 'N/A'}%

### Volume Analysis:
- 24h Volume: $${va.volume24h ?? 'N/A'}
- Volume Change: ${va.volumeChange ?? 'N/A'}%
${suspiciousVolStr}

### Liquidity Analysis:
- Depth: $${la.depth ?? 'N/A'}
- Slippage: ${la.slippage ?? 'N/A'}%
${liqChangeStr}

### Market Cap:
${mcapStr}

### Sentiment Analysis:
${sentimentStr}

### Volatility Score: ${marketData.volatilityScore ?? 'N/A'}/100

### Analysis Instructions:
1. Analyze price trends and identify key support/resistance levels
2. Assess volume patterns and detect any anomalies
3. Evaluate liquidity health and potential slippage risks
4. Analyze market sentiment and its impact on price
5. Calculate volatility and assess risk/reward potential
6. Identify potential market manipulation signals
7. Provide key insights with confidence levels
8. Suggest trading strategies based on market conditions

### Response Format:
Market Analysis:
[Your analysis here]

Price Trend Assessment:
- Current Trend: [bullish/bearish/neutral]
- Key Levels: [support/resistance]
- Momentum: [strong/moderate/weak]

Volume Analysis:
- Volume Health: [healthy/suspicious/low]
- Anomalies Detected: [description]

Liquidity Assessment:
- Depth: [deep/moderate/shallow]
- Slippage Risk: [high/medium/low]

Sentiment Analysis:
- Overall Sentiment: [positive/neutral/negative]
- Sentiment Trend: [improving/stable/declining]

Key Insights:
- Insight 1: [description] (Confidence: [X]%)
- Insight 2: [description] (Confidence: [X]%)

Volatility Score: [X]/100
`;
    }

    /** Build prompt for early opportunity analysis */
    static buildOpportunityPrompt(opportunityData: EarlyOpportunityAnalysis): string {
        const f = safeObj(opportunityData.factors);
        const evidenceStr = (opportunityData.evidence ?? []).map(e => `- ${e}`).join('\n') || 'No evidence available';

        return `
## Early Opportunity Analysis Prompt

Analyze the early opportunity signals for ${opportunityData.token} based on the following data:

### Opportunity Factors:
- Volume Velocity: ${f.volumeVelocity ?? 'N/A'}/100
- Fresh Wallet Growth: ${f.freshWalletGrowth ?? 'N/A'}/100
- Whale Entry: ${f.whaleEntry ?? 'N/A'}/100
- Liquidity Growth: ${f.liquidityGrowth ?? 'N/A'}/100
- Buy Pressure: ${f.buyPressure ?? 'N/A'}/100
- Market Momentum: ${f.marketMomentum ?? 'N/A'}/100

### Current Rating: ${opportunityData.rating ?? 'N/A'}
### Current EOI Score: ${opportunityData.eoiScore ?? 'N/A'}/100

### Evidence:
${evidenceStr}

### Analysis Instructions:
1. Assess the strength of early opportunity signals
2. Evaluate the balance between different opportunity factors
3. Identify the most significant drivers of opportunity
4. Compare against historical patterns of successful tokens
5. Calculate an updated Early Opportunity Index (EOI) score (0-100)
6. Provide a rating (LOW/MODERATE/HIGH/EXTREME OPPORTUNITY)
7. List key insights with supporting evidence
8. Suggest entry/exit strategies based on opportunity signals

### Response Format:
Early Opportunity Analysis:
[Your analysis here]

Opportunity Assessment:
- Volume Velocity: [X]/100 (Impact: [high/medium/low])
- Fresh Wallet Growth: [X]/100 (Impact: [high/medium/low])
- Whale Entry: [X]/100 (Impact: [high/medium/low])
- Liquidity Growth: [X]/100 (Impact: [high/medium/low])
- Buy Pressure: [X]/100 (Impact: [high/medium/low])
- Market Momentum: [X]/100 (Impact: [high/medium/low])

Key Insights:
- Insight 1: [description] (Confidence: [X]%)
- Insight 2: [description] (Confidence: [X]%)

Updated EOI Score: [X]/100
Updated Rating: [LOW/MODERATE/HIGH/EXTREME OPPORTUNITY]
`;
    }

    /** Build prompt for narrative analysis */
    static buildNarrativePrompt(narrativeData: NarrativeAnalysis): string {
        const evidenceStr = (narrativeData.evidence ?? []).map(e => `- ${e}`).join('\n') || 'No evidence available';
        const relatedStr = (narrativeData.relatedTokens ?? []).length > 0
            ? (narrativeData.relatedTokens ?? []).map(t => `- ${t}`).join('\n')
            : 'None';

        return `
## Narrative Analysis Prompt

Analyze the narrative and market story for ${narrativeData.token} based on the following data:

### Current Narrative: "${narrativeData.narrative ?? 'Unknown'}"
### Narrative Strength: ${narrativeData.narrativeStrength ?? 'N/A'}/100
### Confidence: ${narrativeData.confidence ?? 'N/A'}/100

### Evidence:
${evidenceStr}

### Related Tokens:
${relatedStr}

### Analysis Instructions:
1. Assess the strength and coherence of the current narrative
2. Evaluate how well the narrative aligns with market conditions
3. Identify potential narrative shifts or emerging themes
4. Compare against historical successful narratives
5. Analyze the potential impact on price and adoption
6. Suggest ways to strengthen or pivot the narrative
7. Provide key insights with confidence levels
8. Update narrative strength score (0-100)

### Response Format:
Narrative Analysis:
[Your analysis here]

Narrative Assessment:
- Current Narrative: [description]
- Strength: [X]/100
- Alignment with Market: [high/medium/low]
- Potential Shifts: [description]

Key Insights:
- Insight 1: [description] (Confidence: [X]%)
- Insight 2: [description] (Confidence: [X]%)

Related Tokens Analysis:
${relatedStr === 'None' ? 'None' : (narrativeData.relatedTokens ?? []).map(t => `- ${t}: [analysis]`).join('\n')}

Updated Narrative Strength: [X]/100
`;
    }

    /** Build prompt for smart money analysis */
    static buildSmartMoneyPrompt(smartMoneyData: SmartMoneyAnalysis): string {
        const whales = smartMoneyData.smartWhales ?? [];

        const whalesDetail = whales.map(w =>
            `\n- Address: ${w.address}\n  - Win Rate: ${w.winRate ?? 'N/A'}%\n  - ROI History: ${w.roiHistory ?? 'N/A'}%\n  - Entry Quality: ${w.entryQuality ?? 'N/A'}/100`
        ).join('\n');

        const whalesAssessment = whales.map(w =>
            `\n- ${w.address}:\n  - Win Rate: [X]% (Impact: [high/medium/low])\n  - ROI History: [X]% (Impact: [high/medium/low])\n  - Entry Quality: [X]/100 (Impact: [high/medium/low])`
        ).join('\n');

        return `
## Smart Money Analysis Prompt

Analyze smart money activity for ${smartMoneyData.token} based on the following data:

### Smart Money Score: ${smartMoneyData.smartMoneyScore ?? 'N/A'}/100
### Total Smart Money Volume: $${smartMoneyData.totalSmartMoneyVolume ?? 'N/A'}
### Smart Money Percentage: ${smartMoneyData.smartMoneyPercentage ?? 'N/A'}%
### Confidence: ${smartMoneyData.confidence ?? 'N/A'}/100

### Smart Whales:
${whalesDetail || 'No smart whales detected'}

### Analysis Instructions:
1. Assess the quality of smart money participation
2. Evaluate the track record of identified smart whales
3. Analyze the potential impact on price movement
4. Identify patterns of smart money accumulation/distribution
5. Compare against historical smart money behavior
6. Calculate an updated smart money score (0-100)
7. Provide key insights with confidence levels
8. Suggest trading strategies based on smart money activity

### Response Format:
Smart Money Analysis:
[Your analysis here]

Smart Whales Assessment:
${whalesAssessment || 'No smart whales to assess'}

Key Insights:
- Insight 1: [description] (Confidence: [X]%)
- Insight 2: [description] (Confidence: [X]%)

Updated Smart Money Score: [X]/100
`;
    }

    /** Build prompt for survival analysis */
    static buildSurvivalPrompt(survivalData: SurvivalAnalysis): string {
        const f = safeObj(survivalData.factors);

        return `
## Survival Analysis Prompt

Analyze the survival probability for ${survivalData.token} based on the following data:

### Current Survival Probability: ${survivalData.survivalProbability ?? 'N/A'}%
### Estimated Lifespan: ${survivalData.estimatedLifespan ?? 'unknown'}
### Confidence: ${survivalData.confidence ?? 'N/A'}/100

### Survival Factors:
- Liquidity Retention: ${f.liquidityRetention ?? 'N/A'}/100
- Holder Growth: ${f.holderGrowth ?? 'N/A'}/100
- Buy/Sell Ratio: ${f.buySellRatio ?? 'N/A'}/100
- Whale Behavior: ${f.whaleBehavior ?? 'N/A'}/100
- Developer Activity: ${f.developerActivity ?? 'N/A'}/100

### Analysis Instructions:
1. Assess each survival factor and its impact on longevity
2. Evaluate the overall health of the token ecosystem
3. Identify potential existential risks
4. Compare against historical survival patterns
5. Calculate an updated survival probability (0-100)
6. Estimate lifespan range (1-3 days, 3-7 days, 1-4 weeks, 1+ months)
7. Provide key insights with confidence levels
8. Suggest strategies to improve survival chances

### Response Format:
Survival Analysis:
[Your analysis here]

Survival Factors Assessment:
- Liquidity Retention: [X]/100 (Impact: [high/medium/low])
- Holder Growth: [X]/100 (Impact: [high/medium/low])
- Buy/Sell Ratio: [X]/100 (Impact: [high/medium/low])
- Whale Behavior: [X]/100 (Impact: [high/medium/low])
- Developer Activity: [X]/100 (Impact: [high/medium/low])

Key Insights:
- Insight 1: [description] (Confidence: [X]%)
- Insight 2: [description] (Confidence: [X]%)

Risk Assessment:
- Existential Risks: [description]
- Mitigation Strategies: [description]

Updated Survival Probability: [X]%
Updated Estimated Lifespan: [1-3 days/3-7 days/1-4 weeks/1+ months]
`;
    }
}