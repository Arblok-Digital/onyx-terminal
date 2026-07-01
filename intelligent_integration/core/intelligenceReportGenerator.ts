/**
 * Intelligence Report Generator
 * Handles the generation of comprehensive intelligence reports from analysis data
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
} from '../types/analysisTypes';

/**
 * Generate a comprehensive intelligence report from analysis data
 */
export function generateIntelligenceReport(
    rawResponse: string,
    flowAnalysis: FlowAnalysis,
    onchainAnalysis: OnchainAnalysis,
    marketAnalysis: MarketAnalysis,
    opportunityAnalysis: EarlyOpportunityAnalysis,
    narrativeAnalysis: NarrativeAnalysis,
    smartMoneyAnalysis: SmartMoneyAnalysis,
    survivalAnalysis: SurvivalAnalysis,
    ranking: IntelligenceRanking
): IntelligenceReport {
    // Extract key insights from each analysis
    const keyInsights: Array<{
        insight: string;
        confidence: number;
        category?: 'flow' | 'onchain' | 'market' | 'sentiment' | 'risk' | 'opportunity' | 'narrative' | 'smart-money' | 'survival' | 'system';
    }> = [];

    // Flow analysis insights
    if (flowAnalysis.patterns && flowAnalysis.patterns.length > 0) {
        keyInsights.push({
            insight: `Flow Patterns: ${flowAnalysis.patterns.join(', ')}`,
            confidence: flowAnalysis.confidence,
            category: 'flow'
        });
    }

    // Onchain analysis insights
    if (onchainAnalysis.whaleActivity.largeTransfers > 10) {
        keyInsights.push({
            insight: `High whale activity detected: ${onchainAnalysis.whaleActivity.largeTransfers} large transfers`,
            confidence: 80,
            category: 'onchain'
        });
    }
    if (onchainAnalysis.holderGrowth.growthRate > 0.2) {
        keyInsights.push({
            insight: `Strong holder growth: ${(onchainAnalysis.holderGrowth.growthRate * 100).toFixed(1)}%`,
            confidence: 75,
            category: 'onchain'
        });
    }

    // Market analysis insights
    if (marketAnalysis.priceTrend.change24h > 0.1) {
        keyInsights.push({
            insight: `Significant price movement: ${(marketAnalysis.priceTrend.change24h * 100).toFixed(1)}% in 24h`,
            confidence: 85,
            category: 'market'
        });
    }
    if (marketAnalysis.volumeAnalysis.volumeChange > 0.5) {
        keyInsights.push({
            insight: `High volume change: ${(marketAnalysis.volumeAnalysis.volumeChange * 100).toFixed(1)}%`,
            confidence: 80,
            category: 'market'
        });
    }

    // Opportunity analysis insights
    if (opportunityAnalysis.eoiScore > 70) {
        keyInsights.push({
            insight: `Strong opportunity signal: EOI score ${opportunityAnalysis.eoiScore}`,
            confidence: opportunityAnalysis.confidence,
            category: 'opportunity'
        });
    }

    // Narrative analysis insights
    if (narrativeAnalysis.narrativeStrength > 70) {
        keyInsights.push({
            insight: `Strong narrative: ${narrativeAnalysis.narrative}`,
            confidence: narrativeAnalysis.confidence,
            category: 'narrative'
        });
    }

    // Smart money insights
    if (smartMoneyAnalysis.smartMoneyPercentage > 20) {
        keyInsights.push({
            insight: `Smart money accumulation: ${smartMoneyAnalysis.smartMoneyPercentage}% of volume`,
            confidence: smartMoneyAnalysis.confidence,
            category: 'smart-money'
        });
    }

    // Survival analysis insights
    if (survivalAnalysis.survivalProbability < 0.3) {
        keyInsights.push({
            insight: `Low survival probability: ${(survivalAnalysis.survivalProbability * 100).toFixed(1)}%`,
            confidence: survivalAnalysis.confidence,
            category: 'survival'
        });
    }

    // Generate executive summary
    const executiveSummary = generateExecutiveSummary(
        opportunityAnalysis,
        onchainAnalysis,
        ranking
    );

    // Generate opportunity assessment
    const opportunityAssessment = generateOpportunityAssessment(opportunityAnalysis);

    // Generate risk assessment
    const riskAssessment = generateRiskAssessment(onchainAnalysis);

    // Generate recommendation
    const recommendation = generateRecommendation(ranking);

    return {
        rawResponse,
        executiveSummary,
        keyInsights,
        opportunityAssessment,
        riskAssessment,
        patternDetection: flowAnalysis.patterns.join(', ') || 'No patterns detected',
        recommendation,
        confidenceScore: calculateConfidenceScore(
            flowAnalysis.confidence,
            opportunityAnalysis.confidence,
            narrativeAnalysis.confidence,
            smartMoneyAnalysis.confidence,
            survivalAnalysis.confidence
        ),
        intelligenceRanking: ranking
    };
}

