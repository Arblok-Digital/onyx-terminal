/**
 * Mock data for Onyx Terminal test suites
 * Pure data — no AgentOrchestrator / API dependencies.
 * Safe to import in browser (Vite) context.
 */

export const SAMPLE_TOKENS = {
    YUNO: 'GjC6m8TH4MqL4HjGjKbE5xJ7fY9oL3sW2pR8nA1qV4cB',
    BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    POPCAT: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
};

export const MOCK_FLOW_DATA = {
    timestamp: Date.now(),
    token: SAMPLE_TOKENS.YUNO,
    tokenName: 'YUNO',
    symbol: 'YUNO',
    buyPressure: 0.75,
    sellPressure: 0.25,
    volume24h: 1500000,
    uniqueWallets1h: 450,
    avgTransactionSize: 250,
    largeTransactions: [
        { amount: 50000, type: 'buy', wallet: '4xKp...V3x9' },
        { amount: 75000, type: 'buy', wallet: '8mNp...W2q7' }
    ],
    flowPattern: 'accumulation' as const,
    priorityScore: 85,
    isNewToken: true,
    tokenAddress: SAMPLE_TOKENS.YUNO,
    type: 'raydium' as const,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    liquidityUSD: 500000,
    marketCap: 5000000,
    priceUSD: 0.000001,
    priceChange5m: 12.5,
    priceChange1h: 45.2,
    buys5m: 120,
    sells5m: 35
};

export const MOCK_ONCHAIN_DATA = {
    token: SAMPLE_TOKENS.YUNO,
    signature: '5xKp...V3x9',
    type: 'create' as const,
    tokenAddress: SAMPLE_TOKENS.YUNO,
    name: 'YUNO',
    symbol: 'YUNO',
    uri: 'https://example.com/yuno.json',
    mint: SAMPLE_TOKENS.YUNO,
    metadata: {
        name: 'YUNO',
        symbol: 'YUNO',
        uri: 'https://example.com/yuno.json',
        supply: 1000000000,
        decimals: 6
    },
    whaleActivity: {
        largeTransfers: 5,
        whaleWallets: 3,
        concentration: 0.45
    },
    holderGrowth: {
        newHolders: 120,
        growthRate: 0.35
    },
    developerActivity: {
        devWalletTransactions: 2,
        suspiciousTransfers: 0,
        devWalletBalance: 500000,
        devWallets: ['7xKp...N3m8']
    },
    liquidityAnalysis: {
        liquidityDepth: 500000,
        liquidityChange24h: 0.15,
        lockedLiquidity: 450000,
        liquidityConcentration: 0.3,
        depth: 500000,
        slippage: 0.5
    },
    rugPullIndicators: {
        dumpScore: 15,
        liquidityRemovalScore: 10,
        devWalletActivityScore: 20,
        overallRugScore: 15
    },
    riskScore: 20,
    detectionLevel: 'safe' as const,
    confidence: 0.85,
    priceUSD: 0.000001,
    priceChange24h: 45.2,
    volume24h: 1500000,
    holders: 850
};

export const MOCK_MARKET_DATA = {
    token: SAMPLE_TOKENS.YUNO,
    priceTrend: {
        current: 0.000001,
        change24h: 45.2,
        change7d: 120.5
    },
    volumeAnalysis: {
        volume24h: 1500000,
        volumeChange: 0.35
    },
    liquidityAnalysis: {
        depth: 500000,
        slippage: 0.5
    },
    volatilityScore: 65,
    sentimentAnalysis: {
        sentimentScore: 72,
        positiveMentions: 450,
        negativeMentions: 120,
        neutralMentions: 230,
        sentimentTrend: 0.65,
        source: 'twitter'
    },
    priceUSD: 0.000001,
    priceChange24h: 45.2,
    volume24h: 1500000,
    marketCap: 5000000,
    liquidityUSD: 500000
};

