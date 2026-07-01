/**
 * @file openRouterProvider.ts
 * @layer core
 * @desc OpenRouter AI provider - OpenAI-compatible API with free model access.
 *       Provides chat() and chatWithFallback() methods for AI calls.
 *       Used as fallback tier when 9Router Gateway and 9Router Cloud are unavailable.
 *
 * @exposes OpenRouterProvider
 */

import {
    OPENROUTER_ENDPOINT,
    OPENROUTER_HEADERS,
    OPENROUTER_TASK_CONFIG,
    OpenRouterTask,
    getOpenRouterModel,
    getOpenRouterTaskConfig,
    isOpenRouterEnabled,
    getOpenRouterApiKey,
} from '../models/openRouterModels';

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
    task: OpenRouterTask;
    isFallback: boolean;
}

/**
 * OpenRouter AI Provider
 *
 * Calls OpenRouter's OpenAI-compatible endpoint with task-specific model routing.
 * Implements automatic fallback from primary model to backup model within a task.
 *
 * Usage:
 *   const provider = new OpenRouterProvider();
 *   const result = await provider.chatWithFallback(messages, 'report');
 */
export class OpenRouterProvider {
    private apiKey: string;
    private endpoint: string;
    private enabled: boolean;

    constructor() {
        this.apiKey = getOpenRouterApiKey();
        this.endpoint = OPENROUTER_ENDPOINT;
        this.enabled = isOpenRouterEnabled();
    }

    /**
     * Check if OpenRouter is available (has API key + enabled).
     */
    isAvailable(): boolean {
        return this.enabled && !!this.apiKey;
    }

    /**
     * Refresh credentials from env (useful if env changes at runtime).
     */
    refresh(): void {
        this.apiKey = getOpenRouterApiKey();
        this.enabled = isOpenRouterEnabled();
    }

    /**
     * Send a chat completion request to OpenRouter with a specific model.
     *
     * @param messages - Array of chat messages (system/user/assistant)
     * @param model - Model identifier (e.g., 'deepseek/deepseek-r1:free')
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
            throw new Error('OpenRouter provider not available: missing API key or disabled');
        }

        const maxTokens = options?.maxTokens ?? 2000;
        const temperature = options?.temperature ?? 0.3;
        const timeoutMs = options?.timeoutMs ?? 30000;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    ...OPENROUTER_HEADERS,
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
                throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
            }

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '';

            if (!content) {
                throw new Error('OpenRouter returned empty response content');
            }

            return content;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new Error(`OpenRouter request timeout after ${timeoutMs}ms`);
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
        task: OpenRouterTask = 'general',
        options?: ChatOptions
    ): Promise<ChatResult> {
        const taskConfig = getOpenRouterTaskConfig(task);
        const maxTokens = options?.maxTokens ?? taskConfig.maxTokens;
        const temperature = options?.temperature ?? taskConfig.temperature;

        // Try primary model
        try {
            const primaryModel = getOpenRouterModel(task, false);
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
                `OpenRouter primary model failed (${task}):`,
                primaryError instanceof Error ? primaryError.message : String(primaryError)
            );

            // Try fallback model
            try {
                const fallbackModel = getOpenRouterModel(task, true);
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
                    `OpenRouter fallback model also failed (${task}):`,
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
    getModelForTask(task: OpenRouterTask, useFallback = false): string {
        return getOpenRouterModel(task, useFallback);
    }
}

/**
 * Lazy singleton instance.
 * OpenRouter provider is reused across calls.
 */
let _instance: OpenRouterProvider | null = null;

export function getOpenRouterProvider(): OpenRouterProvider {
    if (!_instance) {
        _instance = new OpenRouterProvider();
    }
    return _instance;
}