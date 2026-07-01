/**
 * Multi-RPC Service with Fallback Strategy for Onyx Terminal
 * Handles blockchain RPC requests with automatic fallback
 */

export class MultiRPCService {
    private rpcEndpoints: string[];
    private currentIndex: number;
    private rateLimits: Map<string, { remaining: number, reset: number }>;
    private requestTimeout: number = 5000; // 5 seconds

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
        // Build endpoint list from env vars, then append public fallbacks
        const envEndpoints = [
            this.getEnv('VITE_HELIUS_RPC'),
            this.getEnv('VITE_ANKR_RPC'),
            this.getEnv('VITE_PUBLIC_RPC'),
            this.getEnv('VITE_QUICKNODE_RPC')
        ].filter(Boolean);

        // Public Solana RPC endpoints (no API key required, rate-limited)
        const publicEndpoints = [
            'https://api.mainnet-beta.solana.com',
            'https://rpc.ankr.com/solana'
        ];

        // Deduplicate: env vars take priority, public endpoints as fallback
        this.rpcEndpoints = [...new Set([...envEndpoints, ...publicEndpoints])];

        // If env vars provided endpoints with keys, also include public as last resort
        if (envEndpoints.length > 0) {
            for (const ep of publicEndpoints) {
                if (!this.rpcEndpoints.includes(ep)) {
                    this.rpcEndpoints.push(ep);
                }
            }
        }

        this.currentIndex = 0;
        this.rateLimits = new Map();
    }

    /**
     * Get token account info via valid Solana RPC method `getAccountInfo`
     */
    async getAccountInfo(accountAddress: string): Promise<any> {
        const method = 'getAccountInfo';
        const params = [accountAddress, { encoding: 'jsonParsed' }];

        return this.executeWithFallback(method, params);
    }

    /**
     * Get SPL Token account info
     */
    async getSPLTokenInfo(tokenAddress: string): Promise<any> {
        return this.getAccountInfo(tokenAddress);
    }

    /**
     * Get recent token transactions via getSignaturesForAddress
     */
    async getSignaturesForAddress(address: string, limit: number = 10): Promise<any> {
        const method = 'getSignaturesForAddress';
        const params = [address, { limit }];

        return this.executeWithFallback(method, params);
    }

    /**
     * Legacy wrapper - uses getAccountInfo under the hood
     * @deprecated Use getAccountInfo instead
     */
    async getTokenMetadata(tokenAddress: string): Promise<any> {
        return this.getAccountInfo(tokenAddress);
    }

    /**
     * Get token transfers with fallback
     */
    async getTokenTransfers(tokenAddress: string, limit: number = 1000): Promise<any> {
        const method = 'getTokenTransfers';
        const params = [tokenAddress, { limit }];

        return this.executeWithFallback(method, params);
    }

    /**
     * Get token holders with fallback
     */
    async getTokenHolders(tokenAddress: string, limit: number = 1000): Promise<any> {
        const method = 'getTokenHolders';
        const params = [tokenAddress, { limit }];

        return this.executeWithFallback(method, params);
    }

    /**
     * Execute RPC request with fallback strategy
     */
    private async executeWithFallback(method: string, params: any[]): Promise<any> {
        for (let i = 0; i < this.rpcEndpoints.length; i++) {
            const endpoint = this.rpcEndpoints[this.currentIndex];
            try {
                const response = await this.queryRPC(endpoint, method, params);

                // Update rate limit info
                this.updateRateLimits(endpoint, response.headers);
                return response.result;
            } catch (error) {
                console.warn(`RPC ${endpoint} failed for ${method}, switching to next endpoint:`, error);
                this.currentIndex = (this.currentIndex + 1) % this.rpcEndpoints.length;
            }
        }
        throw new Error(`All RPC endpoints failed for method ${method}`);
    }

    /**
     * Query specific RPC endpoint
     */
    private async queryRPC(endpoint: string, method: string, params: any[]): Promise<any> {
        // Check rate limits
        const rateLimit = this.rateLimits.get(endpoint);
        if (rateLimit && rateLimit.remaining <= 0) {
            const now = Date.now();
            if (now < rateLimit.reset) {
                throw new Error(`Rate limit exceeded for ${endpoint}`);
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method,
                params
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`RPC error: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(`RPC method error: ${result.error.message}`);
        }

        return {
            result: result.result,
            headers: {
                'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
                'x-ratelimit-reset': response.headers.get('x-ratelimit-reset')
            }
        };
    }

    /**
     * Update rate limit information
     */
    private updateRateLimits(endpoint: string, headers: any): void {
        const remaining = headers['x-ratelimit-remaining'] ?
            parseInt(headers['x-ratelimit-remaining']) : 100;
        const reset = headers['x-ratelimit-reset'] ?
            parseInt(headers['x-ratelimit-reset']) * 1000 : Date.now() + 60000;

        this.rateLimits.set(endpoint, {
            remaining,
            reset
        });
    }

    /**
     * Add custom RPC endpoint
     */
    addEndpoint(endpoint: string): void {
        if (!this.rpcEndpoints.includes(endpoint)) {
            this.rpcEndpoints.push(endpoint);
        }
    }

    /**
     * Get current RPC endpoint
     */
    getCurrentEndpoint(): string {
        return this.rpcEndpoints[this.currentIndex];
    }
}