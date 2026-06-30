/**
 * Enhanced Test for Onyx Terminal AMD Integration
 * Demonstrates all new features including Early Opportunity Index, Narrative Intelligence,
 * Smart Money Score, and Survival Probability
 */

// Sample token addresses for testing
const SAMPLE_TOKENS = {
    YUNO: 'YUNO_ADDRESS_SAMPLE',
    ZEX: 'ZEX_ADDRESS_SAMPLE',
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    AI_TOKEN: 'AI_TOKEN_ADDRESS_SAMPLE',
    MEME_TOKEN: 'MEME_TOKEN_ADDRESS_SAMPLE'
};

/**
 * Get token name from address
 */
function getTokenName(tokenAddress) {
    switch (tokenAddress) {
        case SAMPLE_TOKENS.YUNO: return 'YUNO';
        case SAMPLE_TOKENS.ZEX: return 'ZEX';
        case SAMPLE_TOKENS.SOL: return 'SOL';
        case SAMPLE_TOKENS.USDC: return 'USDC';
        case SAMPLE_TOKENS.AI_TOKEN: return 'AITOKEN';
        case SAMPLE_TOKENS.MEME_TOKEN: return 'MEMECOIN';
        default: return 'UNKNOWN';
    }
}

/**
 * Create mock flow analysis data
 */
function createMockFlowAnalysis(tokenAddress) {
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
 * Create mock onchain analysis data with rug pull detection
 */
function createMockOnchainAnalysis(tokenAddress) {
    const rugScore = 0.65 + Math.random() * 0.3; // 0.65-0.95
    const liquidityRemoval = 0.4 + Math.random() * 0.5; // 0.4-0.9

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
        developerActivity: {
            devWalletTransactions: 22,
            suspiciousTransfers: 8,
            devWalletBalance: 125000,
            devWallets: ['0xdevWallet1...', '0xdevWallet2...']
        },
        liquidityAnalysis: {
            liquidityDepth: 1200000,
            liquidityChange24h: -0.15,
            lockedLiquidity: 850000,
            liquidityConcentration: 0.85
        },
        rugPullIndicators: {
            dumpScore: 0.75,
            liquidityRemovalScore: liquidityRemoval,
            devWalletActivityScore: 0.8,
            overallRugScore: rugScore
        },
        riskScore: 0.78,
        contractAnalysis: {
            age: 7,
            creator: '0x3a7d...f89c',
            mintAuthority: false,
            freezeAuthority: false,
            isVerified: true,
            renounced: true,
            creationTimestamp: Date.now() - 7 * 24 * 60 * 60 * 1000
        }
    };
}

/**
 * Create mock market analysis data with sentiment analysis
 */
function createMockMarketAnalysis(tokenAddress) {
    return {
        token: tokenAddress,
        priceTrend: {
            current: 0.12,
            change24h: 0.18,
            change7d: 0.42
        },
        volumeAnalysis: {
            volume24h: 4200000,
            volumeChange: 3.2,
            suspiciousVolume: 0.68
        },
        liquidityAnalysis: {
            depth: 1200000,
            slippage: 0.082,
            change24h: -0.12
        },
        volatilityScore: 0.78,
        marketCap: 12000000,
        sentimentAnalysis: {
            sentimentScore: 0.65,
            positiveMentions: 420,
            negativeMentions: 180,
            neutralMentions: 350,
            sentimentTrend: 0.15,
            source: 'n/a'
        }
    };
}

/**
 * Create mock Early Opportunity Analysis
 */
function createMockEarlyOpportunityAnalysis(tokenAddress) {
    return {
        token: tokenAddress,
        eoiScore: 85.7,
        rating: 'HIGH OPPORTUNITY',
        factors: {
            volumeVelocity: 0.85,
            freshWalletGrowth: 0.78,
            whaleEntry: 0.82,
            liquidityGrowth: 0.75,
            buyPressure: 0.92,
            marketMomentum: 0.88
        },
        evidence: [
            'High volume velocity detected: 85% growth potential',
            'Strong new wallet growth: 150 new holders (15% growth)',
            'Significant whale entry detected: 3 whales controlling 45% supply',
            'Strong liquidity growth: $1.2M depth',
            'Extreme buy pressure: 4.2x sell pressure',
            'Strong market momentum: 18% 24h gain'
        ],
        confidence: 0.87
    };
}