/**
 * Generate executive summary from analysis data
 */
function generateExecutiveSummary(
    opportunityAnalysis: EarlyOpportunityAnalysis,
    onchainAnalysis: OnchainAnalysis,
    ranking: IntelligenceRanking
): string {
    const opportunityLevel = opportunityAnalysis.rating;
    const riskLevel = calculateWarningLevel(onchainAnalysis.rugPullIndicators?.overallRugScore);

    return `This token presents a ${opportunityLevel.toLowerCase()} with ${riskLevel} risk.
    The overall intelligence rating is ${ranking.rating} (score: ${ranking.overallScore}/100).
    Key factors include an EOI score of ${opportunityAnalysis.eoiScore} and a rug pull risk score of ${onchainAnalysis.rugPullIndicators?.overallRugScore || 0}.`;
}

/**
 * Generate opportunity assessment
 */
function generateOpportunityAssessment(opportunityAnalysis: EarlyOpportunityAnalysis): Record<string, any> {
    return {
        eoiScore: opportunityAnalysis.eoiScore,
        rating: opportunityAnalysis.rating,
        factors: opportunityAnalysis.factors,
        confidence: opportunityAnalysis.confidence,
        evidence: opportunityAnalysis.evidence
    };
}

/**
 * Generate risk assessment
 */
function generateRiskAssessment(onchainAnalysis: OnchainAnalysis): Record<string, any> {
    return {
        rugPullRisk: onchainAnalysis.rugPullIndicators?.overallRugScore || 0,
        warningLevel: calculateWarningLevel(onchainAnalysis.rugPullIndicators?.overallRugScore),
        riskScore: onchainAnalysis.riskScore,
        whaleActivity: onchainAnalysis.whaleActivity,
        liquidityAnalysis: onchainAnalysis.liquidityAnalysis,
        developerActivity: onchainAnalysis.developerActivity
    };
}

/**
 * Generate recommendation based on ranking
 */
function generateRecommendation(ranking: IntelligenceRanking): string {
    const { rating, overallScore } = ranking;

    switch (rating) {
        case 'AVOID':
            return 'Strongly recommend avoiding this token due to high risk factors and low opportunity potential.';
        case 'CAUTION':
            return 'Recommend caution. This token has significant risk factors that outweigh potential opportunities.';
        case 'MONITOR':
            return 'Recommend monitoring. This token has balanced risk and opportunity factors with no clear advantage.';
        case 'WATCH':
            return 'Recommend watching. This token shows some positive signals but requires further validation.';
        case 'POTENTIAL':
            return 'Recommend considering. This token shows good potential but requires careful risk management.';
        case 'OPPORTUNITY':
            return 'Recommend taking action. This token presents a strong opportunity with manageable risks.';
        case 'STRONG OPPORTUNITY':
            return 'Strongly recommend taking immediate action. This token presents an exceptional opportunity with low risk.';
        default:
            return 'Unable to provide recommendation due to insufficient data.';
    }
}

/**
 * Calculate confidence score from multiple analysis sources
 */
function calculateConfidenceScore(...confidences: number[]): number {
    if (confidences.length === 0) return 0;

    const validConfidences = confidences.filter(c => c > 0);
    if (validConfidences.length === 0) return 0;

    const average = validConfidences.reduce((sum, c) => sum + c, 0) / validConfidences.length;
    return Math.round(average);
}

/**
 * Calculate warning level from rug score (0-100)
 */
function calculateWarningLevel(rugScore?: number): 'low' | 'medium' | 'high' | 'critical' {
    if (!rugScore) return 'low';
    if (rugScore < 30) return 'low';
    if (rugScore < 60) return 'medium';
    if (rugScore < 80) return 'high';
    return 'critical';
}