/**
 * @file analysisTypes.ts
 * @layer types
 * @desc Type definitions for all analysis outputs from AI agents
 */

export interface IntelligenceReport {
    id: string;
    timestamp: number;
    tokenAddress: string;
    tokenSymbol: string;
    flowAnalysis: FlowAnalysis;
    onchainAnalysis: OnchainAnalysis;
    marketAnalysis: MarketAnalysis;
    opportunityAnalysis: EarlyOpportunityAnalysis;
    narrativeAnalysis: NarrativeAnalysis;
    smartMoneyAnalysis: SmartMoneyAnalysis;
    survivalAnalysis: SurvivalAnalysis;
    summary: string;
    recommendations: string[];
}

export interface FlowAnalysis {
    token: string;
    inflow: number;
    outflow: number;
    netFlow: number;
    majorInflows: { source: string; amount: number; timestamp: number }[];
    majorOutflows: { destination: string; amount: number; timestamp: number }[];
    exchangeFlow: {
        inflowToExchanges: number;
        outflowFromExchanges: number;
        netExchangeFlow: number;
    };
    anomalousTransactions: {
        signature: string;
        type: string;
        amount: number;
        confidence: number;
    }[];
}

export interface OnchainAnalysis {
    token: string;
    whaleActivity: {
        largeTransfers: number;
        whaleWallets: number;
        concentration: number;
    };
    holderGrowth: {
        newHolders: number;
        growthRate: number;
    };
    developerActivity: {
        devWalletTransactions: number;
        suspiciousTransfers: number;
        devWalletBalance: number;
        devWallets: string[];
    };
    liquidityAnalysis: {
        liquidityDepth: number;
        liquidityChange24h: number;
        lockedLiquidity: number;
        liquidityConcentration: number;
    };
    rugPullIndicators: {
        dumpScore: number;
        liquidityRemovalScore: number;
        devWalletActivityScore: number;
        overallRugScore: number;
    };
    riskScore: number;
    contractAnalysis: {
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
    priceTrend: {
        current: number;
        change24h: number;
        change7d: number;
    };
    volumeAnalysis: {
        volume24h: number;
        volumeChange: number;
        suspiciousVolume?: number;
    };
    liquidityAnalysis: {
        depth: number;
        slippage: number;
        change24h?: number;
    };
    volatilityScore: number;
    marketCap: number;
    sentimentAnalysis: {
        sentimentScore: number;
        positiveMentions: number;
        negativeMentions: number;
        neutralMentions: number;
        sentimentTrend: number;
        source: string;
    };
}

export interface EarlyOpportunityAnalysis {
    token: string;
    opportunityScore: number;
    entryStrategy: {
        suggestedEntryPrice: number;
        entryConfidence: number;
        entryTiming: string;
    };
    exitStrategy: {
        suggestedExitPrice: number;
        takeProfitLevels: { level: number; weight: number }[];
        stopLoss: number;
    };
    riskRewardRatio: number;
    predictedPotential: {
        shortTerm: number;
        midTerm: number;
        longTerm: number;
    };
    discoveryTimestamp: number;
    validationMetrics: {
        liquidityCheck: boolean;
        holderDistribution: 'healthy' | 'concentrated' | 'risky';
        contractSafety: 'safe' | 'verified' | 'unknown' | 'risky';
        socialVolume: number;
    };
    competitionAnalysis: {
        marketShare: number;
        comparableProjects: string[];
        uniqueAdvantages: string[];
    };
}

export interface NarrativeAnalysis {
    token: string;
    narrativeScore: number;
    trendingTopics: {
        topic: string;
        mentionCount: number;
        sentiment: number;
        momentum: number;
    }[];
    communitySentiment: {
        overall: number;
        breakdown: {
            twitter: number;
            discord: number;
            telegram: number;
        };
    };
    influencerActivity: {
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
    brandHealth: {
        awareness: number;
        trustLevel: number;
        communityEngagement: number;
    };
    competitivePositioning: {
        marketSegment: string;
        uniqueSellingPoints: string[];
        threatLevel: number;
        competitorMentions: { competitor: string; mentionCount: number }[];
    };
}

export interface SmartMoneyAnalysis {
    token: string;
    smartMoneyScore: number;
    trackedWallets: {
        address: string;
        label: string;
        totalInvested: number;
        currentPosition: number;
        profitLoss: number;
        entryPrice: number;
        confidence: number;
    }[];
    capitalFlows: {
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
    accumulationPattern: {
        isAccumulating: boolean;
        accumulationRate: number;
        averageEntryPrice: number;
        smartMoneyConfidence: number;
    };
    correlationAnalysis: {
        correlatedTokens: { token: string; correlation: number }[];
        marketCorrelation: number;
    };
}

export interface SurvivalAnalysis {
    token: string;
    survivalScore: number;
    liquidityHealth: {
        ratio: number;
        depth: number;
        volatility: number;
        sustainability: 'high' | 'medium' | 'low' | 'critical';
    };
    holderRetention: {
        retentionRate: number;
        averageHoldingPeriod: number;
        churnRate: number;
    };
    marketResilience: {
        priceStability: number;
        recoveryRate: number;
        crashResistance: number;
    };
    riskMetrics: {
        impermanentLossRisk: number;
        liquidationRisk: number;
        regulatoryRisk: number;
        overallRisk: 'low' | 'medium' | 'high' | 'critical';
    };
    sustainabilityIndicators: {
        revenueModel: string;
        tokenEmissionRate: number;
        stakingParticipation: number;
        treasuryHealth: number;
    };
    timelineForecast: {
        shortTerm: 'bullish' | 'neutral' | 'bearish';
        midTerm: 'bullish' | 'neutral' | 'bearish';
        longTerm: 'bullish' | 'neutral' | 'bearish';
        confidence: number;
    };
}

// Ranking & Scoring Types
export interface IntelligenceRanking {
    overallScore: number;
    riskScore: number;
    opportunityScore: number;
    convictionScore: number;
    rank: number;
    outOf: number;
    percentile: number;
    category: 'low_risk' | 'medium_risk' | 'high_risk' | 'speculative';
}

export interface AttentionVelocityAnalysis {
    token: string;
    velocity: number;
    trend: 'accelerating' | 'stable' | 'decelerating';
    sources: {
        twitter: number;
        discord: number;
        telegram: number;
    };
    velocityChange24h: number;
    attentionScore: number;
}

export interface ConvictionScoreAnalysis {
    token: string;
    convictionScore: number;
    factors: {
        technicalStrength: number;
        communityStrength: number;
        marketMomentum: number;
        teamCredibility: number;
    };
    convictionLevel: 'low' | 'medium' | 'high' | 'very_high';
}

export interface SignalConsensusResult {
    token: string;
    consensusScore: number;
    signals: {
        onchain: { score: number; weight: number };
        market: { score: number; weight: number };
        social: { score: number; weight: number };
        smartMoney: { score: number; weight: number };
    };
    consensus: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
}
