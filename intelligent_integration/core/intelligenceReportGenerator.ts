/**
 * @file intelligenceReportGenerator.ts
 * @layer core
 * @desc Generates structured intelligence report summaries from all 8 agent analyses.
 *       Produces executive summary, key insights, risk assessment, and recommendations.
 *       Aligned with V3 analysisTypes - all fields optional safe.
 *
 * @exposes generateIntelligenceReport
 */

import type {
  FlowAnalysis,
  OnchainAnalysis,
  MarketAnalysis,
  EarlyOpportunityAnalysis,
  NarrativeAnalysis,
  SmartMoneyAnalysis,
  SurvivalAnalysis,
  IntelligenceRanking,
} from '../types/analysisTypes';

export interface ReportSummary {
  executiveSummary: string;
  keyInsights: Array<{
    insight: string;
    confidence: number;
    category?: string;
  }>;
  recommendations: string[];
  confidenceScore: number;
  riskAssessment: {
    rugPullRisk: number;
    warningLevel: string;
    riskScore: number;
    whaleActivity: {
      largeTransfers: number;
      whaleWallets: number;
      concentration: number;
    };
    liquidityAnalysis: {
      liquidityDepth: number;
      liquidityChange24h: number;
      lockedLiquidity: number;
      liquidityConcentration: number;
    };
    developerActivity: {
      devWalletTransactions: number;
      suspiciousTransfers: number;
      devWalletBalance: number;
      devWallets: string[];
    };
  };
}

/**
 * Generate a comprehensive intelligence report summary from all agent analyses.
 */
export function generateIntelligenceReport(
  flowAnalysis: FlowAnalysis,
  onchainAnalysis: OnchainAnalysis,
  marketAnalysis: MarketAnalysis,
  opportunityAnalysis: EarlyOpportunityAnalysis,
  narrativeAnalysis: NarrativeAnalysis,
  smartMoneyAnalysis: SmartMoneyAnalysis,
  survivalAnalysis: SurvivalAnalysis,
  ranking: IntelligenceRanking,
): ReportSummary {
  const keyInsights: Array<{
    insight: string;
    confidence: number;
    category?: string;
  }> = [];

  // Flow analysis insights
  const flowPatterns = flowAnalysis.patterns ?? [];
  if (flowPatterns.length > 0) {
    const patternNames = flowPatterns.map(p => p.type).join(', ');
    keyInsights.push({
      insight: `Flow Patterns: ${patternNames}`,
      confidence: (flowAnalysis.confidence ?? 0.5) * 100,
      category: 'flow',
    });
  }

  const netFlow = flowAnalysis.netFlow ?? 0;
  if (Math.abs(netFlow) > 0) {
    keyInsights.push({
      insight: `Net flow: ${netFlow > 0 ? '+' : ''}${netFlow.toFixed(0)} transactions (${netFlow > 0 ? 'inflowing' : 'outflowing'})`,
      confidence: 70,
      category: 'flow',
    });
  }

  // Onchain analysis insights
  const largeTransfers = onchainAnalysis.whaleActivity?.largeTransfers ?? 0;
  if (largeTransfers > 10) {
    keyInsights.push({
      insight: `High whale activity: ${largeTransfers} large transfers`,
      confidence: 80,
      category: 'onchain',
    });
  }

  const growthRate = onchainAnalysis.holderGrowth?.growthRate ?? 0;
  if (growthRate > 0.2) {
    keyInsights.push({
      insight: `Strong holder growth: ${(growthRate * 100).toFixed(1)}%`,
      confidence: 75,
      category: 'onchain',
    });
  }

  const rugScore = onchainAnalysis.rugPullIndicators?.overallRugScore ?? 0;
  if (rugScore > 0.5) {
    keyInsights.push({
      insight: `Elevated rug pull risk: ${(rugScore * 100).toFixed(0)}/100`,
      confidence: 85,
      category: 'risk',
    });
  }

  // Market analysis insights
  const change24h = marketAnalysis.priceTrend?.change24h ?? 0;
  if (Math.abs(change24h) > 0.1) {
    keyInsights.push({
      insight: `Significant price movement: ${(change24h * 100).toFixed(1)}% in 24h`,
      confidence: 85,
      category: 'market',
    });
  }

  const volChange = marketAnalysis.volumeAnalysis?.volumeChange ?? 0;
  if (volChange > 0.5) {
    keyInsights.push({
      insight: `High volume change: ${(volChange * 100).toFixed(1)}%`,
      confidence: 80,
      category: 'market',
    });
  }

  // Opportunity analysis insights
  const eoiScore = opportunityAnalysis.eoiScore ?? 0;
  if (eoiScore > 70) {
    keyInsights.push({
      insight: `Strong opportunity signal: EOI score ${eoiScore}/100`,
      confidence: (opportunityAnalysis.confidence ?? 0.5) * 100,
      category: 'opportunity',
    });
  } else if (eoiScore < 30) {
    keyInsights.push({
      insight: `Low opportunity: EOI score ${eoiScore}/100`,
      confidence: (opportunityAnalysis.confidence ?? 0.5) * 100,
      category: 'opportunity',
    });
  }

  // Narrative analysis insights
  const narrativeStrength = narrativeAnalysis.narrativeStrength ?? 0;
  if (narrativeStrength > 70 && narrativeAnalysis.narrative) {
    keyInsights.push({
      insight: `Strong narrative: ${narrativeAnalysis.narrative}`,
      confidence: (narrativeAnalysis.confidence ?? 0.5) * 100,
      category: 'narrative',
    });
  }

  // Smart money insights
  const smartMoneyPct = smartMoneyAnalysis.smartMoneyPercentage ?? 0;
  if (smartMoneyPct > 20) {
    keyInsights.push({
      insight: `Smart money accumulation: ${smartMoneyPct}% of supply`,
      confidence: (smartMoneyAnalysis.confidence ?? 0.5) * 100,
      category: 'smart-money',
    });
  }

  // Survival analysis insights
  const survivalProb = survivalAnalysis.survivalProbability ?? 0;
  if (survivalProb < 0.3) {
    keyInsights.push({
      insight: `Low survival probability: ${(survivalProb * 100).toFixed(1)}% - ${survivalAnalysis.estimatedLifespan ?? 'unknown'}`,
      confidence: (survivalAnalysis.confidence ?? 0.5) * 100,
      category: 'survival',
    });
  } else if (survivalProb > 0.7) {
    keyInsights.push({
      insight: `High survival probability: ${(survivalProb * 100).toFixed(1)}% - ${survivalAnalysis.estimatedLifespan ?? 'unknown'}`,
      confidence: (survivalAnalysis.confidence ?? 0.5) * 100,
      category: 'survival',
    });
  }

  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(
    opportunityAnalysis,
    onchainAnalysis,
    ranking,
  );

  // Generate risk assessment
  const riskAssessment = buildRiskAssessment(onchainAnalysis);

  // Generate recommendations
  const recommendations = generateRecommendations(ranking, opportunityAnalysis, onchainAnalysis);

  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(
    (flowAnalysis.confidence ?? 0.5) * 100,
    (opportunityAnalysis.confidence ?? 0.5) * 100,
    (narrativeAnalysis.confidence ?? 0.5) * 100,
    (smartMoneyAnalysis.confidence ?? 0.5) * 100,
    (survivalAnalysis.confidence ?? 0.5) * 100,
  );

  return {
    executiveSummary,
    keyInsights,
    recommendations,
    confidenceScore,
    riskAssessment,
  };
}

