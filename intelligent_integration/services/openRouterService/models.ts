/**
 * @file models.ts
 * @layer service
 * @desc Model configuration and task-to-model mapping for OpenRouter service
 * @exposes getModelForTask, TaskModelConfig
 */

/**
 * Task-specific model configuration
 * Setiap model memiliki tugas spesifik berdasarkan kekuatannya
 */
export interface TaskModelConfig {
    /** Tasks requiring deep reasoning and complex analysis */
    readonly REASONING_TASKS: readonly string[];
    /** Tasks requiring large volume processing and speed */
    readonly VOLUME_TASKS: readonly string[];
    /** Tasks requiring general intelligence */
    readonly GENERAL_TASKS: readonly string[];
}

/**
 * Default task model mapping
 */
export const TASK_MODEL_MAP: Record<string, string> = {
    // Tasks requiring deep reasoning and complex analysis
    'intelligence_report': 'oc/deepseek-v4-flash-free', // Primary for comprehensive analysis
    'pattern_detection': 'oc/deepseek-v4-flash-free',   // Pattern analysis and anomaly detection
    'risk_assessment': 'oc/deepseek-v4-flash-free',     // Risk assessment with strong reasoning

    // Tasks requiring large volume processing and speed
    'flow_analysis': 'ollama/gpt-oss:120b',            // Real-time flow data analysis
    'market_analysis': 'ollama/gpt-oss:120b',          // Market and volume data analysis
    'onchain_analysis': 'ollama/gpt-oss:120b',         // Large onchain data analysis

    // Tasks requiring general intelligence
    'narrative_analysis': 'mistral/mistral-large-latest', // Narrative and sentiment analysis
    'smart_money_analysis': 'mistral/mistral-large-latest', // Whale behavior analysis
    'survival_analysis': 'mistral/mistral-large-latest', // Token survival prediction

    // Default model (using configured "arblok" combo)
    'default': 'arblok' // Combo includes fallback chain
};

/**
 * Get the appropriate model for a given task
 */
export function getModelForTask(taskType: string, taskModels?: Record<string, string>): string {
    const models = taskModels || TASK_MODEL_MAP;
    // Check if there is a specific model for this task
    if (models && models[taskType]) {
        return models[taskType];
    }
    // If no specific model, use the "arblok" combo (includes fallback chain):
    // 1. oc/deepseek-v4-flash-free (primary)
    // 2. ollama/gpt-oss:120b (fallback)
    // 3. mistral/mistral-large-latest (last resort)
    return models['default'] || 'arblok';
}

/**
 * Get the task configuration
 */
export const TASK_CONFIG: TaskModelConfig = {
    REASONING_TASKS: ['intelligence_report', 'pattern_detection', 'risk_assessment'],
    VOLUME_TASKS: ['flow_analysis', 'market_analysis', 'onchain_analysis'],
    GENERAL_TASKS: ['narrative_analysis', 'smart_money_analysis', 'survival_analysis']
};