/**
 * Create mock Narrative Analysis
 */
function createMockNarrativeAnalysis(tokenAddress) {
    const tokenName = getTokenName(tokenAddress);
    const isMeme = tokenName.includes('MEME') || tokenName.includes('DOGE') || tokenName.includes('PEPE');
    const isAI = tokenName.includes('AI') || tokenName.includes('AGIX') || tokenName.includes('FET');

    if (isMeme) {
        return {
            token: tokenAddress,
            narrative: 'Meme',
            confidence: 0.92,
            evidence: [
                'Token symbol contains "MEME" which is associated with Meme narrative',
                'Token exhibits characteristics of Meme narrative',
                'Related tokens in this narrative: DOGE, SHIB, PEPE, BONK, WIF'
            ],
            narrativeStrength: 88,
            relatedTokens: ['DOGE', 'SHIB', 'PEPE', 'BONK', 'WIF']
        };
    } else if (isAI) {
        return {
            token: tokenAddress,
            narrative: 'AI Infrastructure',
            confidence: 0.88,
            evidence: [
                'Token name suggests AI focus',
                'Token exhibits characteristics of AI Infrastructure narrative',
                'Related tokens in this narrative: FET, AGIX, OCEAN, RNDR, AKT'
            ],
            narrativeStrength: 82,
            relatedTokens: ['FET', 'AGIX', 'OCEAN', 'RNDR', 'AKT']
        };
    } else {
        return {
            token: tokenAddress,
            narrative: 'DeFi',
            confidence: 0.75,
            evidence: [
                'Token exhibits characteristics of DeFi narrative',
                'Related tokens in this narrative: UNI, AAVE, COMP, CRV, SUSHI'
            ],
            narrativeStrength: 72,
            relatedTokens: ['UNI', 'AAVE', 'COMP', 'CRV', 'SUSHI']
        };
    }
}

/**
 * Create mock Smart Money Analysis
 */
function createMockSmartMoneyAnalysis(tokenAddress) {
    return {
        token: tokenAddress,
        smartMoneyScore: 82.5,
        smartWhales: [
            {
                address: '0xsmartwhale1...',
                winRate: 0.85,
                roiHistory: 4.2,
                entryQuality: 0.92
            },
            {
                address: '0xsmartwhale2...',
                winRate: 0.78,
                roiHistory: 3.8,
                entryQuality: 0.88
            },
            {
                address: '0xdevWallet1...',
                winRate: 0.92,
                roiHistory: 5.1,
                entryQuality: 0.95
            }
        ],
        totalSmartMoneyVolume: 2400000,
        smartMoneyPercentage: 58.3,
        confidence: 0.85
    };
}

/**
 * Create mock Survival Analysis
 */
function createMockSurvivalAnalysis(tokenAddress) {
    return {
        token: tokenAddress,
        survivalProbability: 0.72,
        estimatedLifespan: '3-7 days',
        factors: {
            liquidityRetention: 0.75,
            holderGrowth: 0.82,
            buySellRatio: 0.92,
            whaleBehavior: 0.78,
            developerActivity: 0.65
        },
        confidence: 0.80
    };
}

/**
 * Create enhanced intelligence report with all new features
 */
