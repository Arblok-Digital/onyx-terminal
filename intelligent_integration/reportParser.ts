/**
 * @file intelligent_integration/reportParser.ts
 * @desc Response parsing and data extraction for 9Router Intelligence
 */

import type {
    IntelligenceRanking,
    IntelligenceReport,
    FlowAnalysis,
    OnchainAnalysis,
    MarketAnalysis,
    EarlyOpportunityAnalysis,
    NarrativeAnalysis,
    SmartMoneyAnalysis,
    SurvivalAnalysis
} from './types/analysisTypes';

export class ReportParser {
    /**
     * Parse the raw intelligence response into a structured report
     */
    static parseIntelligenceResponse(rawResponse: string): IntelligenceReport {
        const executiveSummary = this.extractSection(rawResponse, 'Executive Summary');
        const keyInsights = this.extractKeyInsights(rawResponse);
        const opportunityAssessment = this.extractAssessment(rawResponse, 'Opportunity Assessment');
        const riskAssessment = this.extractAssessment(rawResponse, 'Risk Assessment');
        const patternDetection = this.extractSection(rawResponse, 'Pattern Detection');
        const recommendation = this.extractSection(rawResponse, 'Recommendation');
        const intelligenceRanking = this.extractIntelligenceRanking(rawResponse);
        const confidenceScore = this.calculateConfidenceScore(rawResponse);

        return {
            rawResponse,
            executiveSummary,
            keyInsights,
            opportunityAssessment,
            riskAssessment,
            patternDetection,
            recommendation,
            confidenceScore,
            intelligenceRanking
        };
    }

    /**
     * Extract a specific section from the response
     */
    static extractSection(response: string, sectionName: string): string {
        const sectionRegex = new RegExp(`${sectionName}:?\\s*([\\s\\S]*?)(?=\\n\\n|\\n##|\\n###|$)`);
        const match = response.match(sectionRegex);
        return match ? match[1].trim() : 'Not available';
    }

    /**
     * Extract key insights from the response
     */
    static extractKeyInsights(response: string): Array<{ insight: string; confidence: number }> {
        const insightsRegex = /Key Insight \d+:?\s*(.*?)\s*\(Confidence: (\d+)%\)/g;
        const insights: Array<{ insight: string; confidence: number }> = [];
        let match;

        while ((match = insightsRegex.exec(response)) !== null) {
            const insight = match[1].trim();
            const confidence = parseInt(match[2], 10);
            insights.push({ insight, confidence });
        }

        return insights.length > 0 ? insights : [{ insight: 'No insights available', confidence: 0 }];
    }

    /**
     * Extract assessment data from the response
     */
    static extractAssessment(response: string, assessmentType: string): Record<string, string> {
        const assessmentRegex = new RegExp(`${assessmentType}:?\\s*([\\s\\S]*?)(?=\\n\\n|\\n##|\\n###|$)`);
        const match = response.match(assessmentRegex);
        const assessment: Record<string, string> = {};

        if (match) {
            const assessmentText = match[1].trim();
            const lines = assessmentText.split('\n');

            for (const line of lines) {
                const [key, value] = line.split(':').map(part => part.trim());
                if (key && value) {
                    assessment[key] = value;
                }
            }
        }

        if (Object.keys(assessment).length === 0) {
            assessment.General = 'No assessment available';
        }

        return assessment;
    }

