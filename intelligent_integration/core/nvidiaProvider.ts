/**
 * @file nvidiaProvider.ts
 * @layer core
 * @desc NVIDIA NIM AI provider - OpenAI-compatible API for Nemotron models.
 *       Provides chat() and chatWithFallback() methods for AI calls.
 *       Used as fallback tier when OpenRouter and 9Router are unavailable.
 *
 *       Models:
 *       - Primary:   nvidia/nemotron-3-ultra-550b-a55b (550B params, deep reasoning)
 *       - Fallback:  nvidia/nemotron-3-super-120b-a12b (120B params, fast inference)
 *
 * @exposes NvidiaProvider
 */

import {
    NVIDIA_ENDPOINT,
    NVIDIA_HEADERS,
    NVIDIA_TASK_CONFIG,
    NvidiaTask,
    getNvidiaModel,
    getNvidiaTaskConfig,
    isNvidiaEnabled,
    getNvidiaApiKey,
} from '../models/nvidiaModels';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatOptions {
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
}

export interface ChatResult {
    content: string;
    model: string;
    task: NvidiaTask;
    isFallback: boolean;
}

/**
 * NVIDIA NIM AI Provider
 *
 * Calls NVIDIA's OpenAI-compatible endpoint with Nemotron model routing.
 * Implements automatic fallback from Nemotron Ultra 550B to Nemotron Super 120B.
 *
 * Usage:
 *   const provider = new NvidiaProvider();
 *   const result = await provider.chatWithFallback(messages, 'report');
 */
export class NvidiaProvider {
    private apiKey: string;
    private endpoint: string;
    private enabled: boolean;

    constructor() {
        this.apiKey = getNvidiaApiKey();
        this.endpoint = NVIDIA_ENDPOINT;
        this.enabled = isNvidiaEnabled();
    }

    /**
     * Check if NVIDIA NIM is available (has API key).
     */
    isAvailable(): boolean {
        return this.enabled && !!this.apiKey;
    }

    /**
     * Refresh credentials from env (useful if env changes at runtime).
     */
    refresh(): void {
        this.apiKey = getNvidiaApiKey();
        this.enabled = isNvidiaEnabled();
    }

    /**
     * Send a chat completion request to NVIDIA NIM with a specific model.
     *
     * @param messages - Array of chat messages (system/user/assistant)
     * @param model - Model identifier (e.g., 'nvidia/nemotron-3-ultra-550b-a55b')
     * @param options - Optional config (maxTokens, temperature, timeoutMs)
     * @returns Raw content string from model response
     * @throws Error if request fails or provider not configured
     */
    async chat(
        messages: ChatMessage[],
        model: string,
        options?: ChatOptions
    ): Promise<string> {
        if (!this.isAvailable()) {
            throw new Error('NVIDIA NIM provider not available: missing API key');
        }

        const maxTokens = options?.maxTokens ?? 2000;
        const temperature = options?.temperature ?? 0.3;
        const timeoutMs = options?.timeoutMs ?? 60000;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    ...NVIDIA_HEADERS,
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: maxTokens,
                    temperature: temperature,
                    stream: false,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text().catch(() => 'Unknown error');
                throw new Error(`NVIDIA API error (${response.status}): ${errText}`);
            }

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '';

            if (!content) {
                throw new Error('NVIDIA NIM returned empty response content');
            }

            return content;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new Error(`NVIDIA NIM request timeout after ${timeoutMs}ms`);
            }
            throw error;
        }
    }

    /**
     * Send a chat completion with automatic fallback.
     *
     * Tries the primary model for the given task first.
     * If it fails, falls back to the backup model for that task.
     * Returns metadata about which model was used.
     *
     * @param messages - Array of chat messages
     * @param task - Task type ('report', 'attention', 'conviction', 'general')
     * @param options - Optional config overrides (task defaults used if not provided)
     * @returns ChatResult with content + metadata
     */
    async chatWithFallback(
        messages: ChatMessage[],
        task: NvidiaTask = 'general',
        options?: ChatOptions
    ): Promise<ChatResult> {
        const taskConfig = getNvidiaTaskConfig(task);
        const maxTokens = options?.maxTokens ?? taskConfig.maxTokens;
        const temperature = options?.temperature ?? taskConfig.temperature;

        // Try primary model
        try {
            const primaryModel = getNvidiaModel(task, false);
            const content = await this.chat(messages, primaryModel, {
                maxTokens,
                temperature,
            });
            return {
                content,
                model: primaryModel,
                task,
                isFallback: false,
            };
        } catch (primaryError) {
            console.warn(
                `NVIDIA primary model failed (${task}):`,
                primaryError instanceof Error ? primaryError.message : String(primaryError)
            );

            // Try fallback model
            try {
                const fallbackModel = getNvidiaModel(task, true);
                const content = await this.chat(messages, fallbackModel, {
                    maxTokens,
                    temperature,
                });
                return {
                    content,
                    model: fallbackModel,
                    task,
                    isFallback: true,
                };
            } catch (fallbackError) {
                console.error(
                    `NVIDIA fallback model also failed (${task}):`,
                    fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
                );
                throw fallbackError;
            }
        }
    }

    /**
     * Get the model name that would be used for a task (without making a call).
     * Useful for logging/routing decisions.
     */
    getModelForTask(task: NvidiaTask, useFallback = false): string {
        return getNvidiaModel(task, useFallback);
    }
}

/**
 * Lazy singleton instance.
 * NVIDIA provider is reused across calls.
 */
let _instance: NvidiaProvider | null = null;

export function getNvidiaProvider(): NvidiaProvider {
    if (!_instance) {
        _instance = new NvidiaProvider();
    }
    return _instance;
}