export const MOCK_OPPORTUNITY_DATA = {
    token: SAMPLE_TOKENS.YUNO,
    eoiScore: 78,
    rating: 'HIGH OPPORTUNITY' as const,
    factors: {
        volumeVelocity: 0.8,
        freshWalletGrowth: 0.7,
        whaleEntry: 0.6,
        liquidityGrowth: 0.75,
        buyPressure: 0.85,
        marketMomentum: 0.7
    },
    evidence: [
        'Strong buy pressure detected from multiple new wallets',
        'Whale accumulation pattern identified in last 30 minutes',
        'Volume spike with healthy liquidity depth'
    ],
    confidence: 0.82
};

export const MOCK_NARRATIVE_DATA = {
    token: SAMPLE_TOKENS.YUNO,
    narrative: 'Community-driven meme token with viral potential',
    confidence: 0.75,
    evidence: [
        'Strong social media engagement on Twitter',
        'Multiple influencer mentions in last 24 hours',
        'Growing Telegram community with active discussions'
    ],
    narrativeStrength: 72
};

export const MOCK_SMART_MONEY_DATA = {
    token: SAMPLE_TOKENS.YUNO,
    smartMoneyScore: 68,
    smartWhales: [
        { address: '4xKp...V3x9', volume: 50000, winRate: 0.75 },
        { address: '8mNp...W2q7', volume: 75000, winRate: 0.82 }
    ],
    totalSmartMoneyVolume: 125000,
    smartMoneyPercentage: 0.35,
    confidence: 0.78
};

export const MOCK_SURVIVAL_DATA = {
    token: SAMPLE_TOKENS.YUNO,
    survivalProbability: 0.65,
    estimatedLifespan: '3-6 months',
    factors: {
        liquidityRetention: 0.7,
        holderGrowth: 0.6,
        buySellRatio: 0.75,
        whaleBehavior: 0.65,
        developerActivity: 0.55
    },
    confidence: 0.7
};

export const MOCK_INTELLIGENCE_REPORT = {
    rawResponse: 'Mock intelligence report for testing purposes',
    executiveSummary: 'YUNO shows strong early accumulation patterns with high buy pressure and growing holder base. Multiple smart money wallets detected accumulating.',
    keyInsights: [
        { insight: 'Strong accumulation pattern from multiple whale wallets', confidence: 0.85, category: 'flow' as const },
        { insight: 'Healthy holder growth with low concentration', confidence: 0.78, category: 'onchain' as const },
        { insight: 'Volume spike with organic trading activity', confidence: 0.82, category: 'market' as const },
        { insight: 'High conviction buying from smart money wallets', confidence: 0.75, category: 'smart-money' as const },
        { insight: 'Growing community narrative with viral potential', confidence: 0.72, category: 'narrative' as const },
    ],
    opportunityAssessment: {
        'Volume Velocity': 'High',
        'Holder Growth': 'Medium',
        'Whale Activity': 'High',
        'Liquidity Health': 'Medium',
        'Community Engagement': 'Medium'
    },
    riskAssessment: {
        'Rug Pull Risk': 'Low',
        'Liquidity Risk': 'Medium',
        'Concentration Risk': 'Low',
        'Market Volatility': 'Medium'
    },
    patternDetection: 'Multiple accumulation patterns detected. Smart money wallets accumulating with high conviction. Volume profile suggests organic growth with minimal wash trading.',
    recommendation: 'MONITOR with high priority. Strong early signals warrant close observation. Set price alerts for breakout confirmation above current range.',
    confidenceScore: 0.78,
    intelligenceRanking: {
        opportunityScore: 78,
        riskScore: 20,
        smartMoneyScore: 68,
        survivalScore: 65,
        narrativeScore: 72,
        overallScore: 72,
        rating: 'WATCH'
    },
    intelligenceScore: 72,
    timestamp: Date.now(),
    tokenAddress: SAMPLE_TOKENS.YUNO,
    tokenName: 'YUNO'
};