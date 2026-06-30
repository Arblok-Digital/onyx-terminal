/**
 * Type definitions for Onyx Terminal Intelligence Analysis
 */

export interface FlowAnalysis {
    token: string;
    patterns: Array<{
        type: string;
        strength: number;
        evidence: string[];
    }>;
    confidence: number;
    evidence: string[];
    realtimeData?: {
        buyPressure: number;
        sellPressure: number;
        volumeGrowth: number;
        whaleActivity: number;
    };
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
    marketCap?: number;
    sentimentAnalysis?: {
        sentimentScore: number;
        positiveMentions: number;
        negativeMentions: number;
        neutralMentions: number;
        sentimentTrend: number;
        source: 'twitter' | 'telegram' | 'reddit' | 'n/a';
    };
}

export interface EarlyOpportunityAnalysis {
    token: string;
    eoiScore: number; // Early Opportunity Index (0-100)
    rating: 'LOW OPPORTUNITY' | 'MODERATE OPPORTUNITY' | 'HIGH OPPORTUNITY' | 'EXTREME OPPORTUNITY';
    factors: {
        volumeVelocity: number;
        freshWalletGrowth: number;
        whaleEntry: number;
        liquidityGrowth: number;
        buyPressure: number;
        marketMomentum: number;
    };
    evidence: string[];
    confidence: number;
}

export interface NarrativeAnalysis {
    token: string;
    narrative: string; // e.g., "AI Infrastructure", "Meme", "DePIN", "RWA", "Gaming", "SocialFi"
    confidence: number;
    evidence: string[];
    narrativeStrength: number; // 0-100
    relatedTokens?: string[];
}

export interface SmartMoneyAnalysis {
    token: string;
    smartMoneyScore: number; // 0-100
    smartWhales: {
        address: string;
        winRate: number;
        roiHistory: number;
        entryQuality: number;
    }[];
    totalSmartMoneyVolume: number;
    smartMoneyPercentage: number;
    confidence: number;
}

export interface SurvivalAnalysis {
    token: string;
    survivalProbability: number; // 0-1
    estimatedLifespan: string; // e.g., "1-3 days", "3-7 days", "1-4 weeks", "1+ months"
    factors: {
        liquidityRetention: number;
        holderGrowth: number;
        buySellRatio: number;
        whaleBehavior: number;
        developerActivity: number;
    };
    confidence: number;
}

export interface IntelligenceRanking {
    opportunityScore: number; // 0-100
    riskScore: number; // 0-100
    smartMoneyScore: number; // 0-100
    survivalScore: number; // 0-100
    narrativeScore: number; // 0-100
    overallScore: number; // 0-100
    rating: 'AVOID' | 'CAUTION' | 'MONITOR' | 'WATCH' | 'POTENTIAL' | 'OPPORTUNITY' | 'STRONG OPPORTUNITY';
}

export interface IntelligenceReport {
    rawResponse: string;
    executiveSummary: string;
    keyInsights: Array<{
        insight: string;
        confidence: number;
        category?: 'flow' | 'onchain' | 'market' | 'sentiment' | 'risk' | 'opportunity' | 'narrative' | 'smart-money' | 'survival' | 'system';
    }>;
    riskAssessment: Record<string, string>;
    opportunityAssessment: Record<string, string>;
    patternDetection: string;
    rugPullIndicators?: {
        dumpScore: number;
        liquidityRemovalScore: number;
        devWalletActivityScore: number;
        overallRugScore: number;
        warningLevel: 'low' | 'medium' | 'high' | 'critical';
    };
    sentimentAnalysis?: {
        sentimentScore: number;
        positiveMentions: number;
        negativeMentions: number;
        neutralMentions: number;
        sentimentTrend: number;
        source: 'twitter' | 'telegram' | 'reddit' | 'n/a';
    };
    earlyOpportunityAnalysis?: EarlyOpportunityAnalysis;
    narrativeAnalysis?: NarrativeAnalysis;
    smartMoneyAnalysis?: SmartMoneyAnalysis;
    survivalAnalysis?: SurvivalAnalysis;
    intelligenceRanking?: IntelligenceRanking;
    attentionVelocityAnalysis?: AttentionVelocityAnalysis;
    convictionScoreAnalysis?: ConvictionScoreAnalysis;
    signalConsensus?: SignalConsensusResult;
    recommendation: string;
    confidenceScore: number;
    metadata?: {
        token: string;
        timestamp: string;
        dataSources: string[];
        routingDecision?: {
            modelUsed: string;
            isFallback: boolean;
            confidence: number;
        };
        analysisVersion?: string;
        featuresUsed?: string[];
        errorDetails?: {
            message: string;
            stack: string;
            timestamp: string;
        };
    };
}

// Import interfaces from AgentRouter (these would normally be in separate files)
export interface AttentionVelocityAnalysis {
    token: string;
    attentionVelocity: number; // 0-100
    velocityTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
    timeWindow: number; // in minutes
    evidence: {
        socialMediaMentions: number;
        tradingVolumeGrowth: number;
        walletGrowthRate: number;
        priceMomentum: number;
    };
    confidence: number;
}

export interface ConvictionScoreAnalysis {
    token: string;
    convictionScore: number; // 0-100
    convictionTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
    smartMoneyConviction: number;
    retailConviction: number;
    evidence: {
        smartMoneyHoldings: number;
        smartMoneyEntryPoints: number;
        retailFomoIndicator: number;
        liquidityLockStatus: boolean;
    };
    confidence: number;
}

export interface SignalConsensusResult {
    token: string;
    consensusScore: number; // 0-100
    conflictingSignals: Array<{
        agent: string;
        signal: string;
        confidence: number;
        resolution: string;
    }>;
    resolvedSignals: Array<{
        agent: string;
        signal: string;
        confidence: number;
        weight: number;
    }>;
    finalDecision: string;
    confidence: number;
}

export interface AgentConfig {
    name: string;
    model: string;
    endpoint: string;
    priority: number;
    enabled: boolean;
}
