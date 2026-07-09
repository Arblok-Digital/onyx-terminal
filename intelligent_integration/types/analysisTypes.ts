/**
 * @file analysisTypes.ts
 * @layer types
 * @desc Type definitions for all analysis outputs from AI agents
 *       V3 supports full structured data. ALL fields are optional for backward
 *       compatibility with V2 agents that produce partial/legacy data shapes.
 *
 *       Rules:
 *       1. V3 fields are the "ideal" shape but are OPTIONAL (agents may not fill them)
 *       2. V2 fields are kept for backward compatibility (agents & prompts reference them)
 *       3. All fields are optional unless they are basics like token/id/timestamp
 *       4. This prevents "missing properties" errors from partial agent outputs
 */

export interface IntelligenceReport {
    id: string;
    timestamp: number;
    tokenAddress: string;
    tokenSymbol: string;

    // V3 structured analysis blocks (all optional - V2 agents may not produce these)
    flowAnalysis?: FlowAnalysis;
    onchainAnalysis?: OnchainAnalysis;
    marketAnalysis?: MarketAnalysis;
    opportunityAnalysis?: EarlyOpportunityAnalysis;
    narrativeAnalysis?: NarrativeAnalysis;
    smartMoneyAnalysis?: SmartMoneyAnalysis;
    survivalAnalysis?: SurvivalAnalysis;

    summary?: string;
    recommendations?: string[];

    // V2 backward-compat fields (used by agentRouter.ts, dashboardDataService.ts)
    executiveSummary?: string;
    keyInsights?: Array<{ category?: string; insight: string; confidence: number }>;
    recommendation?: string;
    confidenceScore?: number;
    intelligenceRanking?: IntelligenceRanking;
    metadata?: {
        modelUsed: string;
        durationMs: number;
        routingDecision: string;
        processingSteps: string[];
        isFallback?: boolean;
        /** Council Ringan verdict (ECC lightweight council) */
        councilVerdict?: {
            architectScore: number;
            skepticScore: number;
            strategistScore: number;
            consensusScore: number;
            consensusRating: string;
            finalVerdict: string;
            keyTensions: string[];
        };
    };
}

export interface FlowPattern {
    type: string;
    description: string;
    severity?: string;
    strength?: number;
}

export interface FlowAnalysis {
    token: string;

    // V3 fields (all optional)
    inflow?: number;
    outflow?: number;
    netFlow?: number;
    majorInflows?: { source: string; amount: number; timestamp: number }[];
    majorOutflows?: { destination: string; amount: number; timestamp: number }[];
    exchangeFlow?: {
        inflowToExchanges: number;
        outflowFromExchanges: number;
        netExchangeFlow: number;
    };
    anomalousTransactions?: {
        signature: string;
        type: string;
        amount: number;
        confidence: number;
    }[];

    // V2 backward-compat fields (used by flowIntelligenceAgent.ts, agentRouter.ts, etc.)
    patterns?: FlowPattern[];
    confidence?: number;
    evidence?: string[];
    realtimeData?: RealtimeData;
}

export interface RealtimeData {
    price: number;
    volume24h: number;
    priceChange5m: number;
    priceChange1h: number;
    liquidity: number;
    marketCap: number;
    // V2 extra fields used by agents (flowIntelligenceAgent.ts, opportunityAgent.ts, etc.)
    buyPressure?: number;
    sellPressure?: number;
    volumeGrowth?: number;
    whaleActivity?: number;
}

export interface OnchainAnalysis {
    token: string;

    // V3 fields (all optional)
    whaleActivity?: {
        largeTransfers: number;
        whaleWallets: number;
        concentration: number;
    };
    holderGrowth?: {
        newHolders: number;
        growthRate: number;
    };
    developerActivity?: {
        devWalletTransactions: number;
        suspiciousTransfers: number;
        devWalletBalance: number;
        devWallets: string[];
    };
    liquidityAnalysis?: {
        liquidityDepth: number;
        liquidityChange24h: number;
        lockedLiquidity: number;
        liquidityConcentration: number;
    };
    rugPullIndicators?: {
        dumpScore: number;
        liquidityRemovalScore: number;
        devWalletActivityScore: number;
        overallRugScore: number;
    };
    riskScore?: number;
    contractAnalysis?: {
        age: number;
        creator: string;
        mintAuthority: boolean;
        freezeAuthority: boolean;
        isVerified: boolean;
        renounced: boolean;
        creationTimestamp?: number;
    };
}

export interface MarketAnalysis {
    token: string;

