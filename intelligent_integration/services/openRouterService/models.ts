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
 * NVIDIA NIM model names
 * API-compatible model identifiers for NVIDIA NIM endpoints
 */
export const NVIDIA_MODELS = {
    /** Nemotron 3 Ultra 550B — flagship deep research model (a55b = 55B active MoE) */
    NEMOTRON_ULTRA: 'nvidia/nemotron-3-ultra-550b-a55b',
    /** Nemotron 3 Super 120B — balanced speed/quality */
    NEMOTRON_SUPER: 'nvidia/nemotron-3-super-120b',
    /** Mistral Large 3 — strong reasoning */
    MISTRAL_LARGE: 'mistralai/mistral-large-3',
    /** Llama 3.1 8B — lightweight fallback */
    LLAMA_8B: 'meta/llama-3.1-8b-instruct',
} as const;

/**
 * Default task model mapping
 *
 * Models dibagi berdasarkan kekuatan:
 * - NVIDIA Nemotron 3 Ultra 550B: Deep reasoning, intelligence report, pattern detection
 * - OC DeepSeek V4: Fast analysis, risk assessment
 * - Mistral Large: Narrative, sentiment, smart money
 */
export const TASK_MODEL_MAP: Record<string, string> = {
    // Tasks requiring deep reasoning and complex analysis
    'intelligence_report': NVIDIA_MODELS.NEMOTRON_ULTRA, // Primary for comprehensive analysis
    'pattern_detection': NVIDIA_MODELS.NEMOTRON_ULTRA,   // Pattern analysis and anomaly detection
    'risk_assessment': 'oc/deepseek-v4-flash-free',     // Risk assessment with strong reasoning

    // Tasks requiring large volume processing and speed
    'flow_analysis': NVIDIA_MODELS.NEMOTRON_SUPER,     // Real-time flow data analysis
    'market_analysis': NVIDIA_MODELS.NEMOTRON_SUPER,   // Market and volume data analysis
    'onchain_analysis': NVIDIA_MODELS.NEMOTRON_SUPER,  // Large onchain data analysis

    // Tasks requiring general intelligence
    'narrative_analysis': NVIDIA_MODELS.MISTRAL_LARGE, // Narrative and sentiment analysis
    'smart_money_analysis': NVIDIA_MODELS.MISTRAL_LARGE, // Whale behavior analysis
    'survival_analysis': NVIDIA_MODELS.MISTRAL_LARGE,  // Token survival prediction

    // Default model (using NVIDIA flagship)
    'default': NVIDIA_MODELS.NEMOTRON_ULTRA
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