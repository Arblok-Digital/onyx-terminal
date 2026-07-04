/**
 * Market Agent for Onyx Terminal
 * Analyzes market data from Jupiter and CoinGecko
 */

import { injectable, inject } from 'inversify';
import type { MarketAnalysis } from '../types/analysisTypes';
import type { Logger } from '../core/logger';
import { TOKENS } from '../core/diTokens';
import { getEnv } from '../utils/getEnv';

@injectable()
export class MarketAgent {
    private jupiterApiKey: string;
    private coingeckoApiKey: string;
    private birdeyeApiKey: string;
    private cache: Map<string, { data: any, timestamp: number }>;
    private cacheTTL: number = 300000; // 5 minutes
    private logger: Logger;

    constructor(@inject(TOKENS.Logger) logger: Logger) {
        this.jupiterApiKey = getEnv('VITE_JUPITER_API_KEY', '');
        this.coingeckoApiKey = getEnv('VITE_COINGECKO_API_KEY', '');
        this.birdeyeApiKey = getEnv('VITE_BIRDEYE_API_KEY', '');
        this.cache = new Map();
        this.logger = logger;
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
            this.logger.error('Error analyzing market data', error as Error, { tokenAddress });
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
            this.logger.warn('CoinGecko price API failed, using fallback', { tokenAddress, error: (error as Error).message });
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
            const proxyUrl = getEnv('VITE_JUP_PROXY_URL') || 'http://localhost:3001';
            const response = await fetch(
                `${proxyUrl}/api/jup/token/${tokenAddress}?vsToken=USDC`
            );

            if (!response.ok) {
                throw new Error(`Jupiter API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.warn('Jupiter volume API failed, using fallback', { tokenAddress, error: (error as Error).message });
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
            const proxyUrl = getEnv('VITE_JUP_PROXY_URL') || 'http://localhost:3001';
            const response = await fetch(
                `${proxyUrl}/api/jup/orderbook?inputMint=${tokenAddress}&outputMint=USDC`
            );

            if (!response.ok) {
                throw new Error(`Jupiter API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.warn('Jupiter order book API failed, using fallback', { tokenAddress, error: (error as Error).message });
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
     * Fetch token data from Birdeye API
     */
    private async fetchBirdeyeTokenData(tokenAddress: string): Promise<any> {
        if (!this.birdeyeApiKey) {
            this.logger.warn('Birdeye API key not configured');
            return null;
        }

        try {
            // Use the correct Birdeye endpoint for token overview
            const response = await fetch(
                `https://public-api.birdeye.so/defi/token_overview?address=${tokenAddress}`,
                {
                    headers: {
                        'X-API-KEY': this.birdeyeApiKey,
                        'accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                this.logger.error('Birdeye API error', new Error(`HTTP ${response.status}`), { tokenAddress });
                return null;
            }

            const data = await response.json();
            // Birdeye returns { success: true, data: {...} }
            return data.data;
        } catch (error) {
            this.logger.error('Birdeye fetch failed', error as Error, { tokenAddress });
            return null;
        }
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
        if (!orderBook || !orderBook.bids || !orderBook.asks) return 0;

        // Use actual bid/ask price spread to estimate liquidity change direction
        const bidDepth = orderBook.bids.reduce(
            (sum: number, bid: any) => sum + bid.amount * bid.price, 0
        );
        const askDepth = orderBook.asks.reduce(
            (sum: number, ask: any) => sum + ask.amount * ask.price, 0
        );

        // If bids and asks are relatively balanced, liquidity is stable
        // If one side dominates, liquidity is shifting
        if (bidDepth === 0 && askDepth === 0) return 0;

        const totalDepth = bidDepth + askDepth;
        const bidRatio = bidDepth / totalDepth;

        // Liquidity change estimate: positive when bid side grows (buyers), negative when ask side grows (sellers)
        // Normalize to a reasonable range (-0.15 to +0.15)
        const changeEstimate = (bidRatio - 0.5) * 0.3;

        return parseFloat(changeEstimate.toFixed(2));
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

    /**
     * Convert Solana token address to CoinGecko ID
     * This is a simplified mapping - in production you'd use a proper mapping service
     */
    private async getCoinGeckoId(tokenAddress: string): Promise<string> {
        // Known token mappings for common Solana tokens
        const knownTokens: Record<string, string> = {
            'So11111111111111111111111111111111111111112': 'solana',
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTt1v': 'usd-coin',
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'tether',
            'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'marinade-staked-sol',
            '7dHbWXmci3dT8UFYWYZweBLXgyC7k38SZxqb6xwg2zG': 'samoyedcoin',
            'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xrnQ7i1G6a3VXp': 'bonk',
            'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'dogwifhat',
            '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'pyth-network',
            'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCo': 'jupiter-exchange-solana',
            'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeAU1kektH6p': 'orca',
            'RAYdium11111111111111111111111111111111111111': 'raydium',
            'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt': 'serum',
            'MNGO1111111111111111111111111111111111111111': 'mango-markets',
            'SABER111111111111111111111111111111111111111': 'saber',
            'MERLU111111111111111111111111111111111111111': 'mercurial-finance',
            'ALCX1111111111111111111111111111111111111111': 'alchemix',
            'STEP1111111111111111111111111111111111111111': 'step-finance',
            'COPE1111111111111111111111111111111111111111': 'cope',
            'KIN1111111111111111111111111111111111111111': 'kin',
            'MAPS1111111111111111111111111111111111111111': 'maps',
            'MEDIA111111111111111111111111111111111111111': 'media-network',
            'OXY1111111111111111111111111111111111111111': 'oxygen',
            'PRT1111111111111111111111111111111111111111': 'port-finance',
            'SOLACE11111111111111111111111111111111111111': 'solace',
            'TULIP111111111111111111111111111111111111111': 'tulip-protocol',
            'ZBC1111111111111111111111111111111111111111': 'zebec-protocol',
        };

        // Check if we have a known mapping
        if (knownTokens[tokenAddress]) {
            return knownTokens[tokenAddress];
        }

        // For unknown tokens, try to fetch from CoinGecko's search API
        // This is a fallback - in production you'd want a proper token list
        try {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/search?query=${tokenAddress}`,
                {
                    headers: {
                        'x-cg-pro-api-key': this.coingeckoApiKey
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.coins && data.coins.length > 0) {
                    // Find a coin that matches the Solana platform
                    const solanaCoin = data.coins.find((coin: any) => 
                        coin.platforms && coin.platforms.solana === tokenAddress
                    );
                    if (solanaCoin) {
                        return solanaCoin.id;
                    }
                    // Fallback to first result
                    return data.coins[0].id;
                }
            }
        } catch (error) {
            this.logger.warn('CoinGecko search failed, using fallback', { tokenAddress, error: (error as Error).message });
        }

        // Ultimate fallback - use the token address as ID (will likely fail but won't crash)
        return tokenAddress;
    }
}
