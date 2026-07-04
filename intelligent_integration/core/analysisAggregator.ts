/**
 * Analysis Aggregator
 * Handles the aggregation and processing of analysis data
 */

import {
    IntelligenceRanking,
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis
} from '../types/analysisTypes';
import { getActiveWeights } from './scoringWeights';

/**
 * Parsed Intelligence Report structure (matches ReportParser.parseIntelligenceResponse output)
 */
export interface ParsedIntelligenceReport {
    rawResponse: string;
    executiveSummary: string;
    keyInsights: Array<{ insight: string; confidence: number; category?: string }>;
    opportunityAssessment: Record<string, string>;
    riskAssessment: Record<string, string>;
    patternDetection: string;
    recommendation: string;
    confidenceScore: number;
    intelligenceRanking: IntelligenceRanking;
    rugPullIndicators?: {
        dumpScore: number;
        liquidityRemovalScore: number;
        devWalletActivityScore: number;
        overallRugScore: number;
        warningLevel: 'low' | 'medium' | 'high' | 'critical';
    };
    metadata?: {
        token: string;
        timestamp: string;
        dataSources: string[];
        routingDecision?: {
            modelUsed: string;
            isFallback: boolean;
            confidence: number;
        };
        featuresUsed?: string[];
    };
}

/**
 * Aggregate analysis data and generate mock reports when AI service fails
 */
export class AnalysisAggregator {
    /**
     * Generate a mock intelligence report when AI service fails
     * Returns the same structure as ReportParser.parseIntelligenceResponse()
     */
    static generateMockIntelligenceReport(
        flow: FlowAnalysis,
        onchain: OnchainAnalysis,
        market: MarketAnalysis,
        earlyOpportunity?: EarlyOpportunityAnalysis,
        narrative?: NarrativeAnalysis,
        smartMoney?: SmartMoneyAnalysis,
        survival?: SurvivalAnalysis
    ): ParsedIntelligenceReport {
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
        const ranking = this.calculateDefaultRanking(earlyOpportunity, onchain, smartMoney, survival, narrative);

        return {
            rawResponse: executiveSummary,
            executiveSummary,
            keyInsights,
            opportunityAssessment,
            riskAssessment,
            patternDetection,
            recommendation,
            confidenceScore: 0,
            intelligenceRanking: ranking,
            // Add fields expected by IntelligenceReportView
            rugPullIndicators: onchain?.rugPullIndicators ? {
                dumpScore: onchain.rugPullIndicators.dumpScore,
                liquidityRemovalScore: onchain.rugPullIndicators.liquidityRemovalScore,
                devWalletActivityScore: onchain.rugPullIndicators.devWalletActivityScore,
                overallRugScore: onchain.rugPullIndicators.overallRugScore,
                warningLevel: onchain.rugPullIndicators.overallRugScore >= 90 ? 'critical' :
                    onchain.rugPullIndicators.overallRugScore >= 70 ? 'high' :
                        onchain.rugPullIndicators.overallRugScore >= 40 ? 'medium' : 'low'
            } : undefined,
            metadata: {
                token: flow?.token || onchain?.token || market?.token || 'Unknown',
                timestamp: new Date().toISOString(),
                dataSources: ['mock'],
                routingDecision: {
                    modelUsed: 'mock',
                    isFallback: true,
                    confidence: 0
                },
                featuresUsed: ['mock']
            }
        };
    }

    /**
     * Calculate default ranking from analysis data
     * Returns IntelligenceRanking type matching the type definition
     */
    static calculateDefaultRanking(
        earlyOpportunity?: EarlyOpportunityAnalysis,
        onchain?: OnchainAnalysis,
        smartMoney?: SmartMoneyAnalysis,
        survival?: SurvivalAnalysis,
        narrative?: NarrativeAnalysis
    ): IntelligenceRanking {
        // Calculate opportunity score
        let opportunityScore = 50;
        if (earlyOpportunity) {
            opportunityScore = earlyOpportunity.opportunityScore || 50;
        }

        // Calculate risk score (lower risk is better, so invert)
        let riskScore = 50;
        if (onchain) {
            riskScore = 100 - (onchain.riskScore || 50);
        }

        // Calculate smart money score
        let smartMoneyScore = 50;
        if (smartMoney) {
            smartMoneyScore = smartMoney.smartMoneyScore || 50;
        }

        // Calculate survival score
        let survivalScore = 50;
        if (survival) {
            survivalScore = survival.survivalScore || 50;
        }

        // Calculate narrative score
        let narrativeScore = 50;
        if (narrative) {
            narrativeScore = narrative.narrativeScore || 50;
        }

        // Calculate overall score (weighted average from configurable weights)
        const weights = getActiveWeights();
        const overallScore = Math.round(
            (opportunityScore * weights.opportunity) +
            (riskScore * weights.risk) +
            (smartMoneyScore * weights.smartMoney) +
            (survivalScore * weights.survival) +
            (narrativeScore * weights.narrative)
        );

        // Calculate conviction score (average of all scores)
        const convictionScore = Math.round(
            (opportunityScore + riskScore + smartMoneyScore + survivalScore + narrativeScore) / 5
        );

        // Determine category based on overall score
        let category: 'low_risk' | 'medium_risk' | 'high_risk' | 'speculative' = 'medium_risk';
        if (overallScore >= 70) category = 'low_risk';
        else if (overallScore >= 50) category = 'medium_risk';
        else if (overallScore >= 30) category = 'high_risk';
        else category = 'speculative';

        // Calculate rank and percentile (mock values)
        const rank = Math.max(1, Math.floor(100 - overallScore));
        const outOf = 100;
        const percentile = Math.round((1 - rank / outOf) * 100);

        return {
            opportunityScore,
            riskScore,
            convictionScore,
            overallScore,
            rank,
            outOf,
            percentile,
            category
        };
    }

