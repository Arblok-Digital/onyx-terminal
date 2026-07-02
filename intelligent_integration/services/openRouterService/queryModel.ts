/**
 * @file queryModel.ts
 * @layer service
 * @desc API query logic and fallback chain for OpenRouter service
 */

import { injectable, inject } from 'inversify';
import { getModelForTask } from './models';
import { getSystemPrompt } from './systemPrompts';
import { CircuitBreaker } from '../../core/circuitBreaker';
import { getEnv } from '../../utils/getEnv';
import { Logger } from '../../core/logger';
import { TOKENS } from '../../core/diTokens';

@injectable()
export class OpenRouterQueryManager {
    private breakers = new Map<string, CircuitBreaker>();
    private logger: Logger;

    constructor(@inject(TOKENS.Logger) logger: Logger) {
        this.logger = logger;
    }

    private getBreaker(name: string): CircuitBreaker {
        if (!this.breakers.has(name)) {
            this.logger.info(`Creating new circuit breaker`, { name });
            this.breakers.set(name, new CircuitBreaker(name, {
                failureThreshold: 3,
                resetTimeoutMs: 60000,
            }));
        }
        return this.breakers.get(name)!;
    }

    public async queryModel(
        prompt: string,
        taskType: string = 'default',
        endpoint: string,
        apiKey: string,
        taskModels?: Record<string, string>,
        modelName: string = 'primary',
        retries: number = 3,
        timeout: number = 60000,
    ): Promise<string> {
        if (!endpoint) {
            throw new Error('No endpoint configured for 9Router');
        }

        const model = getModelForTask(taskType, taskModels);
        const systemPrompt = getSystemPrompt(taskType);
        const breaker = this.getBreaker(modelName);

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await breaker.call(async () => {
                    const timeoutPromise = new Promise<Response>((_, reject) =>
                        setTimeout(() => reject(new Error(`Request timed out after ${timeout}ms`)), timeout)
                    );

                    const fetchPromise = fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey || getEnv('VITE_AI_GATEWAY_KEY', 'arblok')}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.3,
                            max_tokens: 2000,
                            stream: false
                        })
                    });

                    const response = await Promise.race([fetchPromise, timeoutPromise]);

                    if (!response.ok) {
                        const errText = await response.text().catch(() => 'Unknown error');
                        const error = new Error(`AI API error (${modelName}): ${response.status} ${errText}`);
                        this.logger.error(error.message, error);
                        throw error;
                    }

                    const result = await response.json();
                    const content = result.choices?.[0]?.message?.reasoning_content ||
                        result.choices?.[0]?.message?.content ||
                        '';

                    if (!content) {
                        this.logger.warn(`AI API error (${modelName}): Empty response from model`);
                        throw new Error(`AI API error (${modelName}): Empty response from model`);
                    }
                    return content;
                });
            } catch (error) {
                if (attempt === retries) {
                    this.logger.error(`[Attempt ${attempt}/${retries}] Failed to query ${modelName}`, error as Error);
                    throw error; // Re-throw the last error
                }
                this.logger.warn(`[Attempt ${attempt}/${retries}] Retrying query for ${modelName}`, { error: (error as Error).message });
                await new Promise(res => setTimeout(res, 1000 * attempt)); // Exponential backoff
            }
        }
        throw new Error(`Failed to query ${modelName} after ${retries} attempts.`);
    }

    public async queryOpenRouter(prompt: string, apiKey: string, retries: number = 3, timeout: number = 60000): Promise<string> {
        if (!apiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        const endpoint = getEnv('OPENROUTER_ENDPOINT', 'https://openrouter.ai/api/v1/chat/completions')!;
        const model = getEnv('OPENROUTER_MODEL', 'meta-llama/llama-3.1-8b-instruct:free')!;
        const breaker = this.getBreaker('openrouter_fallback');

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await breaker.call(async () => {
                    const timeoutPromise = new Promise<Response>((_, reject) =>
                        setTimeout(() => reject(new Error(`Request timed out after ${timeout}ms`)), timeout)
                    );

                    const fetchPromise = fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [
                                { role: 'system', content: getSystemPrompt('intelligence_report') },
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.3,
                            max_tokens: 2000,
                            stream: false
                        })
                    });

                    const response = await Promise.race([fetchPromise, timeoutPromise]);


                    if (!response.ok) {
                        const errText = await response.text().catch(() => 'Unknown error');
                        const error = new Error(`OpenRouter API error: ${response.status} ${errText}`);
                        this.logger.error(error.message, error);
                        throw error;
                    }

                    const result = await response.json();
                    const content = result.choices?.[0]?.message?.content || '';
                    if (!content) {
                        this.logger.warn('OpenRouter API error: Empty response from model');
                        throw new Error('OpenRouter API error: Empty response from model');
                    }
                    return content;
                });
            } catch (error) {
                if (attempt === retries) {
                    this.logger.error(`[Attempt ${attempt}/${retries}] Failed to query OpenRouter`, error as Error);
                    throw error; // Re-throw the last error
                }
                this.logger.warn(`[Attempt ${attempt}/${retries}] Retrying query for OpenRouter`, { error: (error as Error).message });
                await new Promise(res => setTimeout(res, 1000 * attempt)); // Exponential backoff
            }
        }
        throw new Error(`Failed to query OpenRouter after ${retries} attempts.`);
    }
}