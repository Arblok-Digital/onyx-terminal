/**
 * @file openRouterModels.ts
 * @layer models
 * @desc OpenRouter free model configurations per task type.
 *       OpenRouter provides OpenAI-compatible API with access to many models.
 *       We assign specific models based on task requirements:
 *       - report:      DeepSeek R1 free (strong reasoning for multi-source synthesis)
 *       - attention:   Mistral 7B free (fast classification for velocity scoring)
 *       - conviction:  Qwen 2.5 7B free (numeric precision for scoring tasks)
 *
 * @exposes OPENROUTER_MODELS, OPENROUTER_TASK_CONFIG, getOpenRouterModel
 */
import { getEnv } from '../utils';

// TypeScript interface for Vite environment variables
interface ImportMetaEnv {
    readonly VITE_OPENROUTER_API_KEY?: string;
    readonly VITE_OPENROUTER_ENABLED?: string;
    readonly VITE_OPENROUTER_ENDPOINT?: string;
}

/** OpenRouter API endpoint (OpenAI-compatible) */
export const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/** App identification headers (required by OpenRouter free tier) */
export const OPENROUTER_HEADERS = {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://onyx-terminal.app',
    'X-Title': 'Onyx Terminal - AI Intelligence',
};

/** Task types that map to specific model assignments */
export type OpenRouterTask = 'report' | 'attention' | 'conviction' | 'general';

/**
 * Model definitions per task.
 * Each task has a primary model + fallback model (both free tier).
 */
export const OPENROUTER_TASK_CONFIG: Record<
    OpenRouterTask,
    {
        primary: string;
        fallback: string;
        maxTokens: number;
        temperature: number;
        description: string;
    }
> = {
    /**
     * Report synthesis - combines 7 data sources into intelligence report.
     * Needs: strong reasoning, long output, structured format.
     * DeepSeek R1 = chain-of-thought reasoning, GPT-4 level for analysis tasks.
     */
    report: {
        primary: 'deepseek/deepseek-r1:free',
        fallback: 'meta-llama/llama-3.3-70b-instruct:free',
        maxTokens: 4000,
        temperature: 0.3,
        description: 'Multi-source intelligence report synthesis (7 data streams)',
    },

    /**
     * Attention velocity scoring - classify social/volume/wallet growth.
     * Needs: fast response, simple classification (score 0-100 + trend).
     * Mistral 7B = low latency, good at classification tasks.
     */
    attention: {
        primary: 'mistralai/mistral-7b-instruct:free',
        fallback: 'meta-llama/llama-3.1-8b-instruct:free',
        maxTokens: 500,
        temperature: 0.3,
        description: 'Attention velocity scoring (social + volume + wallet growth)',
    },

    /**
     * Conviction score - smart money + retail conviction numeric scoring.
     * Needs: numeric precision, scoring accuracy.
     * Qwen 2.5 7B = strong at math/scoring, good numeric reasoning.
     */
    conviction: {
        primary: 'qwen/qwen-2.5-7b-instruct:free',
        fallback: 'meta-llama/llama-3.1-8b-instruct:free',
        maxTokens: 500,
        temperature: 0.2,
        description: 'Conviction score analysis (smart money + retail scoring)',
    },

    /**
     * General purpose - default fallback for any other AI task.
     */
    general: {
        primary: 'meta-llama/llama-3.3-70b-instruct:free',
        fallback: 'mistralai/mistral-7b-instruct:free',
        maxTokens: 2000,
        temperature: 0.3,
        description: 'General purpose AI task',
    },
};

/**
 * Flat list of all OpenRouter models used (for config registration in agentRouter).
 * Priority order: lower number = higher priority.
 */
export const OPENROUTER_MODELS = [
    {
        name: 'openrouter-deepseek-r1',
        model: 'deepseek/deepseek-r1:free',
        task: 'report' as OpenRouterTask,
        priority: 4, // After 9Router (1-3), before other fallbacks
        enabled: true,
    },
    {
        name: 'openrouter-llama-3.3-70b',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        task: 'report' as OpenRouterTask,
        priority: 5,
        enabled: true,
    },
    {
        name: 'openrouter-mistral-7b',
        model: 'mistralai/mistral-7b-instruct:free',
        task: 'attention' as OpenRouterTask,
        priority: 6,
        enabled: true,
    },
    {
        name: 'openrouter-qwen-2.5-7b',
        model: 'qwen/qwen-2.5-7b-instruct:free',
        task: 'conviction' as OpenRouterTask,
        priority: 7,
        enabled: true,
    },
];

/**
 * Get model name for a specific task.
 * @param task - The task type
 * @param useFallback - Whether to return the fallback model instead of primary
 * @returns Model identifier string
 */
export function getOpenRouterModel(task: OpenRouterTask, useFallback = false): string {
    const config = OPENROUTER_TASK_CONFIG[task];
    return useFallback ? config.fallback : config.primary;
}

/**
 * Get task config (maxTokens, temperature) for a specific task.
 * @param task - The task type
 * @returns Config object with maxTokens and temperature
 */
export function getOpenRouterTaskConfig(task: OpenRouterTask) {
    return OPENROUTER_TASK_CONFIG[task];
}

/**
 * Check if OpenRouter is enabled and configured.
 * Reads from environment variables.
 * @returns boolean - true if API key exists and enabled flag is true
 */
export function isOpenRouterEnabled(): boolean {
    try {
        const enabled = getEnv('VITE_OPENROUTER_ENABLED', 'false') !== 'false';
        const hasKey = !!getEnv('VITE_OPENROUTER_API_KEY', '');
        return enabled && hasKey;
    } catch (error) {
        console.error('Error checking OpenRouter enabled status:', error);
        return false;
    }
}

/**
 * Get OpenRouter API key from env.
 * @returns API key string or empty string
 */
export function getOpenRouterApiKey(): string {
    try {
        return getEnv('VITE_OPENROUTER_API_KEY', '');
    } catch (error) {
        console.error('Error getting OpenRouter API key:', error);
        return '';
    }
}
