/**
 * Flow Intelligence Agent for Onyx Terminal
 * Detects realtime patterns from websocket data streams
 */

import { FlowAnalysis } from '../types/analysisTypes';
import { WebsocketService } from '../services/websocketService';

export class FlowIntelligenceAgent {
    private websocketService: WebsocketService;
    private patternDetectors: Map<string, (data: any) => PatternDetection>;
    private minConfidenceThreshold: number = 0.65;

    constructor() {
        this.websocketService = new WebsocketService();
        this.patternDetectors = new Map([
            ['buy_pressure', this.detectBuyPressure],
            ['sell_pressure', this.detectSellPressure],
            ['whale_entry', this.detectWhaleEntry],
            ['accumulation', this.detectAccumulation],
            ['distribution', this.detectDistribution],
            ['volume_spike', this.detectVolumeSpike]
        ]);
    }

    /**
     * Analyze token flow patterns from realtime data
     */
    async analyzeToken(tokenAddress: string, durationMinutes: number = 30): Promise<FlowAnalysis> {
        return new Promise((resolve) => {
            const analysis: FlowAnalysis = {
                token: tokenAddress,
                patterns: [],
                confidence: 0,
                evidence: []
            };

            // Subscribe to realtime data
            this.websocketService.subscribeToToken(tokenAddress, (data) => {
                this.processRealtimeData(data, analysis);
            });

            // Set timeout to resolve after duration
            setTimeout(() => {
                analysis.confidence = this.calculateOverallConfidence(analysis.patterns);
                resolve(analysis);
            }, durationMinutes * 60 * 1000);
        });
    }

    /**
     * Process incoming realtime data and detect patterns
     */
    private processRealtimeData(data: any, analysis: FlowAnalysis): void {
        this.patternDetectors.forEach((detector, patternName) => {
            const detection = detector(data);
            if (detection.confidence > this.minConfidenceThreshold) {
                analysis.patterns.push({
                    type: patternName,
                    strength: detection.confidence,
                    evidence: detection.evidence
                });
                analysis.evidence.push(...detection.evidence);
            }
        });

        // Update realtime data metrics
        if (!analysis.realtimeData) {
            analysis.realtimeData = {
                buyPressure: 0,
                sellPressure: 0,
                volumeGrowth: 0,
                whaleActivity: 0
            };
        }

        this.updateRealtimeMetrics(data, analysis.realtimeData);
    }

    /**
     * Update realtime metrics from websocket data
     */
    private updateRealtimeMetrics(data: any, metrics: NonNullable<FlowAnalysis['realtimeData']>): void {
        if (data.buyVolume) metrics.buyPressure = data.buyVolume;
        if (data.sellVolume) metrics.sellPressure = data.sellVolume;
        if (data.volumeGrowth) metrics.volumeGrowth = data.volumeGrowth;
        if (data.whaleActivity) metrics.whaleActivity = data.whaleActivity;
    }

    /**
     * Calculate overall confidence from detected patterns
     */
    private calculateOverallConfidence(patterns: FlowAnalysis['patterns']): number {
        if (patterns.length === 0) return 0;

        const totalConfidence = patterns.reduce((sum, pattern) => sum + pattern.strength, 0);
        return Math.min(1, totalConfidence / patterns.length);
    }

    // Pattern Detection Methods
    private detectBuyPressure(data: any): PatternDetection {
        const confidence = data.buyVolume > data.sellVolume * 1.5 ?
            Math.min(1, data.buyVolume / (data.sellVolume + 1)) * 0.8 : 0;

        return {
            confidence,
            evidence: confidence > 0 ?
                [`Buy pressure detected: ${data.buyVolume} > ${data.sellVolume}`] : []
        };
    }

    private detectSellPressure(data: any): PatternDetection {
        const confidence = data.sellVolume > data.buyVolume * 1.5 ?
            Math.min(1, data.sellVolume / (data.buyVolume + 1)) * 0.8 : 0;

        return {
            confidence,
            evidence: confidence > 0 ?
                [`Sell pressure detected: ${data.sellVolume} > ${data.buyVolume}`] : []
        };
    }

    private detectWhaleEntry(data: any): PatternDetection {
        const whaleThreshold = 100000; // $100K equivalent
        const confidence = data.largeTransactions > whaleThreshold ?
            Math.min(1, data.largeTransactions / whaleThreshold) * 0.9 : 0;

        return {
            confidence,
            evidence: confidence > 0 ?
                [`Whale entry detected: $${data.largeTransactions} transaction`] : []
        };
    }

    private detectAccumulation(data: any): PatternDetection {
        const buySellRatio = data.buyVolume / (data.sellVolume + 1);
        const confidence = buySellRatio > 2 && data.volumeGrowth > 0.3 ?
            Math.min(1, buySellRatio * 0.4 + data.volumeGrowth * 0.5) : 0;

        return {
            confidence,
            evidence: confidence > 0 ?
                [`Accumulation detected: buy/sell ratio ${buySellRatio.toFixed(2)}, volume growth ${data.volumeGrowth}`] : []
        };
    }

    private detectDistribution(data: any): PatternDetection {
        const sellBuyRatio = data.sellVolume / (data.buyVolume + 1);
        const confidence = sellBuyRatio > 2 && data.volumeGrowth > 0.3 ?
            Math.min(1, sellBuyRatio * 0.4 + data.volumeGrowth * 0.5) : 0;

        return {
            confidence,
            evidence: confidence > 0 ?
                [`Distribution detected: sell/buy ratio ${sellBuyRatio.toFixed(2)}, volume growth ${data.volumeGrowth}`] : []
        };
    }

    private detectVolumeSpike(data: any): PatternDetection {
        const confidence = data.volumeGrowth > 0.5 ?
            Math.min(1, data.volumeGrowth) * 0.7 : 0;

        return {
            confidence,
            evidence: confidence > 0 ?
                [`Volume spike detected: ${(data.volumeGrowth * 100).toFixed(1)}% growth`] : []
        };
    }
}

interface PatternDetection {
    confidence: number;
    evidence: string[];
}