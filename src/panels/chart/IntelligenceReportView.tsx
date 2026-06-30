/**
 * @file IntelligenceReportView.tsx
 * @layer panel
 * @desc Visual component for displaying AMD Intelligence Report in Chart panel
 * @exposes IntelligenceReportView
 * @deps amd_integration/types/analysisTypes, ui components
 */

import React from "react";
interface ConflictingSignal {
    agent: string;
    signal: string;
    confidence: number;
    resolution: string;
}

interface KeyInsight {
    insight: string;
    confidence: number;
    category?: 'flow' | 'onchain' | 'market' | 'sentiment' | 'risk' | 'opportunity' | 'narrative' | 'smart-money' | 'survival' | 'system';
}

interface SignalConsensusResult {
    token: string;
    consensusScore: number;
    conflictingSignals: ConflictingSignal[];
    resolvedSignals?: Array<{
        agent: string;
        signal: string;
        confidence: number;
        weight: number;
    }>;
    finalDecision: string;
    confidence: number;
}

interface AttentionVelocityAnalysis {
    token: string;
    attentionVelocity: number;
    velocityTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
    timeWindow: number;
    evidence: Record<string, number>;
    confidence: number;
}

interface ConvictionScoreAnalysis {
    token: string;
    convictionScore: number;
    convictionTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
    smartMoneyConviction: number;
    retailConviction: number;
    evidence: Record<string, number>;
    confidence: number;
}

