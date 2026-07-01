/**
 * Ranking Calculator
 * Handles the calculation of intelligence rankings from analysis data
 */

import {
    EarlyOpportunityAnalysis,
    OnchainAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis,
    IntelligenceRanking
} from '../types/analysisTypes';

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