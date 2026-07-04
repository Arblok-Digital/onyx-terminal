/**
 * @file configValidator.ts
 * @layer core
 * @desc Validates runtime configuration for AI providers and core services.
 *       Ensures required environment variables are present before the app boots.
 *       Critical validation (network) vs non-critical (AI keys, supabase) dipisah
 *       agar error API AI tidak merusak UI.
 *
 * @usage
 *   const validator = new ConfigValidator();
 *   const result = validator.validateCritical(); // only critical
 *   const fullResult = validator.validate();       // all rules
 *
 * @exposes ConfigValidator, ConfigValidationResult, ConfigRule
 */

export interface ConfigRule {
    /** Environment variable name */
    key: string;
    /** Human-readable description */
    description: string;
    /** Whether the variable is required (default: true) */
    required?: boolean;
    /** Default value if not set (only applies when required is false) */
    default?: string;
    /** Validation pattern (regex) */
    pattern?: RegExp;
    /** Custom validation message */
    patternMessage?: string;
    /** Whether this rule is critical for app boot (default: false) */
    critical?: boolean;
}

export interface ConfigValidationResult {
    valid: boolean;
    missing: string[];
    warnings: string[];
    values: Record<string, string | undefined>;
}

/**
 * Default configuration rules for Onyx Terminal.
 * Dipisah antara critical (harus ada agar app jalan) dan non-critical (opsional).
 */
const DEFAULT_RULES: ConfigRule[] = [
    // ── Critical: Network — tanpanya app gak jalan ──
    {
        key: 'VITE_SOLANA_RPC',
        description: 'Solana RPC endpoint',
        required: false,
        default: 'https://api.devnet.solana.com',
        pattern: /^https?:\/\/.+/,
        patternMessage: 'Must be a valid HTTP/HTTPS URL',
        critical: true,
    },
    {
        key: 'VITE_SOLANA_NETWORK',
        description: 'Solana network (mainnet-beta / devnet)',
        required: false,
        default: 'devnet',
        critical: true,
    },

    // ── Non-Critical: AI Providers ──
    {
        key: 'VITE_9ROUTER_API_KEY',
        description: '9Router API Key for AI model routing',
        required: false,
        pattern: /^(sk-or-|9r-|)[a-zA-Z0-9_-]+$/,
        patternMessage: 'Must start with "sk-or-", "9r-", or be a valid API key format',
        critical: false,
    },
    {
        key: 'VITE_OPENROUTER_API_KEY',
        description: 'OpenRouter API Key (fallback provider)',
        required: false,
        critical: false,
    },
    {
        key: 'VITE_DEFAULT_AI_PROVIDER',
        description: 'Default AI provider (9router or openrouter)',
        required: false,
        default: '9router',
        pattern: /^(9router|openrouter)$/i,
        patternMessage: 'Must be "9router" or "openrouter"',
        critical: false,
    },

    // ── Non-Critical: Supabase (analytics only) ──
    {
        key: 'VITE_SUPABASE_URL',
        description: 'Supabase project URL',
        required: false,
        pattern: /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/,
        patternMessage: 'Must be a valid Supabase URL (https://*.supabase.co)',
        critical: false,
    },
    {
        key: 'VITE_SUPABASE_ANON_KEY',
        description: 'Supabase anonymous API key',
        required: false,
        critical: false,
    },

    // ── Non-Critical: Jupiter ──
    {
        key: 'VITE_JUPITER_API_URL',
        description: 'Jupiter Aggregator API URL',
        required: false,
        default: 'https://quote-api.jup.ag/v6',
        pattern: /^https?:\/\/.+/,
        patternMessage: 'Must be a valid HTTP/HTTPS URL',
        critical: false,
    },
    {
        key: 'VITE_JUPITER_REFERRAL_WALLET',
        description: 'Jupiter referral wallet',
        required: false,
        critical: false,
    },
    {
        key: 'VITE_JUPITER_FEE_ACCOUNT_USDC',
        description: 'Jupiter fee account USDC',
        required: false,
        critical: false,
    },

    // ── Non-Critical: External APIs ──
    {
        key: 'VITE_HELIUS_API_KEY',
        description: 'Helius API Key for enhanced RPC',
        required: false,
        critical: false,
    },
    {
        key: 'VITE_BIRDEYE_API_KEY',
        description: 'Birdeye API Key for on-chain data',
        required: false,
        critical: false,
    },
];

/**
 * Validates runtime configuration and environment variables.
 */
import { getEnv } from '../utils/getEnv';

export class ConfigValidator {
    private rules: ConfigRule[];

    constructor(rules?: ConfigRule[]) {
        this.rules = rules ?? DEFAULT_RULES;
    }

    /**
     * Add custom configuration rules.
     */
    addRules(rules: ConfigRule[]): void {
        this.rules.push(...rules);
    }

    /**
     * Validate only critical rules — jika ini gagal, UI memang gak bisa jalan.
     */
    validateCritical(): ConfigValidationResult {
        return this.validate({ onlyCritical: true });
    }

    /**
     * Run validation against current environment variables.
     * Reads from `import.meta.env` (Vite) or `process.env` (Node).
     */
    validate(options?: { onlyCritical?: boolean }): ConfigValidationResult {
        const missing: string[] = [];
        const warnings: string[] = [];
        const values: Record<string, string | undefined> = {};
        const onlyCritical = options?.onlyCritical ?? false;

        for (const rule of this.rules) {
            // Skip non-critical jika hanya butuh validasi critical
            if (onlyCritical && !rule.critical) continue;

            const value = this.getEnv(rule.key);
            values[rule.key] = value;

            // Check required
            if (rule.required !== false && !value) {
                missing.push(`${rule.key} — ${rule.description}`);
                continue;
            }

            // Use default if not set and not required
            if (!value && rule.default) {
                values[rule.key] = rule.default;
                warnings.push(`${rule.key} — using default: ${rule.default}`);
                continue;
            }

            // Pattern validation
            if (value && rule.pattern && !rule.pattern.test(value)) {
                warnings.push(
                    `${rule.key} — format issue: ${rule.patternMessage ?? 'does not match expected pattern'}`
                );
            }
        }

        return {
            valid: missing.length === 0,
            missing,
            warnings,
            values,
        };
    }

    /**
     * Check a single config value.
     */
    checkKey(key: string): { exists: boolean; value: string | undefined } {
        const value = this.getEnv(key);
        return { exists: !!value, value };
    }

    /**
     * Get environment variable from global scope.
     * Works in both Vite (browser with import.meta.env) and Node.js (process.env).
     */
    private getEnv(key: string): string | undefined {
        return getEnv(key);
    }
}

/**
 * Pre-configured singleton validator with default rules.
 */
export const configValidator = new ConfigValidator();