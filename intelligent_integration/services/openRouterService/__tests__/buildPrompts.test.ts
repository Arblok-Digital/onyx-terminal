/**
 * @file buildPrompts.test.ts
 * @desc Unit tests for prompt building functions
 */

import { describe, it, expect } from 'vitest';
import {
    buildFlowPrompt,
    buildOnchainPrompt,
    buildMarketPrompt,
    buildOpportunityPrompt,
    buildNarrativePrompt,
    buildSmartMoneyPrompt,
    buildSurvivalPrompt,
    buildResearchPrompt
} from '../buildPrompts';
import type {
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis
} from '../../../types/analysisTypes';

const mockFlowData: FlowAnalysis = {
    token: 'TEST',
    patterns: [{ type: 'accumulation', strength: 0.8, evidence: ['test'] }],
    confidence: 0.85,
    evidence: ['buy pressure increasing'],
    realtimeData: { buyPressure: 0.7, sellPressure: 0.3, volumeGrowth: 0.5, whaleActivity: 0.6 }
};

const mockOnchainData: OnchainAnalysis = {
    token: 'TEST',
    whaleActivity: { largeTransfers: 5, whaleWallets: 3, concentration: 0.4 },
    holderGrowth: { newHolders: 100, growthRate: 0.2 },
    developerActivity: { devWalletTransactions: 2, suspiciousTransfers: 0, devWalletBalance: 1000, devWallets: ['abc'] },
    liquidityAnalysis: { liquidityDepth: 50000, liquidityChange24h: 0.1, lockedLiquidity: 40000, liquidityConcentration: 0.3 },
    rugPullIndicators: { dumpScore: 0.2, liquidityRemovalScore: 0.1, devWalletActivityScore: 0.3, overallRugScore: 25 },
    riskScore: 30,
    contractAnalysis: { age: 30, creator: 'abc', mintAuthority: false, freezeAuthority: false, isVerified: true, renounced: true }
};

const mockMarketData: MarketAnalysis = {
    token: 'TEST',
    priceTrend: { current: 0.001, change24h: 15, change7d: 50 },
    volumeAnalysis: { volume24h: 1000000, volumeChange: 0.3 },
    liquidityAnalysis: { depth: 50000, slippage: 0.5 },
    volatilityScore: 40,
    marketCap: 10000000,
    sentimentAnalysis: { sentimentScore: 65, positiveMentions: 100, negativeMentions: 20, neutralMentions: 50, sentimentTrend: 0.1, source: 'twitter' }
};

const mockOpportunityData: EarlyOpportunityAnalysis = {
    token: 'TEST',
    eoiScore: 75,
    rating: 'HIGH OPPORTUNITY',
    factors: { volumeVelocity: 0.8, freshWalletGrowth: 0.6, whaleEntry: 0.7, liquidityGrowth: 0.5, buyPressure: 0.7, marketMomentum: 0.8 },
    evidence: ['volume spiking'],
    confidence: 0.8
};

const mockNarrativeData: NarrativeAnalysis = {
    token: 'TEST',
    narrative: 'AI Infrastructure',
    confidence: 0.8,
    evidence: ['twitter buzz'],
    narrativeStrength: 75,
    relatedTokens: ['AGIX', 'FET']
};

const mockSmartMoneyData: SmartMoneyAnalysis = {
    token: 'TEST',
    smartMoneyScore: 80,
    smartWhales: [{ address: 'abc123', winRate: 0.7, roiHistory: 2.5, entryQuality: 0.8 }],
    totalSmartMoneyVolume: 500000,
    smartMoneyPercentage: 0.25,
    confidence: 0.8
};

const mockSurvivalData: SurvivalAnalysis = {
    token: 'TEST',
    survivalProbability: 0.6,
    estimatedLifespan: '1-4 weeks',
    factors: { liquidityRetention: 0.7, holderGrowth: 0.6, buySellRatio: 1.2, whaleBehavior: 0.5, developerActivity: 0.7 },
    confidence: 0.7
};

describe('buildFlowPrompt', () => {
    it('should include flow patterns section', () => {
        const prompt = buildFlowPrompt(mockFlowData);
        expect(prompt).toContain('FLOW PATTERNS');
        expect(prompt).toContain('confidence scores');
        expect(prompt).toContain('buy/sell pressure');
    });

    it('should include key insights section', () => {
        const prompt = buildFlowPrompt(mockFlowData);
        expect(prompt).toContain('KEY INSIGHTS');
        expect(prompt).toContain('Whale activity');
    });

    it('should include quantitative metrics', () => {
        const prompt = buildFlowPrompt(mockFlowData);
        expect(prompt).toContain('Buy/sell ratio');
        expect(prompt).toContain('Flow velocity score');
    });

    it('should include real-time data in the prompt', () => {
        const prompt = buildFlowPrompt(mockFlowData);
        expect(prompt).toContain('buyPressure');
    });
});

describe('buildOnchainPrompt', () => {
    it('should include holder analysis', () => {
        const prompt = buildOnchainPrompt(mockOnchainData);
        expect(prompt).toContain('HOLDER ANALYSIS');
        expect(prompt).toContain('Top holders distribution');
    });

    it('should include rug pull indicators', () => {
        const prompt = buildOnchainPrompt(mockOnchainData);
        expect(prompt).toContain('RUG PULL INDICATORS');
        expect(prompt).toContain('Liquidity lock status');
        expect(prompt).toContain('Overall rug pull risk score');
    });

    it('should include whale activity section', () => {
        const prompt = buildOnchainPrompt(mockOnchainData);
        expect(prompt).toContain('WHALE ACTIVITY');
        expect(prompt).toContain('Large transactions analysis');
    });
});