/**
 * Generate executive summary from analysis data.
 */
function generateExecutiveSummary(
  opportunityAnalysis: EarlyOpportunityAnalysis,
  onchainAnalysis: OnchainAnalysis,
  ranking: IntelligenceRanking,
): string {
  const opportunityLevel = opportunityAnalysis.rating ?? 'UNKNOWN';
  const riskLevel = calculateWarningLevel(onchainAnalysis.rugPullIndicators?.overallRugScore);
  const eoiScore = opportunityAnalysis.eoiScore ?? 0;
  const rugScore = onchainAnalysis.rugPullIndicators?.overallRugScore ?? 0;
  const overallScore = ranking.overallScore ?? 0;
  const rating = ranking.rating ?? 'NEUTRAL';

  return [
    `This token presents a ${opportunityLevel} opportunity with ${riskLevel} risk.`,
    `Overall intelligence rating: ${rating} (score: ${overallScore}/100).`,
    `EOI Score: ${eoiScore}/100 | Rug Pull Risk: ${(rugScore * 100).toFixed(0)}/100.`,
    opportunityAnalysis.entryStrategy?.entryTiming
      ? `Entry timing: ${opportunityAnalysis.entryStrategy.entryTiming}.`
      : '',
    `Confidence: ${(opportunityAnalysis.confidence ?? 0.5) * 100}%`,
  ].filter(Boolean).join(' ');
}

/**
 * Build risk assessment from onchain analysis.
 */
