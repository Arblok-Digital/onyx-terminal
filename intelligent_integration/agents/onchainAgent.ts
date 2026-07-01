/**
 * Onchain Agent for Onyx Terminal
 * Analyzes blockchain data from Helius and Birdeye
 */

import { OnchainAnalysis } from '../types/analysisTypes';
import { MultiRPCService } from '../services/rpcService';

export class OnchainAgent {
    private rpcService: MultiRPCService;
    private heliusApiKey: string;
    private birdeyeApiKey: string;

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
        this.rpcService = new MultiRPCService();
        this.heliusApiKey = this.getEnv('VITE_HELIUS_API_KEY');
        this.birdeyeApiKey = this.getEnv('VITE_BIRDEYE_API_KEY');
    }

    /**
     * Analyze onchain data for a specific token
     */
    async analyzeToken(tokenAddress: string): Promise<OnchainAnalysis> {
        try {
            const [transfers, holders, liquidity, contractInfo] = await Promise.all([
                this.getTokenTransfers(tokenAddress),
                this.getTokenHolders(tokenAddress),
                this.getTokenLiquidity(tokenAddress),
                this.getContractInfo(tokenAddress)
            ]);

            return this.createOnchainAnalysis(tokenAddress, transfers, holders, liquidity, contractInfo);
        } catch (error) {
            console.error('Error analyzing token:', error);
            return this.createFallbackAnalysis(tokenAddress);
        }
    }

    /**
     * Get token transfers from Helius
     */
    private async getTokenTransfers(tokenAddress: string): Promise<any> {
        console.warn('Helius token transfers API is currently disabled. Returning empty data.');
        return { transfers: [], totalSupply: 0 };
    }

    /**
     * Get token holders from Helius
     */
    private async getTokenHolders(tokenAddress: string): Promise<any> {
        console.warn('Helius token holders API is currently disabled. Returning empty data.');
        return { holders: [], totalSupply: 0 };
    }

    /**
     * Get token liquidity from Birdeye
     */
    private async getTokenLiquidity(tokenAddress: string): Promise<any> {
        if (!this.birdeyeApiKey) {
            console.warn('Birdeye API key not provided. Skipping Birdeye liquidity data.');
            return { liquidity: 0, liquidityChange24h: 0 }; // Default / empty data
        }

        try {
            const response = await fetch(`https://public-api.birdeye.so/public/tokenlist?sort_by=v24hUSD&sort_type=desc`, {
                headers: {
                    'X-API-KEY': this.birdeyeApiKey
                }
            });

            if (!response.ok) {
                console.error(`Birdeye API error: ${response.statusText}`);
                return { liquidity: 0, liquidityChange24h: 0 };
            }

            const data = await response.json();
            const tokenData = data.data.tokens.find((token: any) => token.address === tokenAddress);
            if (!tokenData) {
                console.warn(`Birdeye API: Token data not found for ${tokenAddress}`);
                return { liquidity: 0, liquidityChange24h: 0 };
            }
            return tokenData;
        } catch (error) {
            console.error(`Birdeye token liquidity API failed: ${(error as Error).message}`);
            return { liquidity: 0, liquidityChange24h: 0 }; // Default / empty data on error
        }
    }

    /**
     * Get contract information from RPC via getAccountInfo
     */
    private async getContractInfo(tokenAddress: string): Promise<any> {
        try {
            const rpcResponse = await this.rpcService.getAccountInfo(tokenAddress);
            if (!rpcResponse || !rpcResponse.value) {
                console.warn(`RPC Service: No account info found for ${tokenAddress}`);
                return this.createDefaultContractInfo();
            }
            const accountData = rpcResponse.value.data?.parsed?.info || {};
            return {
                age: 0,
                creator: accountData.owner || 'Unknown',
                mintAuthority: accountData.mintAuthority !== null,
                freezeAuthority: accountData.freezeAuthority !== null,
                isVerified: false,
                renounced: !accountData.mintAuthority,
                creationTimestamp: undefined
            };
        } catch (error) {
            console.warn(`RPC getAccountInfo failed for ${tokenAddress}, using defaults:`, (error as Error).message);
            return this.createDefaultContractInfo();
        }
    }

    /**
     * Default contract info when RPC is unavailable
     */
    private createDefaultContractInfo(): any {
        return {
            age: 0,
            creator: 'Unknown',
            mintAuthority: false,
            freezeAuthority: false,
            isVerified: false,
            renounced: false,
            creationTimestamp: undefined
        };
    }

    /**
     * Create onchain analysis from collected data
     */
    private createOnchainAnalysis(
        tokenAddress: string,
        transfers: any,
        holders: any,
        liquidity: any,
        contractInfo: any
    ): OnchainAnalysis {
        // Calculate whale activity
        const whaleWallets = this.calculateWhaleWallets(holders);
        const largeTransfers = this.calculateLargeTransfers(transfers);
        const concentration = this.calculateHolderConcentration(holders);

        // Calculate holder growth
        const newHolders = this.calculateNewHolders(holders);
        const growthRate = this.calculateGrowthRate(holders);

        // Calculate developer activity
        const devActivity = this.calculateDeveloperActivity(transfers, holders);

        // Calculate liquidity analysis
        const liquidityAnalysis = this.calculateLiquidityAnalysis(liquidity);

        // Calculate rug pull indicators
        const rugPullIndicators = this.calculateRugPullIndicators(
            transfers,
            liquidity,
            devActivity
        );

        // Calculate risk score
        const riskScore = this.calculateRiskScore(
            whaleWallets,
            concentration,
            contractInfo,
            rugPullIndicators
        );

        return {
            token: tokenAddress,
            whaleActivity: {
                largeTransfers,
                whaleWallets,
                concentration
            },
            holderGrowth: {
                newHolders,
                growthRate
            },
            developerActivity: {
                devWalletTransactions: devActivity.devWalletTransactions,
                suspiciousTransfers: devActivity.suspiciousTransfers,
                devWalletBalance: devActivity.devWalletBalance,
                devWallets: devActivity.devWallets
            },
            liquidityAnalysis: {
                liquidityDepth: liquidityAnalysis.liquidityDepth,
                liquidityChange24h: liquidityAnalysis.liquidityChange24h,
                lockedLiquidity: liquidityAnalysis.lockedLiquidity,
                liquidityConcentration: liquidityAnalysis.liquidityConcentration
            },
            rugPullIndicators: {
                dumpScore: rugPullIndicators.dumpScore,
                liquidityRemovalScore: rugPullIndicators.liquidityRemovalScore,
                devWalletActivityScore: rugPullIndicators.devWalletActivityScore,
                overallRugScore: rugPullIndicators.overallRugScore
            },
            riskScore,
            contractAnalysis: {
                age: contractInfo.age || 0,
                creator: contractInfo.creator || 'Unknown',
                mintAuthority: contractInfo.mintAuthority || false,
                freezeAuthority: contractInfo.freezeAuthority || false,
                isVerified: contractInfo.isVerified || false,
                renounced: contractInfo.renounced || false,
                creationTimestamp: contractInfo.creationTimestamp
            }
        };
    }

    /**
     * Create fallback analysis when API fails
     */
    private createFallbackAnalysis(tokenAddress: string): OnchainAnalysis {
        return {
            token: tokenAddress,
            whaleActivity: {
                largeTransfers: 0,
                whaleWallets: 0,
                concentration: 0
            },
            holderGrowth: {
                newHolders: 0,
                growthRate: 0
            },
            developerActivity: {
                devWalletTransactions: 0,
                suspiciousTransfers: 0,
                devWalletBalance: 0,
                devWallets: []
            },
            liquidityAnalysis: {
                liquidityDepth: 0,
                liquidityChange24h: 0,
                lockedLiquidity: 0,
                liquidityConcentration: 0
            },
            rugPullIndicators: {
                dumpScore: 0,
                liquidityRemovalScore: 0,
                devWalletActivityScore: 0,
                overallRugScore: 0
            },
            riskScore: 0.5, // Medium risk
            contractAnalysis: {
                age: 0,
                creator: 'Unknown',
                mintAuthority: false,
                freezeAuthority: false,
                isVerified: false,
                renounced: false
            }
        };
    }

    // Analysis Helper Methods
    private calculateWhaleWallets(holders: any): number {
        if (!holders || !holders.holders) return 0;

        const totalSupply = holders.totalSupply || 1;
        const whaleThreshold = totalSupply * 0.01; // 1% of supply

        return holders.holders.filter((holder: any) =>
            holder.amount >= whaleThreshold
        ).length;
    }

    private calculateLargeTransfers(transfers: any): number {
        if (!transfers || !transfers.transfers) return 0;

        const totalSupply = transfers.totalSupply || 1;
        const largeTransferThreshold = totalSupply * 0.005; // 0.5% of supply

        return transfers.transfers.filter((transfer: any) =>
            transfer.amount >= largeTransferThreshold
        ).length;
    }

    private calculateHolderConcentration(holders: any): number {
        if (!holders || !holders.holders || holders.holders.length === 0) return 0;

        const topHolders = holders.holders.slice(0, 10);
        const totalSupply = holders.totalSupply || 1;

        const topHolderPercentage = topHolders.reduce(
            (sum: number, holder: any) => sum + holder.amount, 0
        ) / totalSupply;

        return parseFloat(topHolderPercentage.toFixed(2));
    }

    private calculateNewHolders(holders: any): number {
        if (!holders || !holders.holders) return 0;

        // Simple heuristic: holders with small amounts are likely new
        const totalSupply = holders.totalSupply || 1;
        const smallHolderThreshold = totalSupply * 0.0001; // 0.01% of supply

        return holders.holders.filter((holder: any) =>
            holder.amount <= smallHolderThreshold
        ).length;
    }

    private calculateGrowthRate(holders: any): number {
        if (!holders || !holders.holders) return 0;

        // Simple growth rate calculation
        const currentHolders = holders.holders.length;
        const previousHolders = Math.max(1, currentHolders * 0.8); // Assume 20% growth

        return parseFloat(((currentHolders - previousHolders) / previousHolders).toFixed(2));
    }

    private calculateRiskScore(
        whaleWallets: number,
        concentration: number,
        contractInfo: any,
        rugPullIndicators?: {
            dumpScore: number;
            liquidityRemovalScore: number;
            devWalletActivityScore: number;
            overallRugScore: number;
        }
    ): number {
        let riskScore = 0.5; // Base risk

        // Whale risk
        if (whaleWallets > 5) riskScore += 0.2;
        if (concentration > 0.5) riskScore += 0.3; // Top holders control >50%

        // Contract risk
        if (contractInfo.mintAuthority) riskScore += 0.2;
        if (contractInfo.freezeAuthority) riskScore += 0.2;
        if (!contractInfo.creator || contractInfo.creator === 'Unknown') riskScore += 0.1;
        if (!contractInfo.isVerified) riskScore += 0.2;
        if (!contractInfo.renounced) riskScore += 0.1;

        // Rug pull risk
        if (rugPullIndicators) {
            if (rugPullIndicators.overallRugScore > 0.7) riskScore += 0.3;
            else if (rugPullIndicators.overallRugScore > 0.5) riskScore += 0.2;
            else if (rugPullIndicators.overallRugScore > 0.3) riskScore += 0.1;
        }

        return Math.min(1, parseFloat(riskScore.toFixed(2)));
    }

    /**
     * Calculate developer activity from transfers and holders
     */
    private calculateDeveloperActivity(transfers: any, holders: any): {
        devWalletTransactions: number;
        suspiciousTransfers: number;
        devWalletBalance: number;
        devWallets: string[];
    } {
        // Mock implementation - in production this would use real developer wallet detection
        // For now, we'll simulate finding 1-2 developer wallets with suspicious activity

        const devWallets = ['0xdevWallet1...', '0xdevWallet2...'];
        const devWalletTransactions = 15 + Math.floor(Math.random() * 10);
        const suspiciousTransfers = 3 + Math.floor(Math.random() * 5);
        const devWalletBalance = 100000 + Math.floor(Math.random() * 50000);

        return {
            devWalletTransactions,
            suspiciousTransfers,
            devWalletBalance,
            devWallets
        };
    }

    /**
     * Calculate liquidity analysis
     */
    private calculateLiquidityAnalysis(liquidity: any): {
        liquidityDepth: number;
        liquidityChange24h: number;
        lockedLiquidity: number;
        liquidityConcentration: number;
    } {
        // Mock implementation - in production this would use real liquidity data
        const liquidityDepth = liquidity.liquidity || 1000000;
        const liquidityChange24h = (Math.random() * 0.2 - 0.1); // -10% to +10%
        const lockedLiquidity = liquidityDepth * (0.7 + Math.random() * 0.3); // 70-100% locked
        const liquidityConcentration = 0.6 + Math.random() * 0.4; // 60-100% concentration

        return {
            liquidityDepth,
            liquidityChange24h: parseFloat(liquidityChange24h.toFixed(2)),
            lockedLiquidity: parseFloat(lockedLiquidity.toFixed(2)),
            liquidityConcentration: parseFloat(liquidityConcentration.toFixed(2))
        };
    }

    /**
     * Calculate rug pull indicators
     */
    private calculateRugPullIndicators(
        transfers: any,
        liquidity: any,
        devActivity: any
    ): {
        dumpScore: number;
        liquidityRemovalScore: number;
        devWalletActivityScore: number;
        overallRugScore: number;
    } {
        // Calculate dump score based on large transfers
        const largeTransfers = this.calculateLargeTransfers(transfers);
        const dumpScore = Math.min(1, largeTransfers / 20);

        // Calculate liquidity removal score
        const liquidityDepth = liquidity.liquidity || 1000000;
        const liquidityRemovalScore = Math.min(1, (1000000 - liquidityDepth) / 1000000);

        // Calculate dev wallet activity score
        const devWalletActivityScore = Math.min(1, devActivity.suspiciousTransfers / 10);

        // Overall rug score (weighted average)
        const overallRugScore = (
            dumpScore * 0.4 +
            liquidityRemovalScore * 0.3 +
            devWalletActivityScore * 0.3
        );

        return {
            dumpScore: parseFloat(dumpScore.toFixed(2)),
            liquidityRemovalScore: parseFloat(liquidityRemovalScore.toFixed(2)),
            devWalletActivityScore: parseFloat(devWalletActivityScore.toFixed(2)),
            overallRugScore: parseFloat(overallRugScore.toFixed(2))
        };
    }
}