    /**
     * Generate mock flow analysis
     */
    static generateMockFlowAnalysis(flowData: any): FlowAnalysis {
        return {
            token: flowData.token || '',
            inflow: 0,
            outflow: 0,
            netFlow: 0,
            majorInflows: [],
            majorOutflows: [],
            exchangeFlow: {
                inflowToExchanges: 0,
                outflowFromExchanges: 0,
                netExchangeFlow: 0
            },
            anomalousTransactions: []
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
            riskScore: 0,
            contractAnalysis: {
                age: 0,
                creator: '',
                mintAuthority: false,
                freezeAuthority: false,
                isVerified: false,
                renounced: false
            }
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
            marketCap: 0,
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
            opportunityScore: 0,
            entryStrategy: {
                suggestedEntryPrice: 0,
                entryConfidence: 0,
                entryTiming: ''
            },
            exitStrategy: {
                suggestedExitPrice: 0,
                takeProfitLevels: [],
                stopLoss: 0
            },
            riskRewardRatio: 0,
            predictedPotential: {
                shortTerm: 0,
                midTerm: 0,
                longTerm: 0
            },
            discoveryTimestamp: Date.now(),
            validationMetrics: {
                liquidityCheck: false,
                holderDistribution: 'risky',
                contractSafety: 'unknown',
                socialVolume: 0
            },
            competitionAnalysis: {
                marketShare: 0,
                comparableProjects: [],
                uniqueAdvantages: []
            }
        };
    }

    /**
     * Generate mock narrative analysis
     */
    static generateMockNarrativeAnalysis(narrativeData: any): NarrativeAnalysis {
        return {
            token: narrativeData.token || '',
            narrativeScore: 0,
            trendingTopics: [],
            communitySentiment: {
                overall: 0,
                breakdown: {
                    twitter: 0,
                    discord: 0,
                    telegram: 0
                }
            },
            influencerActivity: {
                totalInfluencers: 0,
                positiveMentions: 0,
                negativeMentions: 0,
                topInfluencers: []
            },
            brandHealth: {
                awareness: 0,
                trustLevel: 0,
                communityEngagement: 0
            },
            competitivePositioning: {
                marketSegment: '',
                uniqueSellingPoints: [],
                threatLevel: 0,
                competitorMentions: []
            }
        };
    }

    /**
     * Generate mock smart money analysis
     */
    static generateMockSmartMoneyAnalysis(smartMoneyData: any): SmartMoneyAnalysis {
        return {
            token: smartMoneyData.token || '',
            smartMoneyScore: 0,
            trackedWallets: [],
            capitalFlows: {
                inflow24h: 0,
                outflow24h: 0,
                netFlow: 0,
                significantTransactions: []
            },
            accumulationPattern: {
                isAccumulating: false,
                accumulationRate: 0,
                averageEntryPrice: 0,
                smartMoneyConfidence: 0
            },
            correlationAnalysis: {
                correlatedTokens: [],
                marketCorrelation: 0
            }
        };
    }

    /**
     * Generate mock survival analysis
     */
    static generateMockSurvivalAnalysis(survivalData: any): SurvivalAnalysis {
        return {
            token: survivalData.token || '',
            survivalScore: 0,
            liquidityHealth: {
                ratio: 0,
                depth: 0,
                volatility: 0,
                sustainability: 'critical'
            },
            holderRetention: {
                retentionRate: 0,
                averageHoldingPeriod: 0,
                churnRate: 0
            },
            marketResilience: {
                priceStability: 0,
                recoveryRate: 0,
                crashResistance: 0
            },
            riskMetrics: {
                impermanentLossRisk: 0,
                liquidationRisk: 0,
                regulatoryRisk: 0,
                overallRisk: 'critical'
            },
            sustainabilityIndicators: {
                revenueModel: '',
                tokenEmissionRate: 0,
                stakingParticipation: 0,
                treasuryHealth: 0
            },
            timelineForecast: {
                shortTerm: 'bearish',
                midTerm: 'bearish',
                longTerm: 'bearish',
                confidence: 0
            }
        };
    }
}