describe('buildMarketPrompt', () => {
    it('should include price trend analysis', () => {
        const prompt = buildMarketPrompt(mockMarketData);
        expect(prompt).toContain('PRICE TREND ANALYSIS');
        expect(prompt).toContain('Support/resistance levels');
    });

    it('should include volume analysis', () => {
        const prompt = buildMarketPrompt(mockMarketData);
        expect(prompt).toContain('VOLUME ANALYSIS');
        expect(prompt).toContain('Volume trends');
    });

    it('should include sentiment analysis', () => {
        const prompt = buildMarketPrompt(mockMarketData);
        expect(prompt).toContain('SENTIMENT ANALYSIS');
        expect(prompt).toContain('Market sentiment score');
    });
});

describe('buildOpportunityPrompt', () => {
    it('should include EOI score', () => {
        const prompt = buildOpportunityPrompt(mockOpportunityData);
        expect(prompt).toContain('EARLY OPPORTUNITY INDEX');
        expect(prompt).toContain('EOI score');
    });

    it('should include opportunity factors', () => {
        const prompt = buildOpportunityPrompt(mockOpportunityData);
        expect(prompt).toContain('OPPORTUNITY FACTORS');
        expect(prompt).toContain('Liquidity opportunity');
    });

    it('should include pattern detection', () => {
        const prompt = buildOpportunityPrompt(mockOpportunityData);
        expect(prompt).toContain('PATTERN DETECTION');
        expect(prompt).toContain('Early accumulation patterns');
    });
});

describe('buildNarrativePrompt', () => {
    it('should include narrative classification', () => {
        const prompt = buildNarrativePrompt(mockNarrativeData);
        expect(prompt).toContain('NARRATIVE CLASSIFICATION');
        expect(prompt).toContain('Primary narrative theme');
    });

    it('should include community engagement', () => {
        const prompt = buildNarrativePrompt(mockNarrativeData);
        expect(prompt).toContain('COMMUNITY ENGAGEMENT');
        expect(prompt).toContain('Engagement level');
    });
});

describe('buildSmartMoneyPrompt', () => {
    it('should include whale activity analysis', () => {
        const prompt = buildSmartMoneyPrompt(mockSmartMoneyData);
        expect(prompt).toContain('WHALE ACTIVITY ANALYSIS');
        expect(prompt).toContain('Top whale wallets');
    });

    it('should include smart money metrics', () => {
        const prompt = buildSmartMoneyPrompt(mockSmartMoneyData);
        expect(prompt).toContain('SMART MONEY METRICS');
        expect(prompt).toContain('Smart money score');
    });
});

describe('buildSurvivalPrompt', () => {
    it('should include survival probability', () => {
        const prompt = buildSurvivalPrompt(mockSurvivalData);
        expect(prompt).toContain('SURVIVAL PROBABILITY');
        expect(prompt).toContain('Estimated lifespan');
    });

    it('should include key risk factors', () => {
        const prompt = buildSurvivalPrompt(mockSurvivalData);
        expect(prompt).toContain('KEY RISK FACTORS');
        expect(prompt).toContain('Liquidity risk');
    });
});

describe('buildResearchPrompt', () => {
    it('should include all required analysis sections', () => {
        const prompt = buildResearchPrompt(
            mockFlowData,
            mockOnchainData,
            mockMarketData
        );
        expect(prompt).toContain('FLOW ANALYSIS');
        expect(prompt).toContain('ONCHAIN ANALYSIS');
        expect(prompt).toContain('MARKET ANALYSIS');
    });

    it('should include optional analysis sections when provided', () => {
        const prompt = buildResearchPrompt(
            mockFlowData,
            mockOnchainData,
            mockMarketData,
            mockOpportunityData,
            mockNarrativeData,
            mockSmartMoneyData,
            mockSurvivalData
        );
        expect(prompt).toContain('EARLY OPPORTUNITY ANALYSIS');
        expect(prompt).toContain('NARRATIVE ANALYSIS');
        expect(prompt).toContain('SMART MONEY ANALYSIS');
        expect(prompt).toContain('SURVIVAL ANALYSIS');
    });

    it('should NOT include optional sections when not provided', () => {
        const prompt = buildResearchPrompt(
            mockFlowData,
            mockOnchainData,
            mockMarketData
        );
        expect(prompt).not.toContain('EARLY OPPORTUNITY ANALYSIS');
        expect(prompt).not.toContain('NARRATIVE ANALYSIS');
        expect(prompt).not.toContain('SMART MONEY ANALYSIS');
        expect(prompt).not.toContain('SURVIVAL ANALYSIS');
    });

    it('should include the required output format section', () => {
        const prompt = buildResearchPrompt(
            mockFlowData,
            mockOnchainData,
            mockMarketData
        );
        expect(prompt).toContain('REQUIRED OUTPUT FORMAT');
        expect(prompt).toContain('Executive Summary');
        expect(prompt).toContain('Key Insights');
        expect(prompt).toContain('Risk Assessment');
        expect(prompt).toContain('Recommendation');
    });
});