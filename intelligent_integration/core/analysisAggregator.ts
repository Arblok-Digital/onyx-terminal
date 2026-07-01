/**
 * Analysis Aggregator
 * Handles the aggregation and processing of analysis data
 */

import {
    IntelligenceReport,
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis
} from '../types/analysisTypes';

/**
 * Aggregate analysis data and generate mock reports when AI service fails
 */
export class AnalysisAggregator {
    /**
     * Generate a mock intelligence report when AI service fails
     */
    static generateMockIntelligenceReport(
        flow: FlowAnalysis,
        onchain: OnchainAnalysis,
        market: MarketAnalysis,
        earlyOpportunity?: EarlyOpportunityAnalysis,
        narrative?: NarrativeAnalysis,
        smartMoney?: SmartMoneyAnalysis,
        survival?: SurvivalAnalysis
    ): IntelligenceReport {
        const executiveSummary = 'No real-time data available. Returning mock report.';
        const keyInsights = [
            { insight: 'No insights available', confidence: 0, category: 'system' as const }
        ];
        const opportunityAssessment = {
            General: 'No early opportunity signals detected'
        };
        const riskAssessment = {
            General: 'No risk factors detected'
        };
        const patternDetection = 'No patterns detected';
        const recommendation = 'Monitor token activity for early signals.';

        return {
            rawResponse: executiveSummary,
            executiveSummary,
            keyInsights,
            opportunityAssessment,
            riskAssessment,
            patternDetection,
            recommendation,
            confidenceScore: 0,
            intelligenceRanking: this.calculateDefaultRanking(earlyOpportunity, onchain, smartMoney, survival, narrative)
        };
    }

    /**
     * Calculate default ranking from analysis data
     */
    static calculateDefaultRanking(
        earlyOpportunity?: EarlyOpportunityAnalysis,
        onchain?: OnchainAnalysis,
        smartMoney?: SmartMoneyAnalysis,
        survival?: SurvivalAnalysis,
        narrative?: NarrativeAnalysis
    ): {
        opportunityScore: number;
        riskScore: number;
        smartMoneyScore: number;
        survivalScore: number;
        narrativeScore: number;
        overallScore: number;
        rating: 'AVOID' | 'CAUTION' | 'MONITOR' | 'WATCH' | 'POTENTIAL' | 'OPPORTUNITY' | 'STRONG OPPORTUNITY';
    } {
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
     * Generate mock flow analysis
     */
    static generateMockFlowAnalysis(flowData: any): FlowAnalysis {
        return {
            token: flowData.token || '',
            patterns: [],
            confidence: 0,
            evidence: []
        };
    }

    /**
     * Generate mock onchain analysis
     */
    static generateMockOnchainAnalysis(onchainData: any): OnchainAnalysis {
        return {
            token: onchainData.token || '',
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
                overallRugScore: 0
            },
            riskScore: 0
        };
    }

    /**
     * Generate mock market analysis
     */
    static generateMockMarketAnalysis(marketData: any): MarketAnalysis {
        return {
            token: marketData.token || '',
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
            }
        };
    }

    /**
     * Generate mock opportunity analysis
     */
    static generateMockOpportunityAnalysis(opportunityData: any): EarlyOpportunityAnalysis {
        return {
            token: opportunityData.token || '',
            eoiScore: 0,
            rating: 'LOW OPPORTUNITY',
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
     * Generate mock narrative analysis
     */
    static generateMockNarrativeAnalysis(narrativeData: any): NarrativeAnalysis {
        return {
            token: narrativeData.token || '',
            narrative: '',
            confidence: 0,
            evidence: [],
            narrativeStrength: 0,
            relatedTokens: []
        };
    }

    /**
     * Generate mock smart money analysis
     */
    static generateMockSmartMoneyAnalysis(smartMoneyData: any): SmartMoneyAnalysis {
        return {
            token: smartMoneyData.token || '',
            smartMoneyScore: 0,
            smartWhales: [],
            totalSmartMoneyVolume: 0,
            smartMoneyPercentage: 0,
            confidence: 0
        };
    }

    /**
     * Generate mock survival analysis
     */
    static generateMockSurvivalAnalysis(survivalData: any): SurvivalAnalysis {
        return {
            token: survivalData.token || '',
            survivalProbability: 0,
            estimatedLifespan: '',
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
}