/**
 * @file dashboardDataService.ts
 * @layer service
 * @desc Aggregates real-time dashboard data from multiple sources for AI chatbot context.
 *       Combines DexScreener market data, price store snapshots, and AMD Intelligence reports.
 * @exposes DashboardDataService, getDashboardContext
 */

import { usePriceStore, TokenSnapshot } from "@/core/store/price.store";
import { analyzeToken, IntelligenceReport } from "@amd_integration";

/**
 * Aggregated dashboard data for AI context
 */
export interface DashboardData {
    // Token basic info
    tokenAddress: string;
    symbol: string;
    name: string;
    chain: string;

    // Market data from DexScreener
    marketData: {
        priceUsd?: number;
        priceChange24h?: number;
        volume24h?: number;
        liquidity?: number;
        marketCap?: number;
        fdv?: number;
        txns24h?: {
            buys?: number;
            sells?: number;
        };
        pairCreatedAt?: number;
    };

    // Real-time price movements
    priceMovements: {
        change5m?: number;
        change1h?: number;
        change6h?: number;
        change24h?: number;
    };

    // Volume analysis
    volumeAnalysis: {
        volume5m?: number;
        volume1h?: number;
        volume6h?: number;
        volume24h?: number;
    };

    // Transaction analysis
    txnAnalysis: {
        txns5m?: { buys?: number; sells?: number };
        txns1h?: { buys?: number; sells?: number };
        txns6h?: { buys?: number; sells?: number };
        txns24h?: { buys?: number; sells?: number };
        buyPressure?: string; // "high" | "medium" | "low"
    };

    // AMD Intelligence Report (if available)
    intelligence?: {
        recommendation?: string;
        confidenceScore?: number;
        executiveSummary?: string;
        rugPullWarning?: string;
        smartMoneyActivity?: string;
        narrativeStrength?: string;
        opportunityScore?: number;
        keyInsights?: string[];
    };
    intelligenceError?: string; // New field for AI analysis errors

    // Metadata
    updatedAt: number;
    dataAvailability: {
        hasMarketData: boolean;
        hasIntelligence: boolean;
        hasPriceHistory: boolean;
    };
}

/**
 * Calculate buy pressure from transaction data
 */
function calculateBuyPressure(txns?: { buys?: number; sells?: number }): string {
    if (!txns || !txns.buys || !txns.sells) return "unknown";
    const total = txns.buys + txns.sells;
    if (total === 0) return "no activity";
    const buyRatio = txns.buys / total;
    if (buyRatio > 0.65) return "high (bullish)";
    if (buyRatio > 0.45) return "balanced";
    return "low (bearish)";
}

/**
 * Format percentage for display
 */
