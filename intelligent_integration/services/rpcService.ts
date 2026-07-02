/**
 * @file rpcService.ts
 * @layer service
 * @desc Multi-RPC service for Solana blockchain interactions
 */

import { Connection, PublicKey, AccountInfo, ParsedAccountData } from '@solana/web3.js';
import { getEnv } from '../utils/getEnv';

export interface RpcResponse<T> {
    value: T | null;
    error?: string;
}

export class MultiRPCService {
    private connections: Connection[];
    private currentIndex: number = 0;

    constructor() {
        const endpoints = [
            getEnv('VITE_SOLANA_RPC_ENDPOINT', 'https://api.mainnet-beta.solana.com'),
            getEnv('VITE_SOLANA_RPC_ENDPOINT_FALLBACK', 'https://solana-api.projectserum.com'),
        ];
        this.connections = endpoints.filter(Boolean).map(url => new Connection(url, 'confirmed'));
    }

    private getNextConnection(): Connection {
        this.currentIndex = (this.currentIndex + 1) % this.connections.length;
        return this.connections[this.currentIndex];
    }

    async getAccountInfo(address: string): Promise<RpcResponse<{ data?: ParsedAccountData }>> {
        try {
            const pubkey = new PublicKey(address);
            const connection = this.getNextConnection();
            const info = await connection.getParsedAccountInfo(pubkey);
            return { value: info as any };
        } catch (error) {
            return { value: null, error: (error as Error).message };
        }
    }
}