    // V3 fields (all optional)
    priceTrend?: {
        current: number;
        change24h: number;
        change7d: number;
    };
    volumeAnalysis?: {
        volume24h: number;
        volumeChange: number;
        suspiciousVolume?: number;
    };
    liquidityAnalysis?: {
        depth: number;
        slippage: number;
        change24h?: number;
    };
    volatilityScore?: number;
    marketCap?: number;
    sentimentAnalysis?: {
        sentimentScore: number;
        positiveMentions: number;
        negativeMentions: number;
        neutralMentions: number;
        sentimentTrend: number;
        source: string;
    };
}

export interface OpportunityFactors {
    technicalScore: number;
    marketScore: number;
    communityScore: number;
    riskScore: number;
    momentumScore: number;
    overallScore: number;
    // V2 extra fields used by opportunityAgent.ts
    volumeVelocity?: number;
    freshWalletGrowth?: number;
    whaleEntry?: number;
    liquidityGrowth?: number;
    buyPressure?: number;
    marketMomentum?: number;
}

export interface EarlyOpportunityAnalysis {
    token: string;

    // V3 fields (all optional)
    opportunityScore?: number;
    entryStrategy?: {
        suggestedEntryPrice: number;
        entryConfidence: number;
        entryTiming: string;
    };
    exitStrategy?: {
        suggestedExitPrice: number;
        takeProfitLevels: { level: number; weight: number }[];
        stopLoss: number;
    };
    riskRewardRatio?: number;
    predictedPotential?: {
        shortTerm: number;
        midTerm: number;
        longTerm: number;
    };
    discoveryTimestamp?: number;
    validationMetrics?: {
        liquidityCheck: boolean;
        holderDistribution: 'healthy' | 'concentrated' | 'risky';
        contractSafety: 'safe' | 'verified' | 'unknown' | 'risky';
        socialVolume: number;
    };
    competitionAnalysis?: {
        marketShare: number;
        comparableProjects: string[];
        uniqueAdvantages: string[];
    };

    // V2 backward-compat fields (used by opportunityAgent.ts, agentRouter.ts, etc.)
    rating?: 'HIGH OPPORTUNITY' | 'MODERATE OPPORTUNITY' | 'LOW OPPORTUNITY' | 'AVOID' | string;
    confidence?: number;
    eoiScore?: number;
    factors?: OpportunityFactors;
    evidence?: string[];
}

export interface NarrativeAnalysis {
    token: string;

    // V3 fields (all optional)
    narrativeScore?: number;
    trendingTopics?: {
        topic: string;
        mentionCount: number;
        sentiment: number;
        momentum: number;
    }[];
    communitySentiment?: {
        overall: number;
        breakdown: {
            twitter: number;
            discord: number;
            telegram: number;
        };
    };
    influencerActivity?: {
        totalInfluencers: number;
        positiveMentions: number;
        negativeMentions: number;
        topInfluencers: {
            handle: string;
            followers: number;
            sentiment: number;
            reach: number;
        }[];
    };
    brandHealth?: {
        awareness: number;
        trustLevel: number;
        communityEngagement: number;
    };
    competitivePositioning?: {
        marketSegment: string;
        uniqueSellingPoints: string[];
        threatLevel: number;
        competitorMentions: { competitor: string; mentionCount: number }[];
    };

    // V2 backward-compat fields (used by promptBuilders.ts, intelligenceReportGenerator.ts, etc.)
    narrative?: string;
    confidence?: number;
    evidence?: string[];
    narrativeStrength?: number;
    relatedTokens?: string[];
}

export interface SmartWalletEntry {
    address: string;
    label: string;
    totalInvested: number;
    currentPosition: number;
    entryPrice: number;
    confidence: number;
    // V2 extra fields used by smartMoneyAgent.ts
    winRate?: number;
    roiHistory?: number[];
    entryQuality?: number;
}

export interface SmartMoneyAnalysis {
    token: string;

    // V3 fields (all optional)
    smartMoneyScore?: number;
    trackedWallets?: SmartWalletEntry[];
    capitalFlows?: {
        inflow24h: number;
        outflow24h: number;
        netFlow: number;
        significantTransactions: {
            wallet: string;
            type: 'buy' | 'sell';
            amount: number;
            price: number;
            timestamp: number;
        }[];
    };
    accumulationPattern?: {
        isAccumulating: boolean;
        accumulationRate: number;
        averageEntryPrice: number;
        smartMoneyConfidence: number;
    };
    correlationAnalysis?: {
        correlatedTokens: { token: string; correlation: number }[];
        marketCorrelation: number;
    };

    // V2 backward-compat fields (used by promptBuilders.ts, intelligenceReportGenerator.ts, etc.)
    confidence?: number;
    smartWhales?: SmartWalletEntry[];
    smartMoneyPercentage?: number;
    totalSmartMoneyVolume?: number;
}