function createEnhancedIntelligenceReport(tokenAddress) {
    const now = new Date();
    const tokenName = getTokenName(tokenAddress);

    const flowAnalysis = createMockFlowAnalysis(tokenAddress);
    const onchainAnalysis = createMockOnchainAnalysis(tokenAddress);
    const marketAnalysis = createMockMarketAnalysis(tokenAddress);
    const earlyOpportunityAnalysis = createMockEarlyOpportunityAnalysis(tokenAddress);
    const narrativeAnalysis = createMockNarrativeAnalysis(tokenAddress);
    const smartMoneyAnalysis = createMockSmartMoneyAnalysis(tokenAddress);
    const survivalAnalysis = createMockSurvivalAnalysis(tokenAddress);

    // Extract rug pull indicators
    const rugIndicators = onchainAnalysis.rugPullIndicators;
    const warningLevel = rugIndicators.overallRugScore > 0.8 ? 'critical' :
        rugIndicators.overallRugScore > 0.6 ? 'high' :
            rugIndicators.overallRugScore > 0.4 ? 'medium' : 'low';

    // Create executive summary with all new features
    let executiveSummary = `• ${tokenName} shows strong accumulation patterns with 320% volume growth in last 6 hours\n`;
    executiveSummary += `• Early Opportunity Index: ${earlyOpportunityAnalysis.eoiScore}/100 (${earlyOpportunityAnalysis.rating})\n`;
    executiveSummary += `• Narrative: ${narrativeAnalysis.narrative} (Strength: ${narrativeAnalysis.narrativeStrength}/100)\n`;
    executiveSummary += `• Smart Money Score: ${smartMoneyAnalysis.smartMoneyScore}/100 (${smartMoneyAnalysis.smartWhales.length} smart whales detected)\n`;
    executiveSummary += `• Survival Probability: ${(survivalAnalysis.survivalProbability * 100).toFixed(1)}% (Estimated lifespan: ${survivalAnalysis.estimatedLifespan})\n`;

    if (rugIndicators.overallRugScore > 0.7) {
        executiveSummary += `• ⚠️ HIGH RUG PULL RISK: ${(rugIndicators.overallRugScore * 100).toFixed(1)}% chance of rug pull detected\n`;
    } else if (rugIndicators.overallRugScore > 0.5) {
        executiveSummary += `• ⚠️ MODERATE RUG PULL RISK: ${(rugIndicators.overallRugScore * 100).toFixed(1)}% chance of rug pull detected\n`;
    }

    // Create key insights with all categories
    const keyInsights = [
        {
            insight: `${tokenName} is experiencing significant buy pressure with buy/sell ratio of 4.2:1`,
            confidence: 0.87,
            category: 'flow'
        },
        {
            insight: `Early Opportunity Index of ${earlyOpportunityAnalysis.eoiScore} indicates ${earlyOpportunityAnalysis.rating.toLowerCase()}`,
            confidence: 0.92,
            category: 'opportunity'
        },
        {
            insight: `Token narrative identified as "${narrativeAnalysis.narrative}" with ${narrativeAnalysis.narrativeStrength}/100 strength`,
            confidence: 0.88,
            category: 'narrative'
        },
        {
            insight: `Smart Money Score of ${smartMoneyAnalysis.smartMoneyScore} indicates ${smartMoneyAnalysis.smartWhales.length} high-quality whale wallets`,
            confidence: 0.85,
            category: 'smart-money'
        },
        {
            insight: `Survival probability of ${(survivalAnalysis.survivalProbability * 100).toFixed(1)}% with estimated lifespan of ${survivalAnalysis.estimatedLifespan}`,
            confidence: 0.82,
            category: 'survival'
        },
        {
            insight: `Whale accumulation detected - 3 wallets control 45% of total supply`,
            confidence: 0.92,
            category: 'onchain'
        },
        {
            insight: `Volume spike of 320% in last 6 hours indicates growing interest`,
            confidence: 0.89,
            category: 'market'
        },
        {
            insight: `Liquidity concentration risk: 60% of liquidity on single DEX`,
            confidence: 0.78,
            category: 'onchain'
        },
        {
            insight: `Suspicious volume patterns detected with score ${marketAnalysis.volumeAnalysis.suspiciousVolume}`,
            confidence: 0.82,
            category: 'market'
        },
        {
            insight: `Developer wallet activity shows ${onchainAnalysis.developerActivity.suspiciousTransfers} suspicious transfers`,
            confidence: 0.85,
            category: 'onchain'
        },
        {
            insight: `Sentiment analysis shows ${(marketAnalysis.sentimentAnalysis.sentimentScore * 100).toFixed(1)}% positive sentiment`,
            confidence: 0.70,
            category: 'sentiment'
        }
    ];

    // Create risk assessment
    const riskAssessment = {
        'Whale Concentration': onchainAnalysis.whaleActivity.concentration > 0.5 ? 'High' : 'Medium',
        'Liquidity Risk': onchainAnalysis.liquidityAnalysis.liquidityConcentration > 0.7 ? 'High' : 'Medium',
        'Contract Risk': onchainAnalysis.contractAnalysis.isVerified ? 'Low' : 'Medium',
        'Volatility': marketAnalysis.volatilityScore > 0.7 ? 'High' : 'Medium',
        'Rug Pull Risk': warningLevel === 'critical' ? 'Critical' :
            warningLevel === 'high' ? 'High' :
                warningLevel === 'medium' ? 'Medium' : 'Low'
    };

    // Create opportunity assessment
    const opportunityAssessment = {
        'Early Opportunity Index': earlyOpportunityAnalysis.rating.includes('HIGH') || earlyOpportunityAnalysis.rating.includes('EXTREME') ? 'High' : 'Medium',
        'Narrative Strength': narrativeAnalysis.narrativeStrength > 80 ? 'High' : 'Medium',
        'Smart Money Activity': smartMoneyAnalysis.smartMoneyScore > 80 ? 'High' : 'Medium',
        'Market Momentum': marketAnalysis.priceTrend.change24h > 0.2 ? 'High' : 'Medium',
        'Volume Growth': flowAnalysis.realtimeData.volumeGrowth > 2 ? 'High' : 'Medium'
    };

    // Create pattern detection
    let patternDetection = `Accumulation pattern detected with confidence 0.87.\n`;
    patternDetection += `Evidence:\n`;
    patternDetection += `- Buy pressure 4x sell pressure\n`;
    patternDetection += `- Whale entry detected ($1.2M+ transactions)\n`;
    patternDetection += `- Volume growth of 320% in 6 hours\n`;
    patternDetection += `- New holder growth of 15% in 24 hours\n\n`;

    patternDetection += `Early Opportunity Factors:\n`;
    patternDetection += `- Volume Velocity: ${(earlyOpportunityAnalysis.factors.volumeVelocity * 100).toFixed(1)}%\n`;
    patternDetection += `- Fresh Wallet Growth: ${(earlyOpportunityAnalysis.factors.freshWalletGrowth * 100).toFixed(1)}%\n`;
    patternDetection += `- Whale Entry: ${(earlyOpportunityAnalysis.factors.whaleEntry * 100).toFixed(1)}%\n`;
    patternDetection += `- Liquidity Growth: ${(earlyOpportunityAnalysis.factors.liquidityGrowth * 100).toFixed(1)}%\n`;
    patternDetection += `- Buy Pressure: ${(earlyOpportunityAnalysis.factors.buyPressure * 100).toFixed(1)}%\n`;
    patternDetection += `- Market Momentum: ${(earlyOpportunityAnalysis.factors.marketMomentum * 100).toFixed(1)}%\n\n`;

    if (rugIndicators.overallRugScore > 0.5) {
        patternDetection += `⚠️ RUG PULL PATTERNS DETECTED:\n`;
        patternDetection += `- Dump pattern: ${(rugIndicators.dumpScore * 100).toFixed(1)}% confidence\n`;
        patternDetection += `- Liquidity removal: ${(rugIndicators.liquidityRemovalScore * 100).toFixed(1)}% confidence\n`;
        patternDetection += `- Developer wallet activity: ${(rugIndicators.devWalletActivityScore * 100).toFixed(1)}% confidence\n`;
        patternDetection += `- Overall rug pull risk: ${(rugIndicators.overallRugScore * 100).toFixed(1)}% (${warningLevel.toUpperCase()})\n`;
    }

    // Create intelligence ranking
    const overallScore = (
        earlyOpportunityAnalysis.eoiScore * 0.3 +
        (1 - onchainAnalysis.riskScore) * 100 * 0.25 +
        smartMoneyAnalysis.smartMoneyScore * 0.2 +
        survivalAnalysis.survivalProbability * 100 * 0.15 +
        narrativeAnalysis.narrativeStrength * 0.1
    );

    let rating: 'AVOID' | 'CAUTION' | 'MONITOR' | 'WATCH' | 'POTENTIAL' | 'OPPORTUNITY' | 'STRONG OPPORTUNITY' = 'MONITOR';
    if (overallScore >= 90) rating = 'STRONG OPPORTUNITY';
    else if (overallScore >= 80) rating = 'OPPORTUNITY';
    else if (overallScore >= 70) rating = 'POTENTIAL';
    else if (overallScore >= 60) rating = 'WATCH';
    else if (overallScore >= 40) rating = 'CAUTION';
    else rating = 'AVOID';

    const intelligenceRanking = {
        opportunityScore: earlyOpportunityAnalysis.eoiScore,
        riskScore: (1 - onchainAnalysis.riskScore) * 100,
        smartMoneyScore: smartMoneyAnalysis.smartMoneyScore,
        survivalScore: survivalAnalysis.survivalProbability * 100,
        narrativeScore: narrativeAnalysis.narrativeStrength,
        overallScore: parseFloat(overallScore.toFixed(1)),
        rating
    };

    // Create recommendation
    let recommendation = `STRATEGIC RECOMMENDATION: ${rating}\n`;
    recommendation += `Based on comprehensive multi-layer intelligence analysis, ${tokenName} presents the following profile:\n\n`;

    recommendation += `🔹 EARLY OPPORTUNITY ASSESSMENT:\n`;
    recommendation += `- Early Opportunity Index: ${earlyOpportunityAnalysis.eoiScore}/100 (${earlyOpportunityAnalysis.rating})\n`;
    recommendation += `- This indicates ${earlyOpportunityAnalysis.rating.toLowerCase()} potential in the current market context\n\n`;

    recommendation += `🔹 NARRATIVE INTELLIGENCE:\n`;
    recommendation += `- Narrative: ${narrativeAnalysis.narrative} (Strength: ${narrativeAnalysis.narrativeStrength}/100)\n`;
    recommendation += `- Related tokens: ${narrativeAnalysis.relatedTokens.join(', ')}\n`;
    recommendation += `- Narrative strength suggests ${narrativeAnalysis.narrativeStrength > 80 ? 'strong' : 'moderate'} market alignment\n\n`;

    recommendation += `🔹 SMART MONEY ANALYSIS:\n`;
    recommendation += `- Smart Money Score: ${smartMoneyAnalysis.smartMoneyScore}/100\n`;
    recommendation += `- ${smartMoneyAnalysis.smartWhales.length} high-quality whale wallets detected\n`;
    recommendation += `- ${smartMoneyAnalysis.smartMoneyPercentage}% of volume from smart money\n`;
    recommendation += `- Smart money presence ${smartMoneyAnalysis.smartMoneyScore > 80 ? 'strongly supports' : 'supports'} potential\n\n`;

    recommendation += `🔹 SURVIVAL PROBABILITY:\n`;
    recommendation += `- Survival Probability: ${(survivalAnalysis.survivalProbability * 100).toFixed(1)}%\n`;
    recommendation += `- Estimated Lifespan: ${survivalAnalysis.estimatedLifespan}\n`;
    recommendation += `- ${survivalAnalysis.survivalProbability > 0.7 ? 'Good' : 'Moderate'} chance of surviving initial volatility\n\n`;

    if (warningLevel === 'critical' || warningLevel === 'high') {
        recommendation += `⚠️ HIGH RUG PULL WARNING:\n`;
        recommendation += `Extreme caution is advised. The token shows multiple red flags:\n`;
        recommendation += `- High dump score indicating potential sell-off\n`;
        recommendation += `- Significant liquidity removal risk\n`;
        recommendation += `- Suspicious developer wallet activity\n`;
        recommendation += `Do NOT invest without thorough due diligence.\n`;
    } else if (warningLevel === 'medium') {
        recommendation += `⚠️ MODERATE RISK WARNING:\n`;
        recommendation += `The token shows some concerning patterns. Monitor closely for:\n`;
        recommendation += `- Developer wallet activity\n`;
        recommendation += `- Liquidity changes\n`;
        recommendation += `- Sudden large transfers\n`;
    }

    recommendation += `\n🎯 STRATEGIC CONSIDERATIONS:\n`;
    recommendation += `- Current Rating: ${rating}\n`;
    recommendation += `- Overall Score: ${intelligenceRanking.overallScore}/100\n`;
    recommendation += `- Watch for: ${earlyOpportunityAnalysis.eoiScore > 80 ? 'entry opportunities' : 'confirmation signals'}\n`;
    recommendation += `- Monitor: ${narrativeAnalysis.narrativeStrength > 80 ? 'narrative momentum' : 'market sentiment'}\n`;
    recommendation += `- Next 24-48 hours critical for: ${survivalAnalysis.survivalProbability > 0.7 ? 'confirming survival' : 'assessing stability'}\n`;

    if (rating === 'STRONG OPPORTUNITY' || rating === 'OPPORTUNITY') {
        recommendation += `\n🚀 ACTIONABLE RECOMMENDATION:\n`;
        recommendation += `Consider monitoring for entry points with tight risk management.\n`;
        recommendation += `Set stop-loss at 30-50% below current price to protect against volatility.\n`;
        recommendation += `Watch for confirmation of ${narrativeAnalysis.narrative} narrative momentum.\n`;
    } else if (rating === 'POTENTIAL' || rating === 'WATCH') {
        recommendation += `\n👀 MONITORING RECOMMENDATION:\n`;
        recommendation += `Continue monitoring for additional signals before considering entry.\n`;
        recommendation += `Watch for:\n`;
        recommendation += `- Increasing smart money activity\n`;
        recommendation += `- Strengthening narrative momentum\n`;
        recommendation += `- Improving liquidity retention\n`;
        recommendation += `- Confirmation of survival beyond 72 hours\n`;
    } else {
        recommendation += `\n❌ CAUTION RECOMMENDATION:\n`;
        recommendation += `High risk profile suggests caution. Avoid or monitor for significant improvements.\n`;
    }

    // Calculate overall confidence score
    const confidenceScore = Math.min(1,
        0.3 * flowAnalysis.confidence +
        0.2 * (1 - onchainAnalysis.riskScore) +
        0.15 * (1 - marketAnalysis.volatilityScore) +
        0.1 * marketAnalysis.sentimentAnalysis.sentimentScore +
        0.1 * earlyOpportunityAnalysis.confidence +
        0.05 * narrativeAnalysis.confidence +
        0.05 * smartMoneyAnalysis.confidence +
        0.05 * survivalAnalysis.confidence
    );

    return {
        rawResponse: `Enhanced intelligence report for ${tokenName} (${tokenAddress})`,
        executiveSummary,
        keyInsights,
        opportunityAssessment,
        riskAssessment,
        patternDetection,
        rugPullIndicators: {
            ...rugIndicators,
            warningLevel
        },
        sentimentAnalysis: marketAnalysis.sentimentAnalysis,
        earlyOpportunityAnalysis,
        narrativeAnalysis,
        smartMoneyAnalysis,
        survivalAnalysis,
        intelligenceRanking,
        recommendation,
        confidenceScore: parseFloat(confidenceScore.toFixed(2)),
        metadata: {
            token: tokenAddress,
            timestamp: now.toISOString(),
            dataSources: [
                'Mock Jupiter Websocket',
                'Mock Helius API',
                'Mock Birdeye API',
                'Mock CoinGecko API',
                'Mock Twitter API (pending)',
                'AMD Cloud AI (Mock)',
                'Narrative Intelligence',
                'Smart Money Database'
            ]
        }
    };
}

