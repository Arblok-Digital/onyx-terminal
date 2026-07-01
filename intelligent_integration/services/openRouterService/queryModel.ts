/**
 * @file queryModel.ts
 * @layer service
 * @desc API query logic and fallback chain for OpenRouter service
 * @exposes queryModel, queryOpenRouter, ModelEndpoint
 */

import { getModelForTask } from './models';
import { getSystemPrompt } from './systemPrompts';

/**
 * Model endpoint configuration
 */
export interface ModelEndpoint {
    name: string;
    endpoint: string;
    apiKey: string;
}

/**
 * Query AI model with task-specific routing
 * Setiap tugas menggunakan model yang paling sesuai dengan kebutuhannya
 */
export async function queryModel(
    prompt: string,
    taskType: string = 'default',
    endpoint: string,
    apiKey: string,
    taskModels?: Record<string, string>,
    modelName: string = 'primary'
): Promise<string> {
    if (!endpoint) {
        throw new Error('No endpoint configured for 9Router');
    }

    // Add getEnv utility function for this method
    const getEnv = (key: string, defaultValue: string): string => {
        // Browser environment (Vite)
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            return (import.meta as any).env[key] || defaultValue;
        }
        // Node.js environment
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key] || defaultValue;
        }
        return defaultValue;
    };

    // Determine the appropriate model for this task
    const model = getModelForTask(taskType, taskModels);

    // Get the system prompt tailored for the task
    const systemPrompt = getSystemPrompt(taskType);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey || getEnv('VITE_AI_GATEWAY_KEY', 'arblok')}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 2000,
            stream: false
        })
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`AI API error (${modelName}): ${response.status} ${errText}`);
    }

    const result = await response.json();
    // 9Router uses reasoning_content format
    return result.choices?.[0]?.message?.reasoning_content ||
        result.choices?.[0]?.message?.content ||
        '';
}

/**
 * Query OpenRouter (free models fallback) directly
 */
export async function queryOpenRouter(prompt: string, apiKey: string): Promise<string> {
    if (!apiKey) {
        throw new Error('OpenRouter API key not configured');
    }

    const getEnv = (key: string, defaultValue: string): string => {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            return (import.meta as any).env[key] || defaultValue;
        }
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key] || defaultValue;
        }
        return defaultValue;
    };

    const endpoint = getEnv('OPENROUTER_ENDPOINT', 'https://openrouter.ai/api/v1/chat/completions');
    const model = getEnv('OPENROUTER_MODEL', 'meta-llama/llama-3.1-8b-instruct:free');

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: getSystemPrompt('intelligence_report')
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 2000,
            stream: false
        })
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || '';
}