/**
 * @file openRouterModels.ts
 * @layer models
 * @desc OpenRouter free model configurations per task type.
 *       OpenRouter provides OpenAI-compatible API with access to many models.
 *       We assign specific models based on task requirements:
 *       - all tasks:   google/gemma-4-31b-it:free (verified working, strong reasoning)
 *       - fallback:    meta-llama/llama-3.3-70b-instruct:free (widely available)
 *
 *       Models updated 2026-07-09:
 *       - ❌ deepseek/deepseek-r1:free  → not free anymore
 *       - ❌ mistralai/mistral-7b-instruct:free → not available
 *       - ❌ qwen/qwen-2.5-7b-instruct:free → not free anymore
 *       - ✅ google/gemma-4-31b-it:free → verified working
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
     * Uses Google Gemma 4 31B (verified working, strong reasoning).
     * Fallback: Llama 3.3 70B (widely available, good fallback).
     */
    report: {
        primary: 'google/gemma-4-31b-it:free',
        fallback: 'meta-llama/llama-3.3-70b-instruct:free',
        maxTokens: 4000,
        temperature: 0.3,
        description: 'Multi-source intelligence report synthesis (Gemma 4 31B)',
    },

    /**
     * Attention velocity scoring - classify social/volume/wallet growth.
     * Uses Google Gemma 4 31B (strong reasoning for nuanced classification).
     * Fallback: Llama 3.3 70B.
     */
    attention: {
        primary: 'google/gemma-4-31b-it:free',
        fallback: 'meta-llama/llama-3.3-70b-instruct:free',
        maxTokens: 500,
        temperature: 0.3,
        description: 'Attention velocity scoring (Gemma 4 31B)',
    },

    /**
     * Conviction score - smart money + retail conviction numeric scoring.
     * Uses Google Gemma 4 31B (strong at math/reasoning for scoring tasks).
     * Fallback: Llama 3.3 70B.
     */
    conviction: {
        primary: 'google/gemma-4-31b-it:free',
        fallback: 'meta-llama/llama-3.3-70b-instruct:free',
        maxTokens: 500,
        temperature: 0.2,
        description: 'Conviction score analysis (Gemma 4 31B)',
    },

    /**
     * General purpose - default fallback for any other AI task.
     * Uses Google Gemma 4 31B as primary (most reliable free model).
     * Fallback: Llama 3.3 70B.
     */
    general: {
        primary: 'google/gemma-4-31b-it:free',
        fallback: 'meta-llama/llama-3.3-70b-instruct:free',
        maxTokens: 2000,
        temperature: 0.3,
        description: 'General purpose AI task (Gemma 4 31B)',
    },
};

/**
 * Flat list of all OpenRouter models used (for config registration in agentRouter).
 * Priority order: lower number = higher priority.
 */
export const OPENROUTER_MODELS = [
    {
        name: 'openrouter-gemma-4-31b',
        model: 'google/gemma-4-31b-it:free',
        task: 'report' as OpenRouterTask,
        priority: 4, // After 9Router (1-3), before NVIDIA (8-9)
        enabled: true,
    },
    {
        name: 'openrouter-llama-3.3-70b',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        task: 'report' as OpenRouterTask,
        priority: 5,
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
