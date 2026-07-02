/**
 * @file agentTypes.ts
 * @layer types
 * @desc Type definitions for AI agent configurations
 */

export interface AgentConfig {
    name: string;
    enabled: boolean;
    weight: number;
    modelId?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    cacheTTL: number;
    retries: number;
    fallbackAgents?: string[];
}

export interface AgentState {
    status: 'idle' | 'running' | 'completed' | 'failed' | 'timeout';
    progress: number;
    startedAt?: number;
    completedAt?: number;
    error?: string;
}

export interface AgentResult<T = unknown> {
    agentName: string;
    success: boolean;
    data?: T;
    error?: string;
    durationMs: number;
    timestamp: number;
}

export interface AgentCapability {
    name: string;
    description: string;
    inputTypes: string[];
    outputTypes: string[];
    requiredApiKeys: string[];
}