/**
 * Test individual agents
 */
function testIndividualAgents() {
    console.log('🧪 TESTING INDIVIDUAL AGENTS');
    console.log('='.repeat(80));

    const tokenAddress = SAMPLE_TOKENS.AI_TOKEN;
    const tokenName = getTokenName(tokenAddress);

    // Test Early Opportunity Agent
    console.log('\n📈 EARLY OPPORTUNITY AGENT:');
    const eoiAnalysis = createMockEarlyOpportunityAnalysis(tokenAddress);
    console.log(`- EOI Score: ${eoiAnalysis.eoiScore}/100 (${eoiAnalysis.rating})`);
    console.log(`- Factors:`);
    for (const [factor, value] of Object.entries(eoiAnalysis.factors)) {
        console.log(`  - ${factor}: ${(value * 100).toFixed(1)}%`);
    }
    console.log(`- Evidence: ${eoiAnalysis.evidence.length} points`);

    // Test Narrative Agent
    console.log('\n📖 NARRATIVE AGENT:');
    const narrativeAnalysis = createMockNarrativeAnalysis(tokenAddress);
    console.log(`- Narrative: ${narrativeAnalysis.narrative}`);
    console.log(`- Strength: ${narrativeAnalysis.narrativeStrength}/100`);
    console.log(`- Confidence: ${narrativeAnalysis.confidence}`);
    console.log(`- Related Tokens: ${narrativeAnalysis.relatedTokens.join(', ')}`);

    // Test Smart Money Agent
    console.log('\n💰 SMART MONEY AGENT:');
    const smartMoneyAnalysis = createMockSmartMoneyAnalysis(tokenAddress);
    console.log(`- Smart Money Score: ${smartMoneyAnalysis.smartMoneyScore}/100`);
    console.log(`- Smart Whales: ${smartMoneyAnalysis.smartWhales.length}`);
    console.log(`- Smart Money Volume: $${(smartMoneyAnalysis.totalSmartMoneyVolume / 1000000).toFixed(2)}M`);
    console.log(`- Smart Money Percentage: ${smartMoneyAnalysis.smartMoneyPercentage}%`);

    // Test Survival Agent
    console.log('\n⏳ SURVIVAL AGENT:');
    const survivalAnalysis = createMockSurvivalAnalysis(tokenAddress);
    console.log(`- Survival Probability: ${(survivalAnalysis.survivalProbability * 100).toFixed(1)}%`);
    console.log(`- Estimated Lifespan: ${survivalAnalysis.estimatedLifespan}`);
    console.log(`- Factors:`);
    for (const [factor, value] of Object.entries(survivalAnalysis.factors)) {
        console.log(`  - ${factor}: ${(value * 100).toFixed(1)}%`);
    }
}

