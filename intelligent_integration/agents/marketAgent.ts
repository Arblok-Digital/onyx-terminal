/**
 * Market Agent for Onyx Terminal
 * Analyzes market data from Jupiter and CoinGecko
 */

import { MarketAnalysis } from '../types/analysisTypes';

export class MarketAgent {
    private jupiterApiKey: string;
    private coingeckoApiKey: string;
    private cache: Map<string, { data: any, timestamp: number }>;
    private cacheTTL: number = 300000; // 5 minutes

    /**
     * Get environment variable in a cross-environment way
     */
    private getEnv(key: string, defaultValue: string = ''): string {
        // Browser environment (Vite)
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            return import.meta.env[key] || defaultValue;
        }
        // Node.js environment
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key] || defaultValue;
        }
        return defaultValue;
    }

    constructor() {
        this.jupiterApiKey = this.getEnv('VITE_JUPITER_API_KEY');
        this.coingeckoApiKey = this.getEnv('VITE_COINGECKO_API_KEY');
        this.cache = new Map();
    }

    /**
     * Analyze market data for a specific token
     */
    async analyzeToken(tokenAddress: string): Promise<MarketAnalysis> {
        try {
            // Try to get cached data first
            const cachedData = this.getCachedData(tokenAddress);
            if (cachedData) {
                return this.createMarketAnalysis(tokenAddress, cachedData);
            }

            const [priceData, volumeData, orderBook, marketCap] = await Promise.all([
                this.getTokenPrice(tokenAddress),
                this.getTokenVolume(tokenAddress),
                this.getOrderBook(tokenAddress),
                this.getMarketCap(tokenAddress)
            ]);

            // Cache the data
            this.cacheData(tokenAddress, {
                priceData,
                volumeData,
                orderBook,
                marketCap
            });

            return this.createMarketAnalysis(tokenAddress, {
                priceData,
                volumeData,
                orderBook,
                marketCap
            });
        } catch (error) {
            console.error('Error analyzing market data:', error);
            return this.createFallbackAnalysis(tokenAddress);
        }
    }

    /**
     * Get token price from CoinGecko
     */
    private async getTokenPrice(tokenAddress: string): Promise<any> {
        try {
            // Convert Solana token address to CoinGecko ID
            const coingeckoId = await this.getCoinGeckoId(tokenAddress);

            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=1`,
                {
                    headers: {
                        'x-cg-pro-api-key': this.coingeckoApiKey
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.warn(`CoinGecko API failed, using fallback: ${(error as Error).message}`);
            // Return mock price data when API fails
            return {
                prices: [
                    [Date.now() - 86400000, 100], // 24h ago
                    [Date.now(), 100] // current
                ],
                market_caps: [],
                total_volumes: []
            };
        }
    }

    /**
     * Get token volume from Jupiter
     */
    private async getTokenVolume(tokenAddress: string): Promise<any> {
        try {
            // Use the Jup proxy endpoint
            const proxyUrl = this.getEnv('VITE_JUP_PROXY_URL') || 'http://localhost:3001';
            const response = await fetch(
                `${proxyUrl}/api/jup/token/${tokenAddress}?vsToken=USDC`
            );

            if (!response.ok) {
                throw new Error(`Jupiter API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.warn(`Jupiter volume API failed, using fallback: ${(error as Error).message}`);
            // Return mock volume data when API fails
            return {
                volume: 1000000,
                volumeChange: 0.05
            };
        }
    }

    /**
     * Get order book data from Jupiter
     */
    private async getOrderBook(tokenAddress: string): Promise<any> {
        try {
            // Use the Jup proxy endpoint
            const proxyUrl = this.getEnv('VITE_JUP_PROXY_URL') || 'http://localhost:3001';
            const response = await fetch(
                `${proxyUrl}/api/jup/orderbook?inputMint=${tokenAddress}&outputMint=USDC`
            );

            if (!response.ok) {
                throw new Error(`Jupiter API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.warn(`Jupiter order book API failed, using fallback: ${(error as Error).message}`);
            // Return mock order book data when API fails
            return {
                bids: [
                    { price: 99.99, amount: 1000 },
                    { price: 99.95, amount: 2000 }
                ],
                asks: [
                    { price: 100.01, amount: 1000 },
                    { price: 100.05, amount: 2000 }
                ]
            };
        }
    }

    /**
     * Get market cap from CoinGecko
     */
    private async getMarketCap(tokenAddress: string): Promise<number> {
        const coingeckoId = await this.getCoinGeckoId(tokenAddress);

        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coingeckoId}`,
            {
                headers: {
                    'x-cg-pro-api-key': this.coingeckoApiKey
                }
            }
        );

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.market_data?.market_cap?.usd || 0;
    }

    /**
     * Convert Solana token address to CoinGecko ID
     */
    private async getCoinGeckoId(tokenAddress: string): Promise<string> {
        // Simple mapping for well-known tokens
        const tokenMap: Record<string, string> = {
            'So11111111111111111111111111111111111111112': 'solana',
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin',
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'tether'
        };

        if (tokenMap[tokenAddress]) {
            return tokenMap[tokenAddress];
        }

        // For unknown tokens, try to get from CoinGecko
        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/solana/contract/${tokenAddress}`,
            {
                headers: {
                    'x-cg-pro-api-key': this.coingeckoApiKey
                }
            }
        );

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.id;
    }

    /**
     * Create market analysis from collected data
     */
    private createMarketAnalysis(
        tokenAddress: string,
        data: {
            priceData: any,
            volumeData: any,
            orderBook: any,
            marketCap: number
        }
    ): MarketAnalysis {
        const priceTrend = this.analyzePriceTrend(data.priceData);
        const volumeAnalysis = this.analyzeVolume(data.volumeData);
        const liquidityAnalysis = this.analyzeOrderBook(data.orderBook);
        const volatilityScore = this.calculateVolatility(data.priceData);

        // Add liquidity change to liquidity analysis
        const liquidityWithChange = {
            ...liquidityAnalysis,
            change24h: this.calculateLiquidityChange(data.orderBook)
        };

        return {
            token: tokenAddress,
            priceTrend,
            volumeAnalysis,
            liquidityAnalysis: liquidityWithChange,
            volatilityScore,
            marketCap: data.marketCap,
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
     * Create fallback analysis when API fails
     */
    private createFallbackAnalysis(tokenAddress: string): MarketAnalysis {
        return {
            token: tokenAddress,
            priceTrend: {
                current: 0,
                change24h: 0,
                change7d: 0
            },
            volumeAnalysis: {
                volume24h: 0,
                volumeChange: 0,
                suspiciousVolume: 0
            },
            liquidityAnalysis: {
                depth: 0,
                slippage: 0,
                change24h: 0
            },
            volatilityScore: 0.5, // Medium volatility
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

    // Analysis Helper Methods
    private analyzePriceTrend(priceData: any): {
        current: number,
        change24h: number,
        change7d: number
    } {
        if (!priceData || !priceData.prices) {
            return { current: 0, change24h: 0, change7d: 0 };
        }

        const prices = priceData.prices;
        const currentPrice = prices[prices.length - 1][1];
        const price24hAgo = prices[0][1];
        const price7dAgo = prices.length > 168 ? prices[prices.length - 168][1] : currentPrice;

        return {
            current: currentPrice,
            change24h: parseFloat(((currentPrice - price24hAgo) / price24hAgo).toFixed(4)),
            change7d: parseFloat(((currentPrice - price7dAgo) / price7dAgo).toFixed(4))
        };
    }

    private analyzeVolume(volumeData: any): {
        volume24h: number,
        volumeChange: number,
        suspiciousVolume?: number
    } {
        if (!volumeData || !volumeData.volume) {
            return { volume24h: 0, volumeChange: 0, suspiciousVolume: 0 };
        }

        // Calculate suspicious volume (mock implementation)
        const suspiciousVolume = this.calculateSuspiciousVolume(volumeData);

        return {
            volume24h: volumeData.volume,
            volumeChange: volumeData.volumeChange || 0,
            suspiciousVolume
        };
    }

    private analyzeOrderBook(orderBook: any): {
        depth: number,
        slippage: number
    } {
        if (!orderBook || !orderBook.bids || !orderBook.asks) {
            return { depth: 0, slippage: 0 };
        }

        // Calculate total liquidity depth
        const bidDepth = orderBook.bids.reduce(
            (sum: number, bid: any) => sum + bid.amount * bid.price, 0
        );
        const askDepth = orderBook.asks.reduce(
            (sum: number, ask: any) => sum + ask.amount * ask.price, 0
        );

        // Calculate slippage for 10% of market cap
        const totalDepth = bidDepth + askDepth;
        const slippage = totalDepth > 0 ? 0.1 / (totalDepth / 1000000) : 1; // 10% slippage as default

        return {
            depth: parseFloat(totalDepth.toFixed(2)),
            slippage: parseFloat(slippage.toFixed(4))
        };
    }

    private calculateVolatility(priceData: any): number {
        if (!priceData || !priceData.prices || priceData.prices.length < 2) {
            return 0.5;
        }

        const prices = priceData.prices.map((p: any) => p[1]);
        const mean = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
        const variance = prices.reduce(
            (sum: number, price: number) => sum + Math.pow(price - mean, 2), 0
        ) / prices.length;

        const stdDev = Math.sqrt(variance);
        const volatility = stdDev / mean;

        // Normalize to 0-1 scale
        return parseFloat(Math.min(1, volatility * 10).toFixed(2));
    }

    /**
     * Calculate suspicious volume patterns
     */
    private calculateSuspiciousVolume(volumeData: any): number {
        // Mock implementation - in production this would use real detection logic
        // For now, we'll simulate detecting suspicious volume patterns

        if (!volumeData || !volumeData.volume) return 0;

        // If volume is extremely high compared to average, flag as suspicious
        const volume = volumeData.volume;
        const avgVolume = volumeData.averageVolume || volume * 0.3;

        // Calculate suspicious score (0-1)
        let suspiciousScore = 0;

        // High volume spike
        if (volume > avgVolume * 5) suspiciousScore += 0.3;
        if (volume > avgVolume * 10) suspiciousScore += 0.4;

        // Unusual trading patterns
        if (volumeData.volumeChange > 2) suspiciousScore += 0.2;
        if (volumeData.volumeChange > 5) suspiciousScore += 0.3;

        return parseFloat(Math.min(1, suspiciousScore).toFixed(2));
    }

    /**
     * Calculate liquidity change over 24 hours
     */
    private calculateLiquidityChange(orderBook: any): number {
        // Mock implementation - in production this would use real historical data
        // For now, we'll simulate liquidity changes

        if (!orderBook || !orderBook.bids || !orderBook.asks) return 0;

        // Simulate liquidity change between -20% to +20%
        return parseFloat((Math.random() * 0.4 - 0.2).toFixed(2));
    }

    // Cache Management
    private getCachedData(tokenAddress: string): any | null {
        const cached = this.cache.get(tokenAddress);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        return null;
    }

    private cacheData(tokenAddress: string, data: any): void {
        this.cache.set(tokenAddress, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache for a specific token
     */
    clearCache(tokenAddress: string): void {
        this.cache.delete(tokenAddress);
    }

    /**
     * Clear all cached data
     */
    clearAllCache(): void {
        this.cache.clear();
    }
}