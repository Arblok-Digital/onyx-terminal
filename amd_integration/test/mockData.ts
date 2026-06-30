/**
 * Mock Intelligence Data for UI Testing
 * Pure data — no AgentOrchestrator / API dependencies.
 * Safe to import in browser (Vite) context.
 */

// ── Sample addresses ──────────────────────────────────────────
export const SAMPLE_TOKENS = {
    YUNO: 'YUNO_ADDRESS_SAMPLE',
    ZEX: 'ZEX_ADDRESS_SAMPLE',
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
} as const;

// ── Helpers ────────────────────────────────────────────────────
function getTokenName(addr: string): string {
    const entry = Object.entries(SAMPLE_TOKENS).find(([, v]) => v === addr);
    return entry?.[0] ?? 'UNKNOWN';
}

// ── Core mock factory ──────────────────────────────────────────
export function createMockIntelligenceReport(tokenAddress: string) {
    const name = getTokenName(tokenAddress);
    const now = new Date().toISOString();

    return {
        rawResponse: `Mock intelligence report for ${name} (${tokenAddress})`,
        executiveSummary: `• ${name} shows strong accumulation patterns with 320% volume growth in last 6 hours
• Whale activity detected: 3 wallets control 45% of supply
• Liquidity depth: $1.2M with moderate slippage (8.2%)`,

        keyInsights: [
            {
                insight: `${name} is experiencing significant buy pressure with buy/sell ratio of 4.2:1`,
                confidence: 0.87,
                category: 'flow',
            },
            {
                insight: `Whale accumulation detected - 3 wallets control 45% of total supply`,
                confidence: 0.92,
                category: 'onchain',
            },
            {
                insight: `Volume spike of 320% in last 6 hours indicates growing interest`,
                confidence: 0.89,
                category: 'market',
            },
            {
                insight: `Liquidity concentration risk: 60% of liquidity on single DEX`,
                confidence: 0.78,
                category: 'risk',
            },
            {
                insight: `Narrative strength: ${name} trending in DeFi communities`,
                confidence: 0.71,
                category: 'narrative',
            },
            {
                insight: `Smart money showing accumulation across 12 wallets in last 24h`,
                confidence: 0.83,
                category: 'smart-money',
            },
            {
                insight: `Survival probability estimated at 68% based on holder retention`,
                confidence: 0.74,
                category: 'survival',
            },
        ],

        opportunityAssessment: {
            'Early Entry': 'High',
            'Growth Potential': 'High',
            'Market Timing': 'Medium',
            'Risk/Reward': 'High',
        },

        riskAssessment: {
            'Whale Concentration': 'High',
            'Liquidity Risk': 'Medium',
            'Contract Risk': 'Low',
            'Volatility': 'High',
            'Rug Pull Risk': 'Medium',
        },

        patternDetection: `Accumulation pattern detected with confidence 0.87.
Evidence:
- Buy pressure 4x sell pressure
- Whale entry detected ($1.2M+ transactions)
- Volume growth of 320% in 6 hours
- New holder growth of 15% in 24 hours`,

        recommendation: `MONITOR CLOSELY
${name} shows strong accumulation patterns that could indicate early stage growth.
However, high whale concentration and liquidity risks should be monitored.
Recommend watching for 48 hours before considering entry.`,

        confidenceScore: 0.85,

        attentionVelocityAnalysis: {
            token: tokenAddress,
            attentionVelocity: 72,
            velocityTrend: 'INCREASING',
            timeWindow: 3600,
            evidence: {
                volumeSpike: 3.2,
                holderGrowth: 15,
                socialMentions: 45,
                whaleActivity: 0.92,
            },
            confidence: 0.83,
        },

        convictionScoreAnalysis: {
            token: tokenAddress,
            convictionScore: 68,
            convictionTrend: 'INCREASING',
            smartMoneyConviction: 82,
            retailConviction: 54,
            evidence: {
                accumulationRate: 0.75,
                holderRetention: 0.68,
                priceStability: 0.62,
                volumeConsistency: 0.71,
            },
            confidence: 0.79,
        },

        signalConsensus: {
            token: tokenAddress,
            consensusScore: 74,
            conflictingSignals: [
                {
                    agent: 'FlowIntelligenceAgent',
                    signal: 'Strong buy pressure detected',
                    confidence: 0.87,
                    resolution: 'Resolved — volume analysis confirms organic growth',
                },
                {
                    agent: 'OnchainAgent',
                    signal: 'High whale concentration',
                    confidence: 0.92,
                    resolution: 'Resolved — whales are accumulating, not distributing',
                },
            ],
            resolvedSignals: [
                { agent: 'FlowIntelligenceAgent', signal: 'Buy pressure 4.2x sell', confidence: 0.87, weight: 0.3 },
                { agent: 'OnchainAgent', signal: 'Accumulation pattern', confidence: 0.85, weight: 0.25 },
                { agent: 'MarketAgent', signal: 'Volume spike 320%', confidence: 0.89, weight: 0.25 },
                { agent: 'OpportunityAgent', signal: 'Early opportunity index 76', confidence: 0.82, weight: 0.2 },
            ],
            finalDecision: 'ACCUMULATE — Strong signals across flow, onchain, and market data with resolved whale concerns',
            confidence: 0.81,
        },

        rugPullIndicators: {
            dumpScore: 0.32,
            liquidityRemovalScore: 0.28,
            devWalletActivityScore: 0.15,
            overallRugScore: 0.25,
            warningLevel: 'low',
        },

        metadata: {
            token: tokenAddress,
            timestamp: now,
            dataSources: [
                'Mock Jupiter Websocket',
                'Mock Helius API',
                'Mock Birdeye API',
                'Mock CoinGecko API',
                'AMD Cloud AI (Mock)',
            ],
            routingDecision: {
                modelUsed: 'Llama 3.1 70B (Mock)',
                isFallback: false,
                confidence: 0.85,
            },
            featuresUsed: [
                'Flow Intelligence',
                'Onchain Analysis',
                'Market Analysis',
                'Early Opportunity Detection',
                'Narrative Analysis',
                'Smart Money Detection',
                'Survival Analysis',
            ],
        },
    };
}