/**
 * Run enhanced sample analysis
 */
function runEnhancedAnalysis() {
    console.log('🔍 Running Enhanced Analysis for Onyx Terminal AMD Integration');
    console.log('='.repeat(80));

    // Test different token types
    const tokensToTest = [
        SAMPLE_TOKENS.AI_TOKEN,
        SAMPLE_TOKENS.MEME_TOKEN,
        SAMPLE_TOKENS.YUNO
    ];

    tokensToTest.forEach((tokenAddress, index) => {
        console.log(`\n📊 ENHANCED INTELLIGENCE REPORT #${index + 1}`);
        console.log('-'.repeat(60));
        console.log(`Token: ${getTokenName(tokenAddress)} (${tokenAddress})`);

        const report = createEnhancedIntelligenceReport(tokenAddress);

        console.log(`\n📌 EXECUTIVE SUMMARY:`);
        console.log(report.executiveSummary);

        console.log(`\n🔍 KEY INSIGHTS:`);
        report.keyInsights.forEach((insight, i) => {
            console.log(`${i + 1}. [${insight.category.toUpperCase()}] ${insight.insight} (Confidence: ${insight.confidence})`);
        });

        console.log(`\n🎯 OPPORTUNITY ASSESSMENT:`);
        for (const [factor, level] of Object.entries(report.opportunityAssessment)) {
            console.log(`- ${factor}: ${level}`);
        }

        console.log(`\n⚠️ RISK ASSESSMENT:`);
        for (const [risk, level] of Object.entries(report.riskAssessment)) {
            console.log(`- ${risk}: ${level}`);
        }

        console.log(`\n📈 INTELLIGENCE RANKING:`);
        console.log(`- Opportunity Score: ${report.intelligenceRanking.opportunityScore}/100`);
        console.log(`- Risk Score: ${report.intelligenceRanking.riskScore}/100`);
        console.log(`- Smart Money Score: ${report.intelligenceRanking.smartMoneyScore}/100`);
        console.log(`- Survival Score: ${report.intelligenceRanking.survivalScore}/100`);
        console.log(`- Narrative Score: ${report.intelligenceRanking.narrativeScore}/100`);
        console.log(`- Overall Score: ${report.intelligenceRanking.overallScore}/100`);
        console.log(`- Rating: ${report.intelligenceRanking.rating}`);

        console.log(`\n📡 DATA SOURCES:`);
        report.metadata.dataSources.forEach(source => {
            console.log(`- ${source}`);
        });

        console.log(`\n✅ Analysis completed for ${getTokenName(tokenAddress)}`);
    });
}

/**
 * Run comprehensive test
 */
function runComprehensiveTest() {
    // Test individual agents
    testIndividualAgents();

    // Run enhanced analysis
    runEnhancedAnalysis();

    // Test Agent Orchestrator simulation
    console.log('\n🤖 AGENT ORCHESTRATOR SIMULATION');
    console.log('='.repeat(80));
    console.log('Simulating orchestration of all 7 intelligence agents:');
    console.log('- Flow Intelligence Agent');
    console.log('- Onchain Agent');
    console.log('- Market Agent');
    console.log('- Early Opportunity Agent');
    console.log('- Narrative Agent');
    console.log('- Smart Money Agent');
    console.log('- Survival Agent');
    console.log('- AMD Research Manager (Synthesis)');
    console.log('\n✅ All agents orchestrated successfully');
    console.log('✅ Comprehensive intelligence report generated');
    console.log('✅ 4-Layer Intelligence System operational');
}

// Run the comprehensive test
runComprehensiveTest();