/**
 * Sample Analysis for Testing Onyx Terminal AMD Integration
 * Provides mock data for testing the intelligence system
 */

import { AgentOrchestrator } from '../agentOrchestrator';
import { IntelligenceReport } from '../types/analysisTypes';

// Sample token addresses for testing
export const SAMPLE_TOKENS = {
    YUNO: 'YUNO_ADDRESS_SAMPLE',
    ZEX: 'ZEX_ADDRESS_SAMPLE',
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
};

/**
 * Generate sample intelligence report for testing
 */
export async function generateSampleReport(tokenAddress: string = SAMPLE_TOKENS.YUNO): Promise<IntelligenceReport> {
    const orchestrator = new AgentOrchestrator();

    // For testing purposes, we'll return a mock report instead of calling real APIs
    return createMockIntelligenceReport(tokenAddress);
}

/**
 * Create mock intelligence report for testing
 */
export function createMockIntelligenceReport(tokenAddress: string): IntelligenceReport {
    const now = new Date();
    const tokenName = getTokenName(tokenAddress);

    return {
        rawResponse: `Mock intelligence report for ${tokenName} (${tokenAddress})`,
        executiveSummary: `• ${tokenName} shows strong accumulation patterns with 320% volume growth in last 6 hours
• Whale activity detected: 3 wallets control 45% of supply
• Liquidity depth: $1.2M with moderate slippage (8.2%)`,
        keyInsights: [
            {
                insight: `${tokenName} is experiencing significant buy pressure with buy/sell ratio of 4.2:1`,
                confidence: 0.87
            },
            {
                insight: `Whale accumulation detected - 3 wallets control 45% of total supply`,
                confidence: 0.92
            },
            {
                insight: `Volume spike of 320% in last 6 hours indicates growing interest`,
                confidence: 0.89
            },
            {
                insight: `Liquidity concentration risk: 60% of liquidity on single DEX`,
                confidence: 0.78
            }
        ],
        riskAssessment: {
            'Whale Concentration': 'High',
            'Liquidity Risk': 'Medium',
            'Contract Risk': 'Low',
            'Volatility': 'High'
        },
        patternDetection: `Accumulation pattern detected with confidence 0.87.
Evidence:
- Buy pressure 4x sell pressure
- Whale entry detected ($1.2M+ transactions)
- Volume growth of 320% in 6 hours
- New holder growth of 15% in 24 hours`,
        recommendation: `MONITOR CLOSELY
${tokenName} shows strong accumulation patterns that could indicate early stage growth.
However, high whale concentration and liquidity risks should be monitored.
Recommend watching for 48 hours before considering entry.`,
        confidenceScore: 0.85,
        metadata: {
            token: tokenAddress,
            timestamp: now.toISOString(),
            dataSources: [
                'Mock Jupiter Websocket',
                'Mock Helius API',
                'Mock Birdeye API',
                'Mock CoinGecko API',
                'AMD Cloud AI (Mock)'
            ]
        }
    };
}

/**
 * Get token name from address
 */
function getTokenName(tokenAddress: string): string {
    switch (tokenAddress) {
        case SAMPLE_TOKENS.YUNO: return 'YUNO';
        case SAMPLE_TOKENS.ZEX: return 'ZEX';
        case SAMPLE_TOKENS.SOL: return 'SOL';
        case SAMPLE_TOKENS.USDC: return 'USDC';
        default: return 'UNKNOWN';
    }
}

/**
 * Generate sample flow analysis data
 */
export function createMockFlowAnalysis(tokenAddress: string): any {
    return {
        token: tokenAddress,
        patterns: [
            {
                type: 'accumulation',
                strength: 0.87,
                evidence: [
                    'Buy pressure 4x sell pressure',
                    'Whale entry detected',
                    'Volume growth of 320%'
                ]
            },
            {
                type: 'volume_spike',
                strength: 0.89,
                evidence: [
                    '320% volume growth in 6 hours'
                ]
            }
        ],
        confidence: 0.85,
        evidence: [
            'Buy pressure 4x sell pressure',
            'Whale entry detected ($1.2M+ transactions)',
            'Volume growth of 320% in 6 hours'
        ],
        realtimeData: {
            buyPressure: 4.2,
            sellPressure: 1,
            volumeGrowth: 3.2,
            whaleActivity: 0.92
        }
    };
}

/**
 * Generate sample onchain analysis data
 */
export function createMockOnchainAnalysis(tokenAddress: string): any {
    return {
        token: tokenAddress,
        whaleActivity: {
            largeTransfers: 12,
            whaleWallets: 3,
            concentration: 0.45
        },
        holderGrowth: {
            newHolders: 150,
            growthRate: 0.15
        },
        liquidityDepth: 1200000,
        riskScore: 0.68,
        contractAnalysis: {
            age: 7,
            creator: '0x3a7d...f89c',
            mintAuthority: false,
            freezeAuthority: false
        }
    };
}

/**
 * Generate sample market analysis data
 */
export function createMockMarketAnalysis(tokenAddress: string): any {
    return {
        token: tokenAddress,
        priceTrend: {
            current: 0.12,
            change24h: 0.18,
            change7d: 0.42
        },
        volumeAnalysis: {
            volume24h: 4200000,
            volumeChange: 3.2
        },
        liquidityAnalysis: {
            depth: 1200000,
            slippage: 0.082
        },
        volatilityScore: 0.78,
        marketCap: 12000000
    };
}

/**
 * Run sample analysis for demonstration
 */
export async function runSampleAnalysis() {
    console.log('🔍 Running Sample Analysis for Onyx Terminal AMD Integration');
    console.log('='.repeat(60));

    const report = await generateSampleReport(SAMPLE_TOKENS.YUNO);

    console.log('\n📊 INTELLIGENCE REPORT');
    console.log('='.repeat(60));
    console.log(`Token: ${getTokenName(SAMPLE_TOKENS.YUNO)} (${SAMPLE_TOKENS.YUNO})`);
    console.log(`Timestamp: ${report.metadata?.timestamp}`);
    console.log(`Confidence Score: ${report.confidenceScore}/1`);
    console.log('\n📌 EXECUTIVE SUMMARY:');
    console.log(report.executiveSummary);

    console.log('\n🔍 KEY INSIGHTS:');
    report.keyInsights.forEach((insight, index) => {
        console.log(`${index + 1}. ${insight.insight} (Confidence: ${insight.confidence})`);
    });

    console.log('\n⚠️ RISK ASSESSMENT:');
    for (const [risk, level] of Object.entries(report.riskAssessment)) {
        console.log(`- ${risk}: ${level}`);
    }

    console.log('\n📈 PATTERN DETECTION:');
    console.log(report.patternDetection);

    console.log('\n🎯 RECOMMENDATION:');
    console.log(report.recommendation);

    console.log('\n📡 DATA SOURCES:');
    report.metadata?.dataSources.forEach(source => {
        console.log(`- ${source}`);
    });

    console.log('\n✅ Sample analysis completed successfully');
    console.log('='.repeat(60));

    return report;
}

// Uncomment to run sample analysis directly
// runSampleAnalysis();