function buildRiskAssessment(onchainAnalysis: OnchainAnalysis) {
  return {
    rugPullRisk: onchainAnalysis.rugPullIndicators?.overallRugScore ?? 0,
    warningLevel: calculateWarningLevel(onchainAnalysis.rugPullIndicators?.overallRugScore),
    riskScore: onchainAnalysis.riskScore ?? 0.5,
    whaleActivity: {
      largeTransfers: onchainAnalysis.whaleActivity?.largeTransfers ?? 0,
      whaleWallets: onchainAnalysis.whaleActivity?.whaleWallets ?? 0,
      concentration: onchainAnalysis.whaleActivity?.concentration ?? 0,
    },
    liquidityAnalysis: {
      liquidityDepth: onchainAnalysis.liquidityAnalysis?.liquidityDepth ?? 0,
      liquidityChange24h: onchainAnalysis.liquidityAnalysis?.liquidityChange24h ?? 0,
      lockedLiquidity: onchainAnalysis.liquidityAnalysis?.lockedLiquidity ?? 0,
      liquidityConcentration: onchainAnalysis.liquidityAnalysis?.liquidityConcentration ?? 0,
    },
    developerActivity: {
      devWalletTransactions: onchainAnalysis.developerActivity?.devWalletTransactions ?? 0,
      suspiciousTransfers: onchainAnalysis.developerActivity?.suspiciousTransfers ?? 0,
      devWalletBalance: onchainAnalysis.developerActivity?.devWalletBalance ?? 0,
      devWallets: onchainAnalysis.developerActivity?.devWallets ?? [],
    },
  };
}

/**
 * Generate recommendations based on ranking and analysis.
 */
function generateRecommendations(
  ranking: IntelligenceRanking,
  opportunity: EarlyOpportunityAnalysis,
  onchain: OnchainAnalysis,
): string[] {
  const recs: string[] = [];
  const rating = ranking.rating ?? 'MONITOR';
  const rugScore = onchain.rugPullIndicators?.overallRugScore ?? 0.5;
  const concentration = onchain.whaleActivity?.concentration ?? 0;
  const hasMint = onchain.contractAnalysis?.mintAuthority ?? false;
  const hasFreeze = onchain.contractAnalysis?.freezeAuthority ?? false;

  // Risk-based recommendations
  if (rugScore > 0.7) {
    recs.push('HIGH RISK: Strong rug pull indicators detected. Consider avoiding or using strict stop-loss.');
  } else if (rugScore > 0.5) {
    recs.push('MODERATE RISK: Elevated rug pull risk. Monitor developer wallet activity closely.');
  }

  if (hasMint) {
    recs.push('CAUTION: Mint authority is still active. Developer can mint new tokens at any time.');
  }
  if (hasFreeze) {
    recs.push('CAUTION: Freeze authority is still active. Developer can freeze holder accounts.');
  }

  if (concentration > 0.5) {
    recs.push('WARNING: High supply concentration. Top whales control >50% of supply.');
  }

  // Opportunity-based recommendations
  const eoiScore = opportunity.eoiScore ?? 0;
  if (eoiScore > 75) {
    recs.push('STRONG OPPORTUNITY: High EOI score. Consider entry with defined risk management.');
    recs.push(`Suggested entry strategy: ${opportunity.entryStrategy?.entryTiming ?? 'monitor for entry'}.`);
  } else if (eoiScore > 50) {
    recs.push('MODERATE OPPORTUNITY: Average EOI score. Monitor for better entry signals.');
  } else {
    recs.push('LOW OPPORTUNITY: Weak signals. Consider skipping this token.');
  }

  // Rating-based recommendations
  switch (rating) {
    case 'AVOID':
      recs.push('Final verdict: AVOID. High risk factors outweigh any potential opportunity.');
      break;
    case 'CAUTION':
      recs.push('Final verdict: CAUTION. Significant risk factors detected.');
      break;
    case 'MONITOR':
      recs.push('Final verdict: MONITOR. Balanced risk/opportunity - wait for clearer signals.');
      break;
    case 'WATCH':
      recs.push('Final verdict: WATCH. Some positive signals but needs further validation.');
      break;
    case 'POTENTIAL':
      recs.push('Final verdict: POTENTIAL. Good signals but requires careful risk management.');
      break;
    case 'OPPORTUNITY':
      recs.push('Final verdict: OPPORTUNITY. Strong signals with manageable risks.');
      break;
    case 'STRONG OPPORTUNITY':
      recs.push('Final verdict: STRONG OPPORTUNITY. Exceptional signals with low risk.');
      break;
  }

  return recs;
}

/**
 * Calculate confidence score from multiple analysis sources.
 */
function calculateConfidenceScore(...confidences: number[]): number {
  if (confidences.length === 0) return 0;
  const valid = confidences.filter(c => c > 0);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((sum, c) => sum + c, 0) / valid.length);
}

/**
 * Calculate warning level from rug score (0-1).
 */
function calculateWarningLevel(rugScore?: number): 'low' | 'medium' | 'high' | 'critical' {
  if (!rugScore) return 'low';
  if (rugScore < 0.3) return 'low';
  if (rugScore < 0.6) return 'medium';
  if (rugScore < 0.8) return 'high';
  return 'critical';
}