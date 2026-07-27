/**
 * @file api.ts
 * @layer core
 * @desc Centralized API service with rate limiting and retry logic for Onyx Terminal.
 */

import { rpcRateLimiter } from '../utils/rpcRateLimiter';

export interface RequestOptions extends RequestInit {
    retries?: number;
}

export async function secureFetch(url: string, options: RequestOptions = {}): Promise<any> {
    try {
        const response = await rpcRateLimiter.fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`[SecureFetch] Error fetching ${url}:`, error);
        throw error;
    }
}
