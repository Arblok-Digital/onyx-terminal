/**
 * @file analysisAggregator.ts
 * @layer core
 * @desc Aggregation and processing of analysis data.
 *       NOTE: All generateMock*() methods have been removed — they silently returned fake data
 *       which could be misinterpreted as real intelligence. Use IntelligenceError instead.
 *
 * @exposes ParsedIntelligenceReport
 */

import type {
    IntelligenceRanking,
} from '../types/analysisTypes';

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
 * NOTE: AnalysisAggregator class and all generateMock*() methods have been removed.
 * These methods silently returned zero-value analysis data that could be misinterpreted
 * as real intelligence signals. Use IntelligenceError from ./intelligenceErrors instead.
 *
 * If you need default/fallback values for UI rendering, handle them at the component level
 * with proper "no data" states rather than injecting fake analysis results.
 */
