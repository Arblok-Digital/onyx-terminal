/**
 * @file nvidiaModels.ts
 * @layer models
 * @desc NVIDIA NIM model configurations for Nemotron inference.
 *       Uses OpenAI-compatible API format.
 *       - Primary:   nvidia/nemotron-3-ultra-550b-a55b (550B params, strong reasoning)
 *       - Fallback:  nvidia/nemotron-3-super-120b-a12b (120B params, fast inference)
 *
 * @exposes NVIDIA_MODELS, NVIDIA_TASK_CONFIG, getNvidiaModel, isNvidiaEnabled
 */
import { getEnv } from '../utils';

/** NVIDIA NIM API endpoint (OpenAI-compatible) */
export const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

/** NVIDIA NIM API headers */
export const NVIDIA_HEADERS = {
    'Content-Type': 'application/json',
};

/** Task types that map to specific model assignments */
export type NvidiaTask = 'report' | 'attention' | 'conviction' | 'general';

/**
 * Model definitions per task.
 * All tasks use Nemotron Ultra 550B as primary, Nemotron Super 120B as fallback.
 */
export const NVIDIA_TASK_CONFIG: Record<
    NvidiaTask,
    {
        primary: string;
        fallback: string;
        maxTokens: number;
        temperature: number;
        description: string;
    }
> = {
    /**
     * Report synthesis - uses Nemotron Ultra 550B for deep reasoning.
     * Nemotron Ultra 550B: 550B params, best for complex multi-source analysis.
     */
    report: {
        primary: 'nvidia/nemotron-3-ultra-550b-a55b',
        fallback: 'nvidia/nemotron-3-super-120b-a12b',
        maxTokens: 4000,
        temperature: 0.3,
        description: 'Multi-source intelligence report synthesis (Nemotron Ultra 550B)',
    },

    /**
     * Attention velocity scoring - uses Nemotron Ultra 550B.
     * 550B params for nuanced classification despite higher latency.
     */
    attention: {
        primary: 'nvidia/nemotron-3-ultra-550b-a55b',
        fallback: 'nvidia/nemotron-3-super-120b-a12b',
        maxTokens: 500,
        temperature: 0.3,
        description: 'Attention velocity scoring (Nemotron Ultra 550B)',
    },

    /**
     * Conviction score - uses Nemotron Ultra 550B for numeric precision.
     * 550B params ensure accurate scoring with strong math reasoning.
     */
    conviction: {
        primary: 'nvidia/nemotron-3-ultra-550b-a55b',
        fallback: 'nvidia/nemotron-3-super-120b-a12b',
        maxTokens: 500,
        temperature: 0.2,
        description: 'Conviction score analysis (Nemotron Ultra 550B)',
    },

    /**
     * General purpose - uses Nemotron Super 120B for speed.
     * 120B params, ~40 tok/s with speculative decoding — fastest option.
     */
    general: {
        primary: 'nvidia/nemotron-3-super-120b-a12b',
        fallback: 'nvidia/nemotron-3-ultra-550b-a55b',
        maxTokens: 2000,
        temperature: 0.3,
        description: 'General purpose AI task (Nemotron Super 120B)',
    },
};

/**
 * Flat list of NVIDIA models (for config registration in agentRouter).
 * Priority: after OpenRouter (4-7), before remaining fallbacks (9+).
 */
export const NVIDIA_MODELS = [
    {
        name: 'nvidia-nemotron-ultra-550b',
        model: 'nvidia/nemotron-3-ultra-550b-a55b',
        task: 'report' as NvidiaTask,
        priority: 8,
        enabled: true,
    },
    {
        name: 'nvidia-nemotron-super-120b',
        model: 'nvidia/nemotron-3-super-120b-a12b',
        task: 'general' as NvidiaTask,
        priority: 9,
        enabled: true,
    },
];

/**
 * Get model name for a specific task.
 * @param task - The task type
 * @param useFallback - Whether to return the fallback model instead of primary
 * @returns Model identifier string
 */
export function getNvidiaModel(task: NvidiaTask, useFallback = false): string {
    const config = NVIDIA_TASK_CONFIG[task];
    return useFallback ? config.fallback : config.primary;
}

/**
 * Get task config (maxTokens, temperature) for a specific task.
 * @param task - The task type
 * @returns Config object with maxTokens and temperature
 */
export function getNvidiaTaskConfig(task: NvidiaTask) {
    return NVIDIA_TASK_CONFIG[task];
}

/**
 * Check if NVIDIA NIM is enabled and configured.
 * Reads from environment variables.
 * @returns boolean - true if API key exists
 */
export function isNvidiaEnabled(): boolean {
    try {
        const hasKey = !!getEnv('VITE_NVIDIA_API_KEY', '');
        return hasKey;
    } catch (error) {
        console.error('Error checking NVIDIA enabled status:', error);
        return false;
    }
}

/**
 * Get NVIDIA NIM API key from env.
 * @returns API key string or empty string
 */
export function getNvidiaApiKey(): string {
    try {
        return getEnv('VITE_NVIDIA_API_KEY', '');
    } catch (error) {
        console.error('Error getting NVIDIA API key:', error);
        return '';
    }
}
