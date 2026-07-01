/**
 * @file queryModel.test.ts
 * @desc Unit tests for query model module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { queryModel, queryOpenRouter } from '../queryModel';
import * as models from '../models';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('queryModel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock successful response
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        reasoning_content: 'test reasoning response',
                        content: 'test content response'
                    }
                }]
            })
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should throw if endpoint is empty', async () => {
        await expect(queryModel('test prompt', 'default', '', 'test-key'))
            .rejects.toThrow('No endpoint configured for 9Router');
    });

    it('should make a POST request to the given endpoint', async () => {
        await queryModel('test prompt', 'default', 'https://api.test.com/chat', 'test-key');

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toBe('https://api.test.com/chat');
        expect(options.method).toBe('POST');
    });

    it('should include Authorization header with API key', async () => {
        await queryModel('test prompt', 'default', 'https://api.test.com/chat', 'my-secret-key');

        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers['Authorization']).toBe('Bearer my-secret-key');
    });

    it('should include system prompt and user message in body', async () => {
        await queryModel('test prompt', 'intelligence_report', 'https://api.test.com/chat', 'test-key');

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.messages[0].role).toBe('system');
        expect(body.messages[0].content).toContain('intelligence analyst');
        expect(body.messages[1].role).toBe('user');
        expect(body.messages[1].content).toBe('test prompt');
    });

    it('should use default task type when not provided', async () => {
        await queryModel('test prompt', undefined as any, 'https://api.test.com/chat', 'test-key');

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        // default should use a generic model
        expect(body.messages[0].content).toContain('helpful AI assistant');
    });

    it('should set temperature to 0.3 and max_tokens to 2000', async () => {
        await queryModel('test prompt', 'default', 'https://api.test.com/chat', 'test-key');

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.temperature).toBe(0.3);
        expect(body.max_tokens).toBe(2000);
    });

    it('should return reasoning_content when available', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        reasoning_content: 'deep reasoning output',
                        content: 'fallback content'
                    }
                }]
            })
        });

        const result = await queryModel('test', 'default', 'https://api.test.com/chat', 'test-key');
        expect(result).toBe('deep reasoning output');
    });

    it('should fallback to content when reasoning_content is not available', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        content: 'standard response'
                    }
                }]
            })
        });

        const result = await queryModel('test', 'default', 'https://api.test.com/chat', 'test-key');
        expect(result).toBe('standard response');
    });

    it('should return empty string when no message content available', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{}]
            })
        });

        const result = await queryModel('test', 'default', 'https://api.test.com/chat', 'test-key');
        expect(result).toBe('');
    });

    it('should throw on non-ok response', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 401,
            text: async () => 'Unauthorized'
        });

        await expect(queryModel('test', 'default', 'https://api.test.com/chat', 'bad-key'))
            .rejects.toThrow('AI API error (primary): 401 Unauthorized');
    });

    it('should include model from getModelForTask', async () => {
        // Spy on getModelForTask
        const spy = vi.spyOn(models, 'getModelForTask').mockReturnValue('custom-model-name');

        await queryModel('test prompt', 'risk_assessment', 'https://api.test.com/chat', 'test-key');

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.model).toBe('custom-model-name');
        expect(spy).toHaveBeenCalledWith('risk_assessment', undefined);

        spy.mockRestore();
    });

    it('should pass taskModels to getModelForTask', async () => {
        const taskModels = { risk_assessment: 'custom-risk-model' };
        const spy = vi.spyOn(models, 'getModelForTask').mockReturnValue('custom-risk-model');

        await queryModel('test prompt', 'risk_assessment', 'https://api.test.com/chat', 'test-key', taskModels);

        expect(spy).toHaveBeenCalledWith('risk_assessment', taskModels);

        spy.mockRestore();
    });

    it('should include model name in error message for non-primary models', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => 'Server Error'
        });

        await expect(queryModel('test', 'default', 'https://api.test.com/chat', 'test-key', undefined, 'fallback-llama'))
            .rejects.toThrow('AI API error (fallback-llama): 500 Server Error');
    });
});

describe('queryOpenRouter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw if API key is empty', async () => {
        await expect(queryOpenRouter('test prompt', ''))
            .rejects.toThrow('OpenRouter API key not configured');
    });

    it('should throw if API key is undefined', async () => {
        await expect(queryOpenRouter('test prompt', undefined as any))
            .rejects.toThrow('OpenRouter API key not configured');
    });

    it('should make a POST request to OpenRouter endpoint', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{
                    message: { content: 'OpenRouter response' }
                }]
            })
        });

        await queryOpenRouter('test prompt', 'or-key');

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain('openrouter.ai');
        expect(options.method).toBe('POST');
        expect(options.headers['Authorization']).toBe('Bearer or-key');
    });

    it('should return content from OpenRouter response', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{
                    message: { content: 'OpenRouter analysis result' }
                }]
            })
        });

        const result = await queryOpenRouter('analyze this token', 'or-key');
        expect(result).toBe('OpenRouter analysis result');
    });

    it('should throw on non-ok OpenRouter response', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 429,
            text: async () => 'Rate limit exceeded'
        });

        await expect(queryOpenRouter('test', 'or-key'))
            .rejects.toThrow('OpenRouter API error: 429 Rate limit exceeded');
    });
});