interface RugPullIndicators {
    dumpScore: number;
    liquidityRemovalScore: number;
    devWalletActivityScore: number;
    overallRugScore: number;
    warningLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface IntelligenceReport {
    rawResponse: string;
    executiveSummary: string;
    keyInsights: KeyInsight[];
    riskAssessment: Record<string, string>;
    opportunityAssessment: Record<string, string>;
    patternDetection: string;
    rugPullIndicators?: RugPullIndicators;
    recommendation: string;
    confidenceScore: number;
    attentionVelocityAnalysis?: AttentionVelocityAnalysis;
    convictionScoreAnalysis?: ConvictionScoreAnalysis;
    signalConsensus?: SignalConsensusResult;
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
import styles from "./Chart.module.css";

interface IntelligenceReportViewProps {
    report: IntelligenceReport;
}

const IntelligenceReportView: React.FC<IntelligenceReportViewProps> = ({ report }) => {
    // Extract key metrics
    const attentionVelocity = report.attentionVelocityAnalysis;
    const convictionScore = report.convictionScoreAnalysis;
    const signalConsensus = report.signalConsensus;
    const rugPullRisk = report.rugPullIndicators?.overallRugScore || 0;
    const recommendation = report.recommendation;

    // Determine risk level color
    const getRiskColor = (score: number) => {
        if (score >= 0.8) return "#ff4444"; // Critical - red
        if (score >= 0.6) return "#ff9900"; // High - orange
        if (score >= 0.4) return "#ffcc00"; // Medium - yellow
        return "#00C851"; // Low - green
    };

    // Determine recommendation color
    const getRecommendationColor = (rec: string) => {
        if (rec.includes("STRONG BUY")) return "#00C851"; // green
        if (rec.includes("BUY")) return "#4CAF50"; // light green
        if (rec.includes("HOLD")) return "#2196F3"; // blue
        if (rec.includes("SELL")) return "#ff9900"; // orange
        if (rec.includes("AVOID")) return "#ff4444"; // red
        return "#9E9E9E"; // gray
    };

    // Format confidence score
    const formatConfidence = (score: number) => {
        return `${Math.round(score * 100)}%`;
    };

    // Render gauge component
    const renderGauge = (value: number, max: number, label: string, color: string) => {
        const percentage = Math.min(100, Math.round((value / max) * 100));
        return (
            <div className={styles.gaugeContainer}>
                <div className={styles.gaugeLabel}>{label}</div>
                <div className={styles.gauge}>
                    <div
                        className={styles.gaugeFill}
                        style={{
                            width: `${percentage}%`,
                            backgroundColor: color
                        }}
                    ></div>
                    <div className={styles.gaugeValue}>{value}</div>
                </div>
                <div className={styles.gaugeScale}>
                    <span>0</span>
                    <span>{max}</span>
                </div>
            </div>
        );
    };

    // Render evidence items
    const renderEvidence = (evidence: Record<string, number>, title: string) => {
        return (
            <div className={styles.evidenceSection}>
                <div className={styles.evidenceTitle}>{title}</div>
                <div className={styles.evidenceGrid}>
                    {Object.entries(evidence).map(([key, value]) => (
                        <div key={key} className={styles.evidenceItem}>
                            <div className={styles.evidenceValue}>{value}</div>
                            <div className={styles.evidenceLabel}>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Render signal consensus
    const renderSignalConsensus = () => {
        if (!signalConsensus) return null;

        return (
            <div className={styles.consensusSection}>
                <div className={styles.consensusHeader}>
                    <div className={styles.consensusTitle}>SIGNAL CONSENSUS</div>
                    <div className={styles.consensusScore} style={{
                        backgroundColor: signalConsensus.consensusScore >= 70 ? "#00C851" :
                            signalConsensus.consensusScore >= 40 ? "#4CAF50" : "#9E9E9E"
                    }}>
                        {signalConsensus.consensusScore}/100
                    </div>
                </div>

                <div className={styles.consensusDecision}>
                    {signalConsensus.finalDecision}
                </div>

                {signalConsensus.conflictingSignals && signalConsensus.conflictingSignals.length > 0 && (
                    <div className={styles.conflictSection}>
                        <div className={styles.conflictTitle}>Conflicting Signals Resolved</div>
                        <div className={styles.conflictList}>
                            {signalConsensus.conflictingSignals.map((conflict, index) => (
                                <div key={index} className={styles.conflictItem}>
                                    <div className={styles.conflictAgent}>{conflict.agent}</div>
                                    <div className={styles.conflictSignal}>{conflict.signal}</div>
                                    <div className={styles.conflictResolution}>{conflict.resolution}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render risk assessment
    const renderRiskAssessment = () => {
        return (
            <div className={styles.riskSection}>
                <div className={styles.riskTitle}>RISK ASSESSMENT</div>
                <div className={styles.riskGrid}>
                    <div className={styles.riskItem}>
                        <div className={styles.riskLabel}>Rug Pull Risk</div>
                        <div className={styles.riskValue} style={{ color: getRiskColor(rugPullRisk) }}>
                            {Math.round(rugPullRisk * 100)}%
                        </div>
                        <div className={styles.riskLevel} style={{
                            backgroundColor: getRiskColor(rugPullRisk)
                        }}>
                            {rugPullRisk >= 0.8 ? "CRITICAL" :
                                rugPullRisk >= 0.6 ? "HIGH" :
                                    rugPullRisk >= 0.4 ? "MEDIUM" : "LOW"}
                        </div>
                    </div>

                    {Object.entries(report.riskAssessment || {}).map(([risk, level]) => (
                        <div key={risk} className={styles.riskItem}>
                            <div className={styles.riskLabel}>{risk}</div>
                            <div className={styles.riskValue}>{level}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Render key insights
    const renderKeyInsights = () => {
        return (
            <div className={styles.insightsSection}>
                <div className={styles.insightsTitle}>KEY INSIGHTS</div>
                <div className={styles.insightsList}>
                    {report.keyInsights.map((insight, index) => (
                        <div key={index} className={styles.insightItem}>
                            <div className={styles.insightText}>{insight.insight}</div>
                            <div className={styles.insightConfidence}>
                                Confidence: {formatConfidence(insight.confidence)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.intelligenceReport}>
            {/* Header */}
            <div className={styles.reportHeader}>
                <div className={styles.reportTitle}>AMD INTELLIGENCE REPORT</div>
                <div className={styles.reportMetadata}>
                    <span>Model: {report.metadata?.routingDecision?.modelUsed || "AMD AI"}</span>
                    <span>Confidence: {formatConfidence(report.confidenceScore)}</span>
                    <span>Analysis Time: {new Date(report.metadata?.timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
            </div>

            {/* Summary */}
            <div className={styles.summarySection}>
                <div className={styles.executiveSummary}>
                    <div className={styles.summaryTitle}>EXECUTIVE SUMMARY</div>
                    <div className={styles.summaryText}>{report.executiveSummary}</div>
                </div>

                <div className={styles.recommendation} style={{
                    backgroundColor: getRecommendationColor(recommendation)
                }}>
                    <div className={styles.recommendationTitle}>RECOMMENDATION</div>
                    <div className={styles.recommendationText}>{recommendation}</div>
                </div>
            </div>

            {/* Main Metrics */}
            <div className={styles.metricsGrid}>
                {/* Attention Velocity */}
                <div className={styles.metricCard}>
                    {attentionVelocity && renderGauge(
                        attentionVelocity.attentionVelocity,
                        100,
                        "ATTENTION VELOCITY",
                        attentionVelocity.attentionVelocity >= 80 ? "#00C851" :
                            attentionVelocity.attentionVelocity >= 60 ? "#4CAF50" :
                                attentionVelocity.attentionVelocity >= 40 ? "#FFCC00" : "#9E9E9E"
                    )}
                    {attentionVelocity && renderEvidence(attentionVelocity.evidence, "Evidence")}
                </div>

                {/* Conviction Score */}
                <div className={styles.metricCard}>
                    {convictionScore && renderGauge(
                        convictionScore.convictionScore,
                        100,
                        "CONVICTION SCORE",
                        convictionScore.convictionScore >= 80 ? "#00C851" :
                            convictionScore.convictionScore >= 60 ? "#4CAF50" :
                                convictionScore.convictionScore >= 40 ? "#FFCC00" : "#9E9E9E"
                    )}
                    {convictionScore && (
                        <div className={styles.convictionBreakdown}>
                            <div className={styles.convictionItem}>
                                <div className={styles.convictionLabel}>Smart Money</div>
                                <div className={styles.convictionValue}>{convictionScore.smartMoneyConviction}</div>
                            </div>
                            <div className={styles.convictionItem}>
                                <div className={styles.convictionLabel}>Retail</div>
                                <div className={styles.convictionValue}>{convictionScore.retailConviction}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Signal Consensus */}
            <div className={styles.fullWidthSection}>
                {renderSignalConsensus()}
            </div>

            {/* Risk Assessment */}
            <div className={styles.fullWidthSection}>
                {renderRiskAssessment()}
            </div>

            {/* Key Insights */}
            <div className={styles.fullWidthSection}>
                {renderKeyInsights()}
            </div>

            {/* Metadata */}
            <div className={styles.metadataSection}>
                <div className={styles.metadataTitle}>ANALYSIS DETAILS</div>
                <div className={styles.metadataGrid}>
                    <div className={styles.metadataItem}>
                        <div className={styles.metadataLabel}>Token</div>
                        <div className={styles.metadataValue}>{report.metadata?.token}</div>
                    </div>
                    <div className={styles.metadataItem}>
                        <div className={styles.metadataLabel}>Data Sources</div>
                        <div className={styles.metadataValue}>{report.metadata?.dataSources?.join(", ")}</div>
                    </div>
                    <div className={styles.metadataItem}>
                        <div className={styles.metadataLabel}>Features Used</div>
                        <div className={styles.metadataValue}>{report.metadata?.featuresUsed?.join(", ")}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntelligenceReportView;