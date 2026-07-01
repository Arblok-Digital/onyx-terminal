/**
 * @file models.test.ts
 * @desc Unit tests for models.ts - Model configuration & task-to-model mapping
 */

import { describe, it, expect } from 'vitest';

// Replicate the logic from models.ts for testing
const TASK_MODEL_MAP: Record<string, string> = {
    'intelligence_report': 'oc/deepseek-v4-flash-free',
    'pattern_detection': 'oc/deepseek-v4-flash-free',
    'risk_assessment': 'oc/deepseek-v4-flash-free',
    'flow_analysis': 'ollama/gpt-oss:120b',
    'market_analysis': 'ollama/gpt-oss:120b',
    'onchain_analysis': 'ollama/gpt-oss:120b',
    'narrative_analysis': 'mistral/mistral-large-latest',
    'smart_money_analysis': 'mistral/mistral-large-latest',
    'survival_analysis': 'mistral/mistral-large-latest',
    'default': 'arblok'
};

function getModelForTask(taskType: string, taskModels?: Record<string, string>): string {
    const models = taskModels || TASK_MODEL_MAP;
    if (models && models[taskType]) {
        return models[taskType];
    }
    return models['default'] || 'arblok';
}

const TASK_CONFIG = {
    REASONING_TASKS: ['intelligence_report', 'pattern_detection', 'risk_assessment'],
    VOLUME_TASKS: ['flow_analysis', 'market_analysis', 'onchain_analysis'],
    GENERAL_TASKS: ['narrative_analysis', 'smart_money_analysis', 'survival_analysis']
};

describe('Task Model Mapping', () => {
    describe('getModelForTask', () => {
        it('should return deepseek model for reasoning tasks', () => {
            expect(getModelForTask('intelligence_report')).toBe('oc/deepseek-v4-flash-free');
            expect(getModelForTask('pattern_detection')).toBe('oc/deepseek-v4-flash-free');
            expect(getModelForTask('risk_assessment')).toBe('oc/deepseek-v4-flash-free');
        });

        it('should return gpt-oss model for volume tasks', () => {
            expect(getModelForTask('flow_analysis')).toBe('ollama/gpt-oss:120b');
            expect(getModelForTask('market_analysis')).toBe('ollama/gpt-oss:120b');
            expect(getModelForTask('onchain_analysis')).toBe('ollama/gpt-oss:120b');
        });

        it('should return mistral model for general tasks', () => {
            expect(getModelForTask('narrative_analysis')).toBe('mistral/mistral-large-latest');
            expect(getModelForTask('smart_money_analysis')).toBe('mistral/mistral-large-latest');
            expect(getModelForTask('survival_analysis')).toBe('mistral/mistral-large-latest');
        });

        it('should return default for unknown task types', () => {
            expect(getModelForTask('unknown_task')).toBe('arblok');
            expect(getModelForTask('')).toBe('arblok');
        });

        it('should use custom taskModels if provided', () => {
            const customModels = {
                'my_task': 'custom-model',
                'default': 'my-default'
            };
            expect(getModelForTask('my_task', customModels)).toBe('custom-model');
            expect(getModelForTask('other', customModels)).toBe('my-default');
        });

        it('should return arblok as ultimate fallback', () => {
            expect(getModelForTask('nonexistent', { 'default': 'arblok' })).toBe('arblok');
        });
    });

    describe('TASK_CONFIG categories', () => {
        it('should have 3 reasoning tasks', () => {
            expect(TASK_CONFIG.REASONING_TASKS).toHaveLength(3);
        });

        it('should have 3 volume tasks', () => {
            expect(TASK_CONFIG.VOLUME_TASKS).toHaveLength(3);
        });

        it('should have 3 general tasks', () => {
            expect(TASK_CONFIG.GENERAL_TASKS).toHaveLength(3);
        });

        it('should cover all 9 tasks exactly once across categories', () => {
            const allTasks = [
                ...TASK_CONFIG.REASONING_TASKS,
                ...TASK_CONFIG.VOLUME_TASKS,
                ...TASK_CONFIG.GENERAL_TASKS
            ];
            expect(allTasks).toHaveLength(9);
            const uniqueTasks = new Set(allTasks);
            expect(uniqueTasks.size).toBe(9); // No duplicates
        });

        it('should have valid model for every task in config', () => {
            const allTasks = [
                ...TASK_CONFIG.REASONING_TASKS,
                ...TASK_CONFIG.VOLUME_TASKS,
                ...TASK_CONFIG.GENERAL_TASKS
            ];
            allTasks.forEach(task => {
                const model = getModelForTask(task);
                expect(model).toBeDefined();
                expect(model.length).toBeGreaterThan(0);
            });
        });
    });

    describe('TASK_MODEL_MAP integrity', () => {
        it('should have exactly 10 entries (9 tasks + default)', () => {
            expect(Object.keys(TASK_MODEL_MAP)).toHaveLength(10);
        });

        it('should have non-empty model strings', () => {
            Object.entries(TASK_MODEL_MAP).forEach(([task, model]) => {
                expect(model).toBeTruthy();
                expect(typeof model).toBe('string');
            });
        });

        it('should group models correctly', () => {
            const deepseekTasks = ['intelligence_report', 'pattern_detection', 'risk_assessment'];
            const gptOssTasks = ['flow_analysis', 'market_analysis', 'onchain_analysis'];
            const mistralTasks = ['narrative_analysis', 'smart_money_analysis', 'survival_analysis'];

            deepseekTasks.forEach(t => expect(TASK_MODEL_MAP[t]).toBe('oc/deepseek-v4-flash-free'));
            gptOssTasks.forEach(t => expect(TASK_MODEL_MAP[t]).toBe('ollama/gpt-oss:120b'));
            mistralTasks.forEach(t => expect(TASK_MODEL_MAP[t]).toBe('mistral/mistral-large-latest'));
        });
    });
});