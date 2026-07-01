/**
 * @file dashboardDataService.test.ts
 * @description Tests for DashboardDataService integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDashboardContext, DashboardData, formatDashboardContext } from '../dashboardDataService';

// Mock dependencies
vi.mock('@/core/store/price.store', () => ({
    usePriceStore: {
        getState: () => ({
            tokens: {
                "0x123": {
                    address: "0x123",
                    chain: "solana" as const,
                    symbol: "TEST",
                    name: "Test Token",
                    priceUsd: 1.23456789,
                    priceChange5m: 0.05,
                    priceChange1h: -0.02,
                    priceChange6h: 0.15,
                    priceChange24h: 0.45,
                    volume5m: 12345,
                    volume1h: 123456,
                    volume6h: 987654,
                    volume24h: 5432109,
                    txns5m: { buys: 50, sells: 30 },
                    txns1h: { buys: 200, sells: 150 },
                    txns6h: { buys: 800, sells: 600 },
                    txns24h: { buys: 3000, sells: 2000 },
                    liquidity: 500000,
                    marketCap: 10000000,
                    fdv: 15000000,
                    pairCreatedAt: Date.now() - 86400000 * 3, // 3 days old
                    updatedAt: Date.now(),
                },
            },
        }),
    },
}));

vi.mock('@intelligent_integration', () => ({
    analyzeToken: vi.fn(async (address: string) => {
        if (address === "0xerror") {
            throw new Error("Simulated AI analysis error");
        }
        return {
            recommendation: "BUY",
            confidenceScore: 0.85,
            executiveSummary: "Strong bullish momentum detected",
            rugPullIndicators: {
                warningLevel: "LOW",
                overallRugScore: 0.15,
                dumpScore: 0.1,
                liquidityRemovalScore: 0.05,
                devWalletActivityScore: 0.2,
            },
            smartMoneyAnalysis: {
                verdict: "Accumulation Phase",
            },
            narrativeAnalysis: {
                token: address,
                narrative: "AI Infrastructure",
                confidence: 0.8,
                evidence: ["Rising interest in AI projects"],
                narrativeStrength: 75,
            },
            opportunityAssessment: {
                score: 0.75,
            },
            keyInsights: [
                { category: "Momentum", insight: "Volume increasing", confidence: 0.8 },
                { category: "Risk", insight: "Low rug risk", confidence: 0.9 },
                { category: "Social", insight: "Growing community", confidence: 0.75 },
            ],
        };
    }),
}));

describe('DashboardDataService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getDashboardContext', () => {
        it('should return formatted dashboard context for token', async () => {
            const context = await getDashboardContext("0x123");

            expect(context).toContain("DATA DASHBOARD ONYX untuk TEST");
            expect(context).toContain("--- MARKET OVERVIEW ---");
            expect(context).toContain("--- PRICE MOVEMENTS ---");
            expect(context).toContain("--- VOLUME ANALYSIS ---");
            expect(context).toContain("--- TRANSACTION ANALYSIS ---");
expect(context).toContain("--- INTELLIGENCE REPORT ---");
        });

        it('should handle unknown tokens gracefully', async () => {
            const context = await getDashboardContext("0xunknown");

            expect(context).toContain("UNKNOWN");
            expect(context).toContain("Unknown Token");
        });

        it('should include all timeframes in price movements', async () => {
            const context = await getDashboardContext("0x123");

            expect(context).toContain("5 minutes");
            expect(context).toContain("1 hour");
            expect(context).toContain("6 hours");
            expect(context).toContain("24 hours");
        });

        it('should include transaction counts', async () => {
            const context = await getDashboardContext("0x123");

            expect(context).toContain("Buys 24h: 3000");
            expect(context).toContain("Sells 24h: 2000");
            expect(context).toContain("Buy Pressure");
        });

        it('should include intelligence report data', async () => {
            const context = await getDashboardContext("0x123");

            expect(context).toContain("Recommendation: BUY");
            expect(context).toContain("Confidence Score: 85%");
            expect(context).toContain("Executive Summary");
            expect(context).toContain("Rug Pull Warning Level");
            expect(context).toContain("Key Insights");
        });

        it('should handle AI analysis errors gracefully', async () => {
            const context = await getDashboardContext("0xerror");

            expect(context).toContain("--- INTELLIGENCE REPORT ---");
            expect(context).toContain("Error: Simulated AI analysis error");
            expect(context).toContain("Recommendation: N/A");
            expect(context).toContain("Confidence Score: 0%");
            expect(context).not.toContain("Strong bullish momentum detected");
        });
    });

    describe('formatDashboardContext', () => {
        const mockData: DashboardData = {
            tokenAddress: "0x123",
            symbol: "TEST",
            name: "Test Token",
            chain: "solana",
            marketData: {
                priceUsd: 1.23,
                priceChange24h: 0.15,
                volume24h: 1000000,
                liquidity: 500000,
                marketCap: 10000000,
                fdv: 15000000,
                txns24h: { buys: 3000, sells: 2000 },
                pairCreatedAt: Date.now() - 86400000 * 3,
            },
            priceMovements: {
                change5m: 0.05,
                change1h: -0.02,
                change6h: 0.15,
                change24h: 0.45,
            },
            volumeAnalysis: {
                volume5m: 12345,
                volume1h: 123456,
                volume6h: 987654,
                volume24h: 5432109,
            },
            txnAnalysis: {
                txns5m: { buys: 50, sells: 30 },
                txns1h: { buys: 200, sells: 150 },
                txns6h: { buys: 800, sells: 600 },
                txns24h: { buys: 3000, sells: 2000 },
                buyPressure: "high (bullish)",
            },
            intelligence: {
                recommendation: "BUY",
                confidenceScore: 0.85,
                executiveSummary: "Strong bullish momentum",
                rugPullWarning: "LOW",
                smartMoneyActivity: "Accumulation",
                narrativeStrength: "75",
                opportunityScore: 0.75,
                keyInsights: ["Strong momentum", "Low risk"],
            },
            updatedAt: Date.now(),
            dataAvailability: {
                hasMarketData: true,
                hasIntelligence: true,
                hasPriceHistory: true,
            },
        };

        it('should format basic token info', () => {
            const formatted = formatDashboardContext(mockData);

            expect(formatted).toContain("TEST");
            expect(formatted).toContain("Test Token");
            expect(formatted).toContain("SOLANA");
        });

        it('should format market data correctly', () => {
            const formatted = formatDashboardContext(mockData);

            expect(formatted).toContain("$1.23000000");
            expect(formatted).toContain("+15.00%");
            expect(formatted).toContain("$1.00M");
            expect(formatted).toContain("$500.00K");
        });

        it('should format percentage changes', () => {
            const formatted = formatDashboardContext(mockData);

            expect(formatted).toContain("+5.00%");
            expect(formatted).toContain("-2.00%");
            expect(formatted).toContain("+15.00%");
            expect(formatted).toContain("+45.00%");
        });

        it('should include buy pressure analysis', () => {
            const formatted = formatDashboardContext(mockData);

            expect(formatted).toContain("Buy Pressure: high (bullish)");
        });

        it('should be well-structured with sections', () => {
            const formatted = formatDashboardContext(mockData);

            expect(formatted).toContain("--- MARKET OVERVIEW ---");
            expect(formatted).toContain("--- PRICE MOVEMENTS ---");
            expect(formatted).toContain("--- VOLUME ANALYSIS ---");
            expect(formatted).toContain("--- TRANSACTION ANALYSIS ---");
            expect(formatted).toContain("--- INTELLIGENCE REPORT ---");
            expect(formatted).toContain("=== END OF DASHBOARD DATA ===");
        });
    });
});