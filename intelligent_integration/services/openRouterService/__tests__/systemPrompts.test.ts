/**
 * @file systemPrompts.test.ts
 * @desc Unit tests for system prompts module
 */

import { describe, it, expect } from 'vitest';
import { getSystemPrompt, TASK_TYPES } from '../systemPrompts';

describe('getSystemPrompt', () => {
    it('should return intelligence_report prompt', () => {
        const prompt = getSystemPrompt('intelligence_report');
        expect(prompt).toContain('intelligence analyst');
        expect(prompt).toContain('confidence scores');
        expect(prompt).toContain('actionable intelligence');
    });

    it('should return pattern_detection prompt', () => {
        const prompt = getSystemPrompt('pattern_detection');
        expect(prompt).toContain('pattern recognition');
        expect(prompt).toContain('rug pull patterns');
        expect(prompt).toContain('market manipulation');
    });

    it('should return risk_assessment prompt', () => {
        const prompt = getSystemPrompt('risk_assessment');
        expect(prompt).toContain('risk assessment');
        expect(prompt).toContain('rug pull potential');
        expect(prompt).toContain('risk scores');
    });

    it('should return flow_analysis prompt', () => {
        const prompt = getSystemPrompt('flow_analysis');
        expect(prompt).toContain('flow analyst');
        expect(prompt).toContain('trading patterns');
        expect(prompt).toContain('whale movements');
    });

    it('should return market_analysis prompt', () => {
        const prompt = getSystemPrompt('market_analysis');
        expect(prompt).toContain('market analyst');
        expect(prompt).toContain('market trends');
        expect(prompt).toContain('volatility');
    });

    it('should return onchain_analysis prompt', () => {
        const prompt = getSystemPrompt('onchain_analysis');
        expect(prompt).toContain('onchain data analyst');
        expect(prompt).toContain('wallet activity');
        expect(prompt).toContain('rug pull indicators');
    });

    it('should return narrative_analysis prompt', () => {
        const prompt = getSystemPrompt('narrative_analysis');
        expect(prompt).toContain('narrative and sentiment');
        expect(prompt).toContain('sentiment trends');
        expect(prompt).toContain('hype cycles');
    });

    it('should return smart_money_analysis prompt', () => {
        const prompt = getSystemPrompt('smart_money_analysis');
        expect(prompt).toContain('smart money analyst');
        expect(prompt).toContain('whale activity');
        expect(prompt).toContain('conviction levels');
    });

    it('should return survival_analysis prompt', () => {
        const prompt = getSystemPrompt('survival_analysis');
        expect(prompt).toContain('survival probability');
        expect(prompt).toContain('estimated lifespan');
        expect(prompt).toContain('confidence levels');
    });

    it('should return default prompt for unknown task type', () => {
        const prompt = getSystemPrompt('unknown_task_type');
        expect(prompt).toContain('helpful AI assistant');
        expect(prompt).toContain('crypto token analysis');
    });

    it('should return default prompt for empty string', () => {
        const prompt = getSystemPrompt('');
        expect(prompt).toContain('helpful AI assistant');
    });

    it('should return unique prompts for each task type - no duplicates', () => {
        const prompts = TASK_TYPES.map(type => getSystemPrompt(type));
        const uniquePrompts = new Set(prompts);
        expect(uniquePrompts.size).toBe(TASK_TYPES.length);
    });
});

describe('TASK_TYPES constant', () => {
    it('should contain all 9 task types', () => {
        expect(TASK_TYPES).toHaveLength(9);
    });

    it('should include intelligence_report', () => {
        expect(TASK_TYPES).toContain('intelligence_report');
    });

    it('should include all required task types', () => {
        const required = [
            'intelligence_report',
            'pattern_detection',
            'risk_assessment',
            'flow_analysis',
            'market_analysis',
            'onchain_analysis',
            'narrative_analysis',
            'smart_money_analysis',
            'survival_analysis'
        ];
        required.forEach(type => {
            expect(TASK_TYPES).toContain(type);
        });
    });
});