function formatPercent(value?: number): string {
    if (value === undefined || value === null || isNaN(value)) return "N/A";
    const pct = (value * 100).toFixed(2);
    return value >= 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * Format large numbers (volume, market cap, etc.)
 */
function formatLargeNumber(value?: number): string {
    if (value === undefined || value === null || isNaN(value)) return "N/A";
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
}

/**
 * Get real-time dashboard data for a token
 */
export async function getDashboardData(tokenAddress: string): Promise<DashboardData> {
    const priceStore = usePriceStore.getState();
    const snapshot = priceStore.tokens[tokenAddress.toLowerCase()];

    const data: DashboardData = {
        tokenAddress,
        symbol: snapshot?.symbol || "UNKNOWN",
        name: snapshot?.name || "Unknown Token",
        chain: snapshot?.chain || "solana",

        marketData: {
            priceUsd: snapshot?.priceUsd,
            priceChange24h: snapshot?.priceChange24h,
            volume24h: snapshot?.volume24h,
            liquidity: snapshot?.liquidity,
            marketCap: snapshot?.marketCap,
            fdv: snapshot?.fdv,
            txns24h: snapshot?.txns24h,
            pairCreatedAt: snapshot?.pairCreatedAt,
        },

        priceMovements: {
            change5m: snapshot?.priceChange5m,
            change1h: snapshot?.priceChange1h,
            change6h: snapshot?.priceChange6h,
            change24h: snapshot?.priceChange24h,
        },

        volumeAnalysis: {
            volume5m: snapshot?.volume5m,
            volume1h: snapshot?.volume1h,
            volume6h: snapshot?.volume6h,
            volume24h: snapshot?.volume24h,
        },

        txnAnalysis: {
            txns5m: snapshot?.txns5m,
            txns1h: snapshot?.txns1h,
            txns6h: snapshot?.txns6h,
            txns24h: snapshot?.txns24h,
            buyPressure: calculateBuyPressure(snapshot?.txns24h),
        },

        updatedAt: snapshot?.updatedAt || Date.now(),
        dataAvailability: {
            hasMarketData: !!snapshot,
            hasIntelligence: false,
            hasPriceHistory: !!(snapshot?.priceChange5m || snapshot?.priceChange1h),
        },
    };

    // Try to get AMD Intelligence Report
    try {
        const report = await analyzeToken(tokenAddress);
        data.intelligence = {
            recommendation: report.recommendation,
            confidenceScore: report.confidenceScore,
            executiveSummary: report.executiveSummary,
            rugPullWarning: report.rugPullIndicators?.warningLevel,
            smartMoneyActivity: report.smartMoneyAnalysis?.verdict,
            narrativeStrength: report.narrativeAnalysis?.strength,
            opportunityScore: report.opportunityAssessment?.score,
            keyInsights: report.keyInsights?.slice(0, 5).map((ki: any) =>
                `[${ki.category}] ${ki.insight} (${(ki.confidence * 100).toFixed(0)}%)`
            ),
        };
        data.dataAvailability.hasIntelligence = true;
    } catch (error: any) {
        console.warn("[DashboardData] Failed to fetch intelligence report:", error);
        data.intelligenceError = error.message || "Unknown AI analysis error";
    }

    return data;
}

/**
 * Format dashboard data as natural language context for AI
 */
export function formatDashboardContext(data: DashboardData): string {
    const lines: string[] = [];

    lines.push(`=== DATA DASHBOARD ONYX untuk ${data.symbol} ===`);
    lines.push(`Token: ${data.name} (${data.symbol})`);
    lines.push(`Address: ${data.tokenAddress}`);
    lines.push(`Chain: ${data.chain.toUpperCase()}`);
    lines.push(`Last Updated: ${new Date(data.updatedAt).toLocaleString("id-ID")}`);
    lines.push("");

    // Market Overview
    if (data.dataAvailability.hasMarketData) {
        lines.push("--- MARKET OVERVIEW ---");
        lines.push(`Price: ${data.marketData.priceUsd ? `$${data.marketData.priceUsd.toFixed(8)}` : "N/A"}`);
        lines.push(`24h Change: ${formatPercent(data.marketData.priceChange24h)}`);
        lines.push(`Volume 24h: ${formatLargeNumber(data.marketData.volume24h)}`);
        lines.push(`Liquidity: ${formatLargeNumber(data.marketData.liquidity)}`);
        lines.push(`Market Cap: ${formatLargeNumber(data.marketData.marketCap)}`);
        lines.push(`FDV: ${formatLargeNumber(data.marketData.fdv)}`);
        if (data.marketData.pairCreatedAt) {
            const age = Date.now() - data.marketData.pairCreatedAt;
            const days = Math.floor(age / (1000 * 60 * 60 * 24));
            lines.push(`Token Age: ${days} days old`);
        }
        lines.push("");
    }

    // Price Movements
    if (data.dataAvailability.hasPriceHistory) {
        lines.push("--- PRICE MOVEMENTS ---");
        lines.push(`5 minutes: ${formatPercent(data.priceMovements.change5m)}`);
        lines.push(`1 hour: ${formatPercent(data.priceMovements.change1h)}`);
        lines.push(`6 hours: ${formatPercent(data.priceMovements.change6h)}`);
        lines.push(`24 hours: ${formatPercent(data.priceMovements.change24h)}`);
        lines.push("");
    }

    // Volume Analysis
    lines.push("--- VOLUME ANALYSIS ---");
    lines.push(`Volume 5m: ${formatLargeNumber(data.volumeAnalysis.volume5m)}`);
    lines.push(`Volume 1h: ${formatLargeNumber(data.volumeAnalysis.volume1h)}`);
    lines.push(`Volume 6h: ${formatLargeNumber(data.volumeAnalysis.volume6h)}`);
    lines.push(`Volume 24h: ${formatLargeNumber(data.volumeAnalysis.volume24h)}`);
    lines.push("");

    // Transaction Analysis
    lines.push("--- TRANSACTION ANALYSIS ---");
    if (data.txnAnalysis.txns24h) {
        lines.push(`Buys 24h: ${data.txnAnalysis.txns24h.buys || 0}`);
        lines.push(`Sells 24h: ${data.txnAnalysis.txns24h.sells || 0}`);
    }
    lines.push(`Buy Pressure: ${data.txnAnalysis.buyPressure}`);
    lines.push("");

    // Intelligence Report
    if (data.intelligenceError) {
        lines.push("--- AMD INTELLIGENCE REPORT ---");
        lines.push(`Error: ${data.intelligenceError}`);
        lines.push(`Recommendation: N/A`); // Set to N/A if error
        lines.push(`Confidence Score: 0%`); // Set to 0% if error
        lines.push("");
    } else if (data.dataAvailability.hasIntelligence && data.intelligence) {
        lines.push("--- AMD INTELLIGENCE REPORT ---");
        lines.push(`Recommendation: ${data.intelligence.recommendation || "N/A"}`);
        lines.push(`Confidence Score: ${data.intelligence.confidenceScore ? (data.intelligence.confidenceScore * 100).toFixed(0) + "%" : "N/A"}`);

        if (data.intelligence.executiveSummary) {
            lines.push(`Executive Summary: ${data.intelligence.executiveSummary}`);
        }

        if (data.intelligence.rugPullWarning) {
            lines.push(`⚠️ Rug Pull Warning Level: ${data.intelligence.rugPullWarning}`);
        }

        if (data.intelligence.smartMoneyActivity) {
            lines.push(`Smart Money Activity: ${data.intelligence.smartMoneyActivity}`);
        }

        if (data.intelligence.narrativeStrength) {
            lines.push(`Narrative Strength: ${data.intelligence.narrativeStrength}`);
        }

        if (data.intelligence.opportunityScore) {
            lines.push(`Opportunity Score: ${(data.intelligence.opportunityScore * 100).toFixed(0)}%`);
        }

        if (data.intelligence.keyInsights && data.intelligence.keyInsights.length > 0) {
            lines.push("");
            lines.push("Key Insights:");
            data.intelligence.keyInsights.forEach(insight => {
                lines.push(`• ${insight}`);
            });
        }
        lines.push("");
    }

    lines.push("=== END OF DASHBOARD DATA ===");

    return lines.join("\n");
}

/**
 * Get formatted dashboard context ready for AI
 */
export async function getDashboardContext(tokenAddress: string): Promise<string> {
    try {
        const data = await getDashboardData(tokenAddress);
        return formatDashboardContext(data);
    } catch (error) {
        console.error("[DashboardContext] Failed to get dashboard context:", error);
        return `Error: Unable to fetch dashboard data for ${tokenAddress}`;
    }
}

/**
 * Singleton service for managing dashboard data subscriptions
 */
export class DashboardDataService {
    private static instance: DashboardDataService;
    private subscribers: Map<string, Set<(data: DashboardData) => void>> = new Map();

    private constructor() { }

    static getInstance(): DashboardDataService {
        if (!DashboardDataService.instance) {
            DashboardDataService.instance = new DashboardDataService();
        }
        return DashboardDataService.instance;
    }

    /**
     * Subscribe to real-time updates for a token
     */
    subscribe(tokenAddress: string, callback: (data: DashboardData) => void): () => void {
        const key = tokenAddress.toLowerCase();
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key)!.add(callback);

        // Return unsubscribe function
        return () => {
            const subs = this.subscribers.get(key);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    this.subscribers.delete(key);
                }
            }
        };
    }

    /**
     * Notify all subscribers of data updates
     */
    async notifySubscribers(tokenAddress: string): Promise<void> {
        const key = tokenAddress.toLowerCase();
        const subs = this.subscribers.get(key);
        if (!subs || subs.size === 0) return;

        try {
            const data = await getDashboardData(tokenAddress);
            subs.forEach(callback => callback(data));
        } catch (error) {
            console.error("[DashboardDataService] Failed to notify subscribers:", error);
        }
    }
}