    /**
     * Extract intelligence ranking from the response
     */
    static extractIntelligenceRanking(response: string): IntelligenceRanking {
        const rankingRegex = /Intelligence Ranking:?\s*([\s\S]*?)(?=\n\n|\n##|\n###|$)/;
        const match = response.match(rankingRegex);

        if (match) {
            const rankingText = match[1].trim();
            const ranking: IntelligenceRanking = {
                opportunityScore: 0,
                riskScore: 0,
                smartMoneyScore: 0,
                survivalScore: 0,
                narrativeScore: 0,
                overallScore: 0,
                rating: 'AVOID'
            };

            const lines = rankingText.split('\n');
            for (const line of lines) {
                const [key, value] = line.split(':').map(part => part.trim());
                if (key && value) {
                    const numericValue = parseInt(value.replace('%', '').trim(), 10);
                    const cleanKey = key.replace(/\s+/g, '');

                    // Map the extracted key to the correct property
                    if (cleanKey === 'Opportunity' || cleanKey === 'opportunityScore') {
                        ranking.opportunityScore = numericValue;
                    } else if (cleanKey === 'Risk' || cleanKey === 'riskScore') {
                        ranking.riskScore = numericValue;
                    } else if (cleanKey === 'SmartMoney' || cleanKey === 'smartMoneyScore') {
                        ranking.smartMoneyScore = numericValue;
                    } else if (cleanKey === 'Survival' || cleanKey === 'survivalScore') {
                        ranking.survivalScore = numericValue;
                    } else if (cleanKey === 'Narrative' || cleanKey === 'narrativeScore') {
                        ranking.narrativeScore = numericValue;
                    } else if (cleanKey === 'Overall' || cleanKey === 'overallScore') {
                        ranking.overallScore = numericValue;
                    }
                }
            }

            ranking.overallScore = this.calculateOverallScore(ranking);
            ranking.rating = this.calculateRating(ranking.overallScore);
            return ranking;
        }

        return this.calculateDefaultRanking();
    }

    /**
     * Calculate confidence score from the response
     */
    static calculateConfidenceScore(response: string): number {
        const confidenceRegex = /Confidence Score: (\d+)%/;
        const match = response.match(confidenceRegex);
        return match ? parseInt(match[1], 10) : 0;
    }

    /**
     * Calculate default ranking when no ranking is found
     */
    static calculateDefaultRanking(
        earlyOpportunity?: EarlyOpportunityAnalysis,
        onchain?: OnchainAnalysis,
        smartMoney?: SmartMoneyAnalysis,
        survival?: SurvivalAnalysis,
        narrative?: NarrativeAnalysis
    ): IntelligenceRanking {
        const ranking: IntelligenceRanking = {
            opportunityScore: earlyOpportunity ? earlyOpportunity.eoiScore : 0,
            riskScore: onchain ? onchain.riskScore : 0,
            smartMoneyScore: smartMoney ? smartMoney.smartMoneyScore : 0,
            survivalScore: survival ? survival.survivalProbability : 0,
            narrativeScore: narrative ? narrative.narrativeStrength * 10 : 0,
            overallScore: 0,
            rating: 'AVOID'
        };

        // Adjust risk score to be 100 - riskScore (lower risk is better)
        if (onchain) {
            ranking.riskScore = 100 - onchain.riskScore;
        }

        ranking.overallScore = this.calculateOverallScore(ranking);
        ranking.rating = this.calculateRating(ranking.overallScore);
        return ranking;
    }

    /**
     * Calculate overall score from ranking
     */
    static calculateOverallScore(ranking: IntelligenceRanking): number {
        const scores = Object.values(ranking).filter(score => typeof score === 'number');
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        return scores.length > 0 ? totalScore / scores.length : 0;
    }

    /**
     * Calculate rating based on overall score
     */
    static calculateRating(overallScore: number): 'AVOID' | 'CAUTION' | 'MONITOR' | 'WATCH' | 'POTENTIAL' | 'OPPORTUNITY' | 'STRONG OPPORTUNITY' {
        if (overallScore >= 90) {
            return 'STRONG OPPORTUNITY';
        } else if (overallScore >= 70) {
            return 'OPPORTUNITY';
        } else if (overallScore >= 50) {
            return 'POTENTIAL';
        } else if (overallScore >= 30) {
            return 'WATCH';
        } else if (overallScore >= 10) {
            return 'CAUTION';
        } else {
            return 'AVOID';
        }
    }

    /**
     * Calculate warning level based on rug pull score
     */
    static calculateWarningLevel(rugPullScore: number): 'low' | 'medium' | 'high' | 'critical' {
        if (rugPullScore >= 90) {
            return 'critical';
        } else if (rugPullScore >= 70) {
            return 'high';
        } else if (rugPullScore >= 40) {
            return 'medium';
        } else {
            return 'low';
        }
    }
}