export interface SurvivalFactors {
    liquidityFactor: number;
    holderFactor: number;
    marketFactor: number;
    riskFactor: number;
    sustainabilityFactor: number;
    // V2 extra fields used by survivalAgent.ts
    liquidityRetention?: number;
    holderGrowth?: number;
    buySellRatio?: number;
    whaleBehavior?: number;
    developerActivity?: number;
}

export interface SurvivalAnalysis {
    token: string;

    // V3 fields (all optional)
    survivalScore?: number;
    liquidityHealth?: {
        ratio: number;
        depth: number;
        volatility: number;
        sustainability: 'high' | 'medium' | 'low' | 'critical';
    };
    holderRetention?: {
        retentionRate: number;
        averageHoldingPeriod: number;
        churnRate: number;
    };
    marketResilience?: {
        priceStability: number;
        recoveryRate: number;
        crashResistance: number;
    };
    riskMetrics?: {
        impermanentLossRisk: number;
        liquidationRisk: number;
        regulatoryRisk: number;
        overallRisk: 'low' | 'medium' | 'high' | 'critical';
    };
    sustainabilityIndicators?: {
        revenueModel: string;
        tokenEmissionRate: number;
        stakingParticipation: number;
        treasuryHealth: number;
    };
    timelineForecast?: {
        shortTerm: 'bullish' | 'neutral' | 'bearish';
        midTerm: 'bullish' | 'neutral' | 'bearish';
        longTerm: 'bullish' | 'neutral' | 'bearish';
        confidence: number;
    };

    // V2 backward-compat fields (used by promptBuilders.ts, survivalAgent.ts, etc.)
    confidence?: number;
    factors?: SurvivalFactors;
    survivalProbability?: number;
    estimatedLifespan?: string;
}

// Ranking & Scoring Types
export interface IntelligenceRanking {
    // V3 fields (all optional)
    overallScore?: number;
    riskScore?: number;
    opportunityScore?: number;
    convictionScore?: number;
    rank?: number;
    outOf?: number;
    percentile?: number;
    category?: 'low_risk' | 'medium_risk' | 'high_risk' | 'speculative';

    // V2 backward-compat fields (used by reportParser.ts, intelligenceReportGenerator.ts)
    rating?: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' | 'AVOID' | string;
    smartMoneyScore?: number;
    survivalScore?: number;
    narrativeScore?: number;
}

export interface AttentionVelocityAnalysis {
    token: string;

    // V3 fields (all optional)
    velocity?: number;
    trend?: 'accelerating' | 'stable' | 'decelerating';
    sources?: {
        twitter: number;
        discord: number;
        telegram: number;
    };
    velocityChange24h?: number;
    attentionScore?: number;

    // V2 backward-compat fields (used by agentRouter.ts)
    attentionVelocity?: number;
    velocityTrend?: 'INCREASING' | 'STABLE' | 'DECREASING' | string;
    confidence?: number;
    timeWindow?: number;
    evidence?: {
        socialMediaMentions: number;
        tradingVolumeGrowth: number;
        walletGrowthRate: number;
        priceMomentum: number;
    };
}

export interface ConvictionScoreAnalysis {
    token: string;

    // V3 fields (all optional)
    convictionScore?: number;
    factors?: {
        technicalStrength: number;
        communityStrength: number;
        marketMomentum: number;
        teamCredibility: number;
    };
    convictionLevel?: 'low' | 'medium' | 'high' | 'very_high';

    // V2 backward-compat fields (used by agentRouter.ts)
    convictionTrend?: 'INCREASING' | 'STABLE' | 'DECREASING' | string;
    confidence?: number;
    smartMoneyConviction?: number;
    retailConviction?: number;
    evidence?: {
        smartMoneyHoldings: number;
        smartMoneyEntryPoints: number;
        retailFomoIndicator: number;
        liquidityLockStatus: boolean;
    };
}

export interface SignalConsensusResult {
    token: string;

    // V3 fields (all optional)
    consensusScore?: number;
    signals?: {
        onchain: { score: number; weight: number };
        market: { score: number; weight: number };
        social: { score: number; weight: number };
        smartMoney: { score: number; weight: number };
    };
    consensus?: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';

    // V2 backward-compat fields (used by agentRouter.ts)
    conflictingSignals?: Array<{ agent: string; signal: string; confidence: number; resolution: string }>;
    resolvedSignals?: Array<{ agent: string; signal: string; confidence: number; weight: number }>;
    finalDecision?: string;
    confidence?: number;
}