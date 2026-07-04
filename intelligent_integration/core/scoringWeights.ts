/**
 * @file scoringWeights.ts
 * @layer core
 * @desc Configurable scoring weights for intelligence ranking.
 *       Weights define how each analysis dimension contributes to the overall score.
 *       All weights must sum to 1.0 (100%).
 *
 * @usage
 *   import { getActiveWeights, validateWeights } from './scoringWeights';
 *   const weights = getActiveWeights();
 *   const overallScore = (opportunity * weights.opportunity) +
 *                        (risk * weights.risk) + ...
 *
 * @config
 *   Environment variable overrides:
 *   - WEIGHT_OPPORTUNITY
 *   - WEIGHT_RISK
 *   - WEIGHT_SMART_MONEY
 *   - WEIGHT_SURVIVAL
 *   - WEIGHT_NARRATIVE
 */

export interface ScoringWeights {
    opportunity: number;
    risk: number;
    smartMoney: number;
    survival: number;
    narrative: number;
}

/**
 * Default weights optimized for early token detection.
 * These can be overridden via environment variables.
 */
const DEFAULT_WEIGHTS: ScoringWeights = {
    opportunity: 0.30,
    risk: 0.25,
    smartMoney: 0.20,
    survival: 0.15,
    narrative: 0.10,
};

/**
 * Get active weights, merging defaults with environment overrides.
 * Environment variables are parsed as floats clamped to [0, 1].
 */
export function getActiveWeights(): ScoringWeights {
    const envWeights = getEnvOverrides();
    const merged = { ...DEFAULT_WEIGHTS, ...envWeights };

    // Auto-normalize if total deviates by more than 0.01
    const total = merged.opportunity + merged.risk + merged.smartMoney + merged.survival + merged.narrative;
    if (Math.abs(total - 1.0) > 0.01) {
        console.warn(`[ScoringWeights] Weights sum to ${total}, normalizing to 1.0`);
        const scale = 1.0 / total;
        merged.opportunity *= scale;
        merged.risk *= scale;
        merged.smartMoney *= scale;
        merged.survival *= scale;
        merged.narrative *= scale;
    }

    return merged;
}

/**
 * Validate weights and return any errors.
 */
export function validateWeights(weights: ScoringWeights): string[] {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(weights)) {
        if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`Weight "${key}" is not a valid number`);
        } else if (value < 0 || value > 1) {
            errors.push(`Weight "${key}" must be between 0 and 1, got ${value}`);
        }
    }

    const total = weights.opportunity + weights.risk + weights.smartMoney + weights.survival + weights.narrative;
    if (Math.abs(total - 1.0) > 0.01) {
        errors.push(`Weights must sum to 1.0, got ${total}`);
    }

    return errors;
}

/**
 * Read environment variable overrides.
 * Only includes variables that are valid floats and within [0, 1].
 */
function getEnvOverrides(): Partial<ScoringWeights> {
    const overrides: Partial<ScoringWeights> = {};

    const envMap: Array<{ key: keyof ScoringWeights; env: string }> = [
        { key: 'opportunity', env: 'WEIGHT_OPPORTUNITY' },
        { key: 'risk', env: 'WEIGHT_RISK' },
        { key: 'smartMoney', env: 'WEIGHT_SMART_MONEY' },
        { key: 'survival', env: 'WEIGHT_SURVIVAL' },
        { key: 'narrative', env: 'WEIGHT_NARRATIVE' },
    ];

    for (const { key, env } of envMap) {
        const raw = typeof process !== 'undefined' ? process.env?.[env] : undefined;
        if (raw !== undefined && raw !== '') {
            const parsed = parseFloat(raw);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
                overrides[key] = parsed;
            } else {
                console.warn(`[ScoringWeights] Invalid env ${env}="${raw}", ignoring`);
            }
        }
    }

    return overrides;
}