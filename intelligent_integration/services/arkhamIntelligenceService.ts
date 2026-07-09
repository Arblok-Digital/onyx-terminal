/**
 * @file arkhamIntelligenceService.ts
 * @layer services
 * @desc Arkham Intelligence integration for on-chain data via WebSocket + REST API.
 *       Provides real-time and historical intelligence on addresses, tokens, and entities.
 *
 * Arkham API docs: https://docs.arkhamintelligence.com/
 * Base URL: https://api.arkhamintelligence.com/
 * WS: wss://api.arkhamintelligence.com/ws
 *
 * @usage
 *   const arkham = new ArkhamIntelligenceService('your-api-key');
 *   await arkham.connect();
 *   arkham.watchAddress('BC8TgEZzHjHKMjWh5TdXysE4Pt42Cix1JfVppHsZ9T9V', (data) => {
 *       console.log('Arkham alert:', data);
 *   });
 *   const entity = await arkham.getEntity('BC8TgEZzHjHKMjWh5TdXysE4Pt42Cix1JfVppHsZ9T9V');
 *
 * @exposes ArkhamIntelligenceService, ArkhamAddressInfo, ArkhamAlert, ArkhamEntity
 */

import { createLogger } from '../core/logger';

const log = createLogger();

// ── Types ──

export interface ArkhamAddressInfo {
    address: string;
    entity?: string;
    labels: string[];
    totalValue: number;
    tokenBalances: ArkhamTokenBalance[];
    firstSeen: string;
    lastActivity: string;
    riskScore: number;
    tags: string[];
}

export interface ArkhamTokenBalance {
    token: string;
    symbol: string;
    amount: number;
    valueUsd: number;
    change24h: number;
}

export interface ArkhamAlert {
    id: string;
    type: 'large_transfer' | 'whale_movement' | 'entity_activity' | 'token_concentration' | 'suspicious_flow';
    address: string;
    entity?: string;
    token?: string;
    amount: number;
    valueUsd: number;
    txHash: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    metadata: Record<string, unknown>;
}

export interface ArkhamEntity {
    id: string;
    name: string;
    type: 'exchange' | 'defi' | 'whale' | 'mev' | 'bridge' | 'exploit' | 'unknown';
    addresses: string[];
    totalValue: number;
    riskProfile: 'safe' | 'caution' | 'risky' | 'malicious';
    tags: string[];
}

export interface ArkhamWhaleAlert {
    address: string;
    entity: string;
    token: string;
    amount: number;
    valueUsd: number;
    txHash: string;
    type: 'buy' | 'sell' | 'transfer';
}

interface WSMessage {
    type: string;
    data: unknown;
    error?: string;
}

// ── Constants ──

const ARKHAM_CONFIG = {
    REST_BASE: 'https://api.arkhamintelligence.com/v1',
    WS_URL: 'wss://api.arkhamintelligence.com/ws',
    RECONNECT_DELAY: 2000,
    MAX_RECONNECT: 10,
    TIMEOUT_MS: 15000,
    MAX_RETRIES: 3,
};

const WS_SUBSCRIBE_FEEDS = {
    WHALE_ALERTS: 'whale_alerts',
    ADDRESS_WATCH: 'address_watch',
    ENTITY_MONITOR: 'entity_monitor',
    LARGE_TRANSFERS: 'large_transfers',
    TOKEN_FLOWS: 'token_flows',
} as const;

// ── Service ──

export class ArkhamIntelligenceService {
    private apiKey: string;
    private ws: WebSocket | null = null;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private shouldReconnect: boolean = true;
    private subscriptions: Map<string, Set<(data: unknown) => void>> = new Map();
    private wsMessageQueue: string[] = [];

    // Cache
    private addressCache: Map<string, { data: ArkhamAddressInfo; timestamp: number }> = new Map();
    private entityCache: Map<string, { data: ArkhamEntity; timestamp: number }> = new Map();
    private CACHE_TTL = 60_000; // 1 minute

    constructor(apiKey?: string) {
        this.apiKey = apiKey ?? this.getApiKey();
    }

    // ── Public API ──

