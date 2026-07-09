/**
 * Websocket Service for Onyx Terminal
 * Handles realtime data streaming from Jupiter and other sources
 *
 * DISABLED: Jupiter WS endpoint returns 403 ("Not found or no index") in browser.
 * Helius WS also fails with ERR_NAME_NOT_RESOLVED (requires Node.js DNS).
 * Kept for reference; will reconnect with proxy if needed.
 */
// NOTE: Inversify decorator dihapus — manual DI aja
// (@injectable / @inject dari diTokens yang udah dihapus)
import type { Logger } from '../core/logger';

const DEFAULT_WS_ENDPOINTS = {
    jupiter: 'wss://stream.jup.ag/v1/ws',
    helius: 'wss://atlas-mainnet.helius-rpc.com?api-key=48b8eca6-c678-4730-b694-d851629e858e',
};

const WS_RECONNECT_DELAYS = {
    initial: 1000,
    max: 10000,
    factor: 1.5,
};

export class WebsocketService {
    private socket: WebSocket | null = null;
    private eventHandlers: Map<string, (data: any) => void>;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 0; // DISABLED
    private reconnectDelay: number = WS_RECONNECT_DELAYS.initial;
    private isDisabled: boolean = true;
    private pendingSubscriptions: Set<string> = new Set();
    private logger: Logger;

    constructor(
        logger: Logger,
        private endpoint: string = DEFAULT_WS_ENDPOINTS.jupiter
    ) {
        this.logger = logger;
        this.eventHandlers = new Map();
        this.logger.info(`🔌 WebSocket DISABLED (${endpoint}) — requires proxy/node setup to re-enable`);
    }

    /**
     * Enable WebSocket connection (opt-in)
     */
    enable(endpoint?: string): void {
        this.isDisabled = false;
        this.maxReconnectAttempts = 5;
        if (endpoint) this.endpoint = endpoint;
        this.reconnectAttempts = 0;
        this.logger.info(`🔌 WebSocket enabled for ${this.endpoint}`);
        this.connect();
    }

    private connect(): void {
        if (this.isDisabled || !this.endpoint) return;

        try {
            this.socket = new WebSocket(this.endpoint);

            this.socket.onopen = () => {
                this.reconnectAttempts = 0;
                this.logger.info(`✅ WebSocket connected to ${this.endpoint}`);
                this.pendingSubscriptions.forEach(token => {
                    this.subscribeToToken(token, () => { });
                });
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleIncomingData(data);
                } catch (error) {
                    this.logger.error('Error parsing websocket message:', error as Error);
                }
            };

            this.socket.onclose = () => {
                this.logger.info('🔌 WebSocket closed');
                this.scheduleReconnect();
            };

            this.socket.onerror = (error) => {
                this.logger.warn('⚠️ WebSocket error (expected without proxy):', error as any);
            };
        } catch (err) {
            this.logger.warn('⚠️ WebSocket connect failed:', err as any);
        }
    }

    private scheduleReconnect(): void {
        if (this.isDisabled) return;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(
                this.reconnectDelay * Math.pow(WS_RECONNECT_DELAYS.factor, this.reconnectAttempts),
                WS_RECONNECT_DELAYS.max,
            );
            this.logger.info(`🔄 Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
        } else {
            this.logger.warn('❌ Max reconnection attempts reached — WebSocket disabled');
            this.isDisabled = true;
        }
    }

    private handleIncomingData(data: any): void {
        if (data.token && this.eventHandlers.has(data.token)) {
            const handler = this.eventHandlers.get(data.token);
            if (handler) handler(data);
        }
    }

    subscribeToToken(tokenAddress: string, callback: (data: any) => void): void {
        this.eventHandlers.set(tokenAddress, callback);
        this.pendingSubscriptions.add(tokenAddress);

        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                action: 'subscribe',
                token: tokenAddress,
                channels: ['trades', 'orders', 'ticker']
            }));
        }
    }

    unsubscribeFromToken(tokenAddress: string): void {
        this.eventHandlers.delete(tokenAddress);
        this.pendingSubscriptions.delete(tokenAddress);

        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                action: 'unsubscribe',
                token: tokenAddress
            }));
        }
    }

    close(): void {
        this.isDisabled = true;
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.eventHandlers.clear();
        this.pendingSubscriptions.clear();
    }
}