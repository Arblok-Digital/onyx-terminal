/**
 * Mock Generators for OpenRouter Research Manager
 * Extracted from openRouterService.ts to keep service file clean.
 * These are standalone functions (not class methods).
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
} from '../../types/analysisTypes';

/**
 * Calculate default intelligence ranking from available analysis data
 */
export function calculateDefaultRanking(
    earlyOpportunity?: EarlyOpportunityAnalysis,
    onchain?: OnchainAnalysis,
    smartMoney?: SmartMoneyAnalysis,
    survival?: SurvivalAnalysis,
    narrative?: NarrativeAnalysis
): IntelligenceRanking {
    // Calculate opportunity score
    let opportunityScore = 50;
    if (earlyOpportunity) {
        opportunityScore = earlyOpportunity.eoiScore || 50;
    }

    // Calculate risk score
    let riskScore = 50;
    if (onchain && onchain.rugPullIndicators) {
        riskScore = 100 - (onchain.rugPullIndicators.overallRugScore || 50);
    }

    // Calculate smart money score
    let smartMoneyScore = 50;
    if (smartMoney) {
        smartMoneyScore = smartMoney.smartMoneyScore || 50;
    }

    // Calculate survival score
    let survivalScore = 50;
    if (survival) {
        survivalScore = survival.survivalProbability ? survival.survivalProbability * 100 : 50;
    }

    // Calculate narrative score
    let narrativeScore = 50;
    if (narrative) {
        narrativeScore = narrative.narrativeStrength || 50;
    }

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
        (opportunityScore * 0.3) +
        (riskScore * 0.25) +
        (smartMoneyScore * 0.2) +
        (survivalScore * 0.15) +
        (narrativeScore * 0.1)
    );

    // Determine rating
    let rating: 'AVOID' | 'CAUTION' | 'MONITOR' | 'WATCH' | 'POTENTIAL' | 'OPPORTUNITY' | 'STRONG OPPORTUNITY' = 'MONITOR';
    if (overallScore < 30) rating = 'AVOID';
    else if (overallScore < 40) rating = 'CAUTION';
    else if (overallScore < 50) rating = 'MONITOR';
    else if (overallScore < 60) rating = 'WATCH';
    else if (overallScore < 70) rating = 'POTENTIAL';
    else if (overallScore < 80) rating = 'OPPORTUNITY';
    else rating = 'STRONG OPPORTUNITY';

    return {
        opportunityScore,
        riskScore,
        smartMoneyScore,
        survivalScore,
        narrativeScore,
        overallScore,
        rating
    };
}

/**
 * Calculate warning level from rug score (0-100)
 */
export function calculateWarningLevel(rugScore?: number): 'low' | 'medium' | 'high' | 'critical' {
    if (!rugScore) return 'low';
    if (rugScore < 30) return 'low';
    if (rugScore < 60) return 'medium';
    if (rugScore < 80) return 'high';
    return 'critical';
}

/**
 * Generate a mock IntelligenceReport when AI service fails
 */
export function generateMockIntelligenceReport(
    earlyOpportunity?: EarlyOpportunityAnalysis,
    onchain?: OnchainAnalysis,
    smartMoney?: SmartMoneyAnalysis,
    survival?: SurvivalAnalysis,
    narrative?: NarrativeAnalysis
): IntelligenceReport {
    return {
        rawResponse: '',
        executiveSummary: 'Mock intelligence report generated due to AI service failure',
        keyInsights: [],
        opportunityAssessment: {},
        riskAssessment: {},
        patternDetection: 'No patterns detected (mock data)',
        recommendation: 'Unable to provide recommendation due to AI service failure',
        confidenceScore: 0,
        intelligenceRanking: calculateDefaultRanking(earlyOpportunity, onchain, smartMoney, survival, narrative)
    };
}

/**
 * Generate a mock FlowAnalysis when AI service fails
 */
export function generateMockFlowAnalysis(flowData: any): FlowAnalysis {
    return {
        token: flowData.token || 'test-token',
        patterns: [],
        confidence: 0,
        evidence: []
    };
}

/**
 * Generate a mock OnchainAnalysis when AI service fails
 */
export function generateMockOnchainAnalysis(onchainData: any): OnchainAnalysis {
    return {
        token: onchainData.token || 'test-token',
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
            overallRugScore: 50
        },
        riskScore: 0
    };
}

/**
 * Generate a mock MarketAnalysis when AI service fails
 */
export function generateMockMarketAnalysis(marketData: any): MarketAnalysis {
    return {
        token: marketData.token || 'test-token',
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
        },
    };
}

/**
 * Generate a mock EarlyOpportunityAnalysis when AI service fails
 */
export function generateMockOpportunityAnalysis(opportunityData: any): EarlyOpportunityAnalysis {
    return {
        token: opportunityData.token || 'test-token',
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
        confidence: 0
    };
}

/**
 * Generate a mock NarrativeAnalysis when AI service fails
 */
export function generateMockNarrativeAnalysis(narrativeData: any): NarrativeAnalysis {
    return {
        token: narrativeData.token || 'test-token',
        narrative: 'Unknown',
        confidence: 0,
        evidence: [],
        narrativeStrength: 50
    };
}

/**
 * Generate a mock SmartMoneyAnalysis when AI service fails
 */
export function generateMockSmartMoneyAnalysis(smartMoneyData: any): SmartMoneyAnalysis {
    return {
        token: smartMoneyData.token || 'test-token',
        smartMoneyScore: 50,
        smartWhales: [],
        totalSmartMoneyVolume: 0,
        smartMoneyPercentage: 0,
        confidence: 0
    };
}

/**
 * Generate a mock SurvivalAnalysis when AI service fails
 */
export function generateMockSurvivalAnalysis(survivalData: any): SurvivalAnalysis {
    return {
        token: survivalData.token || 'test-token',
        survivalProbability: 0.5,
        estimatedLifespan: 'Unknown',
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