    /**
     * Connect WebSocket for real-time Arkham intelligence feeds.
     */
    async connect(): Promise<void> {
        if (this.isConnected) return;
        if (!this.apiKey) {
            log.warn('Arkham API key not configured — WS disabled');
            return;
        }

        return new Promise((resolve) => {
            try {
                log.info('Connecting to Arkham Intelligence WebSocket...');
                this.ws = new WebSocket(ARKHAM_CONFIG.WS_URL);

                this.ws.onopen = () => {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    log.info('✅ Arkham WebSocket connected');

                    // Authenticate
                    this.sendWS({ type: 'auth', apiKey: this.apiKey });

                    // Flush queued subscriptions
                    for (const msg of this.wsMessageQueue) {
                        this.ws?.send(msg);
                    }
                    this.wsMessageQueue = [];

                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const msg: WSMessage = JSON.parse(event.data);
                        this.handleWSMessage(msg);
                    } catch (err) {
                        log.error('Failed to parse WS message:', err instanceof Error ? err : new Error(String(err)));
                    }
                };

                this.ws.onclose = () => {
                    this.isConnected = false;
                    log.warn('Arkham WS disconnected');
                    if (this.shouldReconnect) {
                        this.scheduleReconnect();
                    }
                };

                this.ws.onerror = (err) => {
                    log.error('Arkham WS error:', err instanceof Error ? err : new Error('WebSocket error'));
                    resolve(); // still resolve because we handle reconnect
                };

                // Timeout guard
                setTimeout(() => {
                    if (!this.isConnected) resolve();
                }, ARKHAM_CONFIG.TIMEOUT_MS);
            } catch (err) {
                log.error('Arkham WS connect error:', err instanceof Error ? err : new Error(String(err)));
                resolve();
            }
        });
    }

    /**
     * Watch a blockchain address for real-time Arkham intelligence alerts.
     */
    watchAddress(address: string, callback: (data: ArkhamAlert) => void): () => void {
        this.addSubscription(`address:${address}`, callback as (data: unknown) => void);
        this.sendOrQueue({
            type: 'subscribe',
            feed: WS_SUBSCRIBE_FEEDS.ADDRESS_WATCH,
            address,
        });
        log.info('Watching address via Arkham', { address });
        return () => this.removeSubscription(`address:${address}`, callback as (data: unknown) => void);
    }

    /**
     * Watch for whale alerts across all monitored addresses.
     */
    watchWhaleAlerts(callback: (data: ArkhamWhaleAlert) => void): () => void {
        this.addSubscription('whale_alerts', callback as (data: unknown) => void);
        this.sendOrQueue({
            type: 'subscribe',
            feed: WS_SUBSCRIBE_FEEDS.WHALE_ALERTS,
        });
        log.info('Subscribed to Arkham whale alerts');
        return () => this.removeSubscription('whale_alerts', callback as (data: unknown) => void);
    }

    /**
     * Watch large transfers over a threshold.
     */
    watchLargeTransfers(thresholdUsd: number, callback: (data: ArkhamAlert) => void): () => void {
        const key = `large_transfers:${thresholdUsd}`;
        this.addSubscription(key, callback as (data: unknown) => void);
        this.sendOrQueue({
            type: 'subscribe',
            feed: WS_SUBSCRIBE_FEEDS.LARGE_TRANSFERS,
            threshold: thresholdUsd,
        });
        log.info('Subscribed to large transfers', { thresholdUsd });
        return () => this.removeSubscription(key, callback as (data: unknown) => void);
    }

    /**
     * Monitor an entity (exchange, whale, protocol) for all address activity.
     */
    watchEntity(entityId: string, callback: (data: ArkhamAlert) => void): () => void {
        const key = `entity:${entityId}`;
        this.addSubscription(key, callback as (data: unknown) => void);
        this.sendOrQueue({
            type: 'subscribe',
            feed: WS_SUBSCRIBE_FEEDS.ENTITY_MONITOR,
            entityId,
        });
        log.info('Monitoring entity via Arkham', { entityId });
        return () => this.removeSubscription(key, callback as (data: unknown) => void);
    }

    /**
     * Watch token flow between addresses.
     */
    watchTokenFlow(tokenAddress: string, callback: (data: ArkhamAlert) => void): () => void {
        const key = `token_flow:${tokenAddress}`;
        this.addSubscription(key, callback as (data: unknown) => void);
        this.sendOrQueue({
            type: 'subscribe',
            feed: WS_SUBSCRIBE_FEEDS.TOKEN_FLOWS,
            token: tokenAddress,
        });
        log.info('Watching token flow via Arkham', { tokenAddress });
        return () => this.removeSubscription(key, callback as (data: unknown) => void);
    }

    // ── REST API Methods ──

    /**
     * Get intelligence on a blockchain address (entity, labels, balances).
     */
    async getAddressInfo(address: string): Promise<ArkhamAddressInfo | null> {
        // Check cache
        const cached = this.addressCache.get(address);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        try {
            const data = await this.restRequest<ArkhamAddressInfo>(`/address/${address}`);
            this.addressCache.set(address, { data, timestamp: Date.now() });
            return data;
        } catch (err) {
            log.error('Arkham getAddressInfo error:', err instanceof Error ? err : new Error(String(err)));
            return null;
        }
    }

    /**
     * Get entity details (exchange, whale, protocol) with all associated addresses.
     */
    async getEntity(addressOrEntityId: string): Promise<ArkhamEntity | null> {
        const cacheKey = `entity:${addressOrEntityId}`;
        const cached = this.entityCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        try {
            const data = await this.restRequest<ArkhamEntity>(`/entity/${addressOrEntityId}`);
            this.entityCache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        } catch (err) {
            log.error('Arkham getEntity error:', err instanceof Error ? err : new Error(String(err)));
            return null;
        }
    }

    /**
     * Get currently active whale alerts.
     */
    async getWhaleAlerts(minValueUsd?: number): Promise<ArkhamWhaleAlert[]> {
        try {
            const params = minValueUsd ? `?minValue=${minValueUsd}` : '';
            return await this.restRequest<ArkhamWhaleAlert[]>(`/whale-alerts${params}`);
        } catch (err) {
            log.error('Arkham getWhaleAlerts error:', err instanceof Error ? err : new Error(String(err)));
            return [];
        }
    }

    /**
     * Get token flow analysis for a token address.
     */
    async getTokenFlow(tokenAddress: string): Promise<{
        inflows: { address: string; amount: number; valueUsd: number }[];
        outflows: { address: string; amount: number; valueUsd: number }[];
        concentration: number;
        topHolders: { address: string; percentage: number }[];
    } | null> {
        try {
            return await this.restRequest(`/token/${tokenAddress}/flows`);
        } catch (err) {
            log.error('Arkham getTokenFlow error:', err instanceof Error ? err : new Error(String(err)));
            return null;
        }
    }

    /**
     * Disconnect and clean up.
     */
    disconnect(): void {
        this.shouldReconnect = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.subscriptions.clear();
        this.wsMessageQueue = [];
        log.info('Arkham disconnected');
    }

    // ── Internal WebSocket ──

    private handleWSMessage(msg: WSMessage): void {
        switch (msg.type) {
            case 'auth_ok':
                log.info('✅ Arkham authenticated');
                break;

            case 'alert':
            case 'whale_alert':
            case 'large_transfer':
            case 'token_flow':
                this.dispatchToSubscribers(msg.type, msg.data);
                break;

            case 'error':
                log.error('Arkham WS error from server:', new Error(String(msg.error || msg.data)));
                break;

            default:
                log.debug('Arkham WS message', { type: msg.type });
        }
    }

    private sendWS(data: Record<string, unknown>): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    private sendOrQueue(data: Record<string, unknown>): void {
        const msg = JSON.stringify(data);
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(msg);
        } else {
            this.wsMessageQueue.push(msg);
        }
    }

    private addSubscription(key: string, callback: (data: unknown) => void): void {
        if (!this.subscriptions.has(key)) {
            this.subscriptions.set(key, new Set());
        }
        this.subscriptions.get(key)!.add(callback);
    }

    private removeSubscription(key: string, callback: (data: unknown) => void): void {
        const subs = this.subscriptions.get(key);
        if (subs) {
            subs.delete(callback);
            if (subs.size === 0) {
                this.subscriptions.delete(key);
            }
        }
    }

    private dispatchToSubscribers(type: string, data: unknown): void {
        // Dispatch to feed-level subscribers
        const feedSubs = this.subscriptions.get(type);
        if (feedSubs) {
            for (const cb of feedSubs) {
                try { cb(data); } catch { /* consumer error */ }
            }
        }

        // Dispatch to address-specific subscribers if data has address
        const alert = data as Record<string, unknown>;
        if (alert?.address) {
            const addrSubs = this.subscriptions.get(`address:${alert.address}`);
            if (addrSubs) {
                for (const cb of addrSubs) {
                    try { cb(data); } catch { /* consumer error */ }
                }
            }
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= ARKHAM_CONFIG.MAX_RECONNECT) {
            log.error('Max Arkham reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = ARKHAM_CONFIG.RECONNECT_DELAY * Math.pow(1.5, this.reconnectAttempts - 1);
        log.info('Arkham reconnecting...', { attempt: this.reconnectAttempts, delay });

        setTimeout(() => {
            if (this.shouldReconnect) {
                this.connect();
            }
        }, delay);
    }

    // ── REST Helpers ──

    private async restRequest<T>(path: string): Promise<T> {
        const url = `${ARKHAM_CONFIG.REST_BASE}${path}`;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= ARKHAM_CONFIG.MAX_RETRIES; attempt++) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'API-Key': this.apiKey,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json() as T;
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < ARKHAM_CONFIG.MAX_RETRIES) {
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                }
            }
        }

        throw lastError ?? new Error('Arkham REST request failed');
    }

    // ── Env helpers ──

    private getApiKey(): string {
        // Try Vite env first, then process.env
        try {
            const globalAny = globalThis as Record<string, unknown>;
            const meta = (globalAny as { import?: { meta?: Record<string, string> } }).import?.meta;
            if (meta?.VITE_ARKHAM_API_KEY) return meta.VITE_ARKHAM_API_KEY;
        } catch { /* ignore */ }

        try {
            const g = globalThis as unknown as { process?: { env?: Record<string, string> } };
            if (g.process?.env?.VITE_ARKHAM_API_KEY) return g.process.env.VITE_ARKHAM_API_KEY;
        } catch { /* ignore */ }

        return '';
    }
}

/**
 * Pre-configured singleton instance.
 */
export const arkhamService = new ArkhamIntelligenceService();