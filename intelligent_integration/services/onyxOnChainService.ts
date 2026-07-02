/**
 * @file onyxOnChainService.ts
 * @layer services
 * @desc Bridges on-chain data (Helius RPC) for intelligent integration agents.
 *       Simplified wrapper around Connection for agent consumption.
 */

import { Connection, PublicKey, AccountInfo, ParsedAccountData } from '@solana/web3.js';

export interface TokenAccountInfo {
    mint: string;
    owner: string;
    amount: number;
    decimals: number;
    uiAmount: number;
}

export interface TokenHolderInfo {
    address: string;
    amount: number;
    percentage: number;
}

export class OnyxOnChainService {
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    /**
     * Fetch token account info for a given mint address
     */
    async getTokenAccounts(mintAddress: string): Promise<TokenAccountInfo[]> {
        try {
            const mintPubkey = new PublicKey(mintAddress);
            const accounts = await this.connection.getTokenLargestAccounts(mintPubkey);
            return accounts.value.map((acc) => ({
                mint: mintAddress,
                owner: acc.address.toBase58(),
                amount: Number(acc.amount),
                decimals: 0,
                uiAmount: Number(acc.amount) / 10 ** 0,
            }));
        } catch (error) {
            console.error('[OnyxOnChainService] getTokenAccounts error:', error);
            return [];
        }
    }

    /**
     * Fetch top token holders
     */
    async getTopHolders(mintAddress: string, limit: number = 20): Promise<TokenHolderInfo[]> {
        try {
            const mintPubkey = new PublicKey(mintAddress);
            const accounts = await this.connection.getTokenLargestAccounts(mintPubkey);
            const totalSupply = accounts.value.reduce((sum, acc) => sum + Number(acc.amount), 0);
            return accounts.value.slice(0, limit).map((acc) => ({
                address: acc.address.toBase58(),
                amount: Number(acc.amount),
                percentage: totalSupply > 0 ? Number(acc.amount) / totalSupply : 0,
            }));
        } catch (error) {
            console.error('[OnyxOnChainService] getTopHolders error:', error);
            return [];
        }
    }

    /**
     * Get account info for a token mint (for contract analysis)
     */
    async getAccountInfo(address: string): Promise<{ owner: string; data: any } | null> {
        try {
            const pubkey = new PublicKey(address);
            const accountInfo = await this.connection.getParsedAccountInfo(pubkey);
            if (!accountInfo.value) return null;
            return {
                owner: accountInfo.value.owner.toBase58(),
                data: (accountInfo.value.data as ParsedAccountData)?.parsed || null,
            };
        } catch (error) {
            console.error('[OnyxOnChainService] getAccountInfo error:', error);
            return null;
        }
    }

    /**
     * Get recent signatures for an address (for transaction analysis)
     */
    async getRecentSignatures(address: string, limit: number = 10): Promise<string[]> {
        try {
            const pubkey = new PublicKey(address);
            const sigs = await this.connection.getSignaturesForAddress(pubkey, { limit });
            return sigs.map((s) => s.signature);
        } catch (error) {
            console.error('[OnyxOnChainService] getRecentSignatures error:', error);
            return [];
        }
    }

    /**
     * Get block time from a recent slot
     */
    async getBlockTime(): Promise<number | null> {
        try {
            const slot = await this.connection.getSlot();
            return await this.connection.getBlockTime(slot);
        } catch (error) {
            console.error('[OnyxOnChainService] getBlockTime error:', error);
            return null;
        }
    }
}