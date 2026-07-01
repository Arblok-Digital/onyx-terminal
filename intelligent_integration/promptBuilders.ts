/**
 * @file intelligent_integration/promptBuilders.ts
 * @desc Prompt building methods for different analysis types
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

export class PromptBuilder {
    /**
     * Build prompt for flow analysis
     */
    static buildFlowPrompt(flowData: FlowAnalysis): string {
        return `
## Flow Analysis Prompt

Analyze the token flow patterns for ${flowData.token} based on the following data:

### Flow Patterns Detected:
${flowData.patterns.map(pattern => `- ${pattern.type}: ${pattern.strength}/100 (${pattern.evidence.join(', ')})`).join('\n')}

### Realtime Data (if available):
${flowData.realtimeData ? `
- Buy Pressure: ${flowData.realtimeData.buyPressure}
- Sell Pressure: ${flowData.realtimeData.sellPressure}
- Volume Growth: ${flowData.realtimeData.volumeGrowth}
- Whale Activity: ${flowData.realtimeData.whaleActivity}
` : 'Not available'}

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

    /**
     * Build prompt for onchain analysis
     */
    static buildOnchainPrompt(onchainData: OnchainAnalysis): string {
        return `
## Onchain Analysis Prompt

Analyze the onchain metrics for ${onchainData.token} based on the following data:

### Whale Activity:
- Large Transfers: ${onchainData.whaleActivity.largeTransfers}
- Whale Wallets: ${onchainData.whaleActivity.whaleWallets}
- Concentration: ${onchainData.whaleActivity.concentration}%

### Holder Growth:
- New Holders: ${onchainData.holderGrowth.newHolders}
- Growth Rate: ${onchainData.holderGrowth.growthRate}%

### Developer Activity:
- Dev Wallet Transactions: ${onchainData.developerActivity.devWalletTransactions}
- Suspicious Transfers: ${onchainData.developerActivity.suspiciousTransfers}
- Dev Wallet Balance: ${onchainData.developerActivity.devWalletBalance}
${onchainData.developerActivity.devWallets.length > 0 ? `- Dev Wallets: ${onchainData.developerActivity.devWallets.join(', ')}` : ''}

### Liquidity Analysis:
- Liquidity Depth: ${onchainData.liquidityAnalysis.liquidityDepth}
- Liquidity Change (24h): ${onchainData.liquidityAnalysis.liquidityChange24h}%
- Locked Liquidity: ${onchainData.liquidityAnalysis.lockedLiquidity}%
- Liquidity Concentration: ${onchainData.liquidityAnalysis.liquidityConcentration}%

### Rug Pull Indicators:
- Dump Score: ${onchainData.rugPullIndicators.dumpScore}/100
- Liquidity Removal Score: ${onchainData.rugPullIndicators.liquidityRemovalScore}/100
- Dev Wallet Activity Score: ${onchainData.rugPullIndicators.devWalletActivityScore}/100
- Overall Rug Score: ${onchainData.rugPullIndicators.overallRugScore}/100

### Contract Analysis (if available):
${onchainData.contractAnalysis ? `
- Age: ${onchainData.contractAnalysis.age} days
- Creator: ${onchainData.contractAnalysis.creator}
- Mint Authority: ${onchainData.contractAnalysis.mintAuthority}
- Freeze Authority: ${onchainData.contractAnalysis.freezeAuthority}
- Verified: ${onchainData.contractAnalysis.isVerified}
- Renounced: ${onchainData.contractAnalysis.renounced}
` : 'Not available'}

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

    /**
     * Build prompt for market analysis
     */
    static buildMarketPrompt(marketData: MarketAnalysis): string {
        return `
## Market Analysis Prompt

Analyze the market dynamics for ${marketData.token} based on the following data:

### Price Trend:
- Current Price: $${marketData.priceTrend.current}
- 24h Change: ${marketData.priceTrend.change24h}%
- 7d Change: ${marketData.priceTrend.change7d}%

### Volume Analysis:
- 24h Volume: $${marketData.volumeAnalysis.volume24h}
- Volume Change: ${marketData.volumeAnalysis.volumeChange}%
${marketData.volumeAnalysis.suspiciousVolume ? `- Suspicious Volume: $${marketData.volumeAnalysis.suspiciousVolume}` : ''}

### Liquidity Analysis:
- Depth: $${marketData.liquidityAnalysis.depth}
- Slippage: ${marketData.liquidityAnalysis.slippage}%
${marketData.liquidityAnalysis.change24h ? `- 24h Change: ${marketData.liquidityAnalysis.change24h}%` : ''}

### Market Cap:
${marketData.marketCap ? `- Market Cap: $${marketData.marketCap}` : 'Not available'}

### Sentiment Analysis:
${marketData.sentimentAnalysis ? `
- Sentiment Score: ${marketData.sentimentAnalysis.sentimentScore}/100
- Positive Mentions: ${marketData.sentimentAnalysis.positiveMentions}
- Negative Mentions: ${marketData.sentimentAnalysis.negativeMentions}
- Neutral Mentions: ${marketData.sentimentAnalysis.neutralMentions}
- Sentiment Trend: ${marketData.sentimentAnalysis.sentimentTrend}
- Source: ${marketData.sentimentAnalysis.source}
` : 'Not available'}

### Volatility Score: ${marketData.volatilityScore}/100

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

    /**
     * Build prompt for early opportunity analysis
     */
    static buildOpportunityPrompt(opportunityData: EarlyOpportunityAnalysis): string {
        return `
## Early Opportunity Analysis Prompt

Analyze the early opportunity signals for ${opportunityData.token} based on the following data:

### Opportunity Factors:
- Volume Velocity: ${opportunityData.factors.volumeVelocity}/100
- Fresh Wallet Growth: ${opportunityData.factors.freshWalletGrowth}/100
- Whale Entry: ${opportunityData.factors.whaleEntry}/100
- Liquidity Growth: ${opportunityData.factors.liquidityGrowth}/100
- Buy Pressure: ${opportunityData.factors.buyPressure}/100
- Market Momentum: ${opportunityData.factors.marketMomentum}/100

### Current Rating: ${opportunityData.rating}
### Current EOI Score: ${opportunityData.eoiScore}/100

### Evidence:
${opportunityData.evidence.map(e => `- ${e}`).join('\n')}

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

    /**
     * Build prompt for narrative analysis
     */
    static buildNarrativePrompt(narrativeData: NarrativeAnalysis): string {
        return `
## Narrative Analysis Prompt

Analyze the narrative and market story for ${narrativeData.token} based on the following data:

### Current Narrative: "${narrativeData.narrative}"
### Narrative Strength: ${narrativeData.narrativeStrength}/100
### Confidence: ${narrativeData.confidence}/100

### Evidence:
${narrativeData.evidence.map(e => `- ${e}`).join('\n')}

### Related Tokens:
${narrativeData.relatedTokens && narrativeData.relatedTokens.length > 0 ? narrativeData.relatedTokens.map(t => `- ${t}`).join('\n') : 'None'}

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
${narrativeData.relatedTokens && narrativeData.relatedTokens.length > 0 ? `
- ${narrativeData.relatedTokens.map(t => `${t}: [analysis]`).join('\n- ')}
` : 'None'}

Updated Narrative Strength: [X]/100
`;
    }

    /**
     * Build prompt for smart money analysis
     */
    static buildSmartMoneyPrompt(smartMoneyData: SmartMoneyAnalysis): string {
        return `
## Smart Money Analysis Prompt

Analyze smart money activity for ${smartMoneyData.token} based on the following data:

### Smart Money Score: ${smartMoneyData.smartMoneyScore}/100
### Total Smart Money Volume: $${smartMoneyData.totalSmartMoneyVolume}
### Smart Money Percentage: ${smartMoneyData.smartMoneyPercentage}%
### Confidence: ${smartMoneyData.confidence}/100

### Smart Whales:
${smartMoneyData.smartWhales.map(whale => `
- Address: ${whale.address}
  - Win Rate: ${whale.winRate}%
  - ROI History: ${whale.roiHistory}%
  - Entry Quality: ${whale.entryQuality}/100
`).join('\n')}

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
${smartMoneyData.smartWhales.map(whale => `
- ${whale.address}:
  - Win Rate: [X]% (Impact: [high/medium/low])
  - ROI History: [X]% (Impact: [high/medium/low])
  - Entry Quality: [X]/100 (Impact: [high/medium/low])
`).join('\n')}

Key Insights:
- Insight 1: [description] (Confidence: [X]%)
- Insight 2: [description] (Confidence: [X]%)

Updated Smart Money Score: [X]/100
`;
    }

    /**
     * Build prompt for survival analysis
     */
    static buildSurvivalPrompt(survivalData: SurvivalAnalysis): string {
        return `
## Survival Analysis Prompt

Analyze the survival probability for ${survivalData.token} based on the following data:

### Current Survival Probability: ${survivalData.survivalProbability}%
### Estimated Lifespan: ${survivalData.estimatedLifespan}
### Confidence: ${survivalData.confidence}/100

### Survival Factors:
- Liquidity Retention: ${survivalData.factors.liquidityRetention}/100
- Holder Growth: ${survivalData.factors.holderGrowth}/100
- Buy/Sell Ratio: ${survivalData.factors.buySellRatio}/100
- Whale Behavior: ${survivalData.factors.whaleBehavior}/100
- Developer Activity: ${survivalData.factors.developerActivity}/100

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