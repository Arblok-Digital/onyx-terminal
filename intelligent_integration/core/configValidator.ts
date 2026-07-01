/**
 * @file configValidator.ts
 * @layer core
 * @desc Validates runtime configuration for AI providers and core services.
 *       Ensures required environment variables are present before the app boots.
 *
 * @usage
 *   const validator = new ConfigValidator();
 *   const result = validator.validate();
 *   if (!result.valid) {
 *       console.error('Missing config:', result.missing);
 *       process.exit(1);
 *   }
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
}

export interface ConfigValidationResult {
    valid: boolean;
    missing: string[];
    warnings: string[];
    values: Record<string, string | undefined>;
}

/**
 * Default configuration rules for Onyx Terminal.
 * These are the minimum required variables for the app to function.
 */
const DEFAULT_RULES: ConfigRule[] = [
    // ── AI Providers ──
    {
        key: 'VITE_9ROUTER_API_KEY',
        description: '9Router API Key for AI model routing',
        pattern: /^(sk-or-|9r-|)[a-zA-Z0-9_-]+$/,
        patternMessage: 'Must start with "sk-or-", "9r-", or be a valid API key format',
    },
    {
        key: 'VITE_OPENROUTER_API_KEY',
        description: 'OpenRouter API Key (fallback provider)',
        required: false,
    },
    {
        key: 'VITE_DEFAULT_AI_PROVIDER',
        description: 'Default AI provider (9router or openrouter)',
        required: false,
        default: '9router',
        pattern: /^(9router|openrouter)$/i,
        patternMessage: 'Must be "9router" or "openrouter"',
    },

    // ── Supabase ──
    {
        key: 'VITE_SUPABASE_URL',
        description: 'Supabase project URL',
        pattern: /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/,
        patternMessage: 'Must be a valid Supabase URL (https://*.supabase.co)',
    },
    {
        key: 'VITE_SUPABASE_ANON_KEY',
        description: 'Supabase anonymous API key',
    },

    // ── Solana ──
    {
        key: 'VITE_SOLANA_RPC_URL',
        description: 'Solana RPC endpoint URL',
        required: false,
        default: 'https://api.mainnet-beta.solana.com',
        pattern: /^https?:\/\/.+/,
        patternMessage: 'Must be a valid HTTP/HTTPS URL',
    },
    {
        key: 'VITE_SOLANA_WS_URL',
        description: 'Solana WebSocket endpoint URL',
        required: false,
        default: 'wss://api.mainnet-beta.solana.com',
        pattern: /^wss?:\/\/.+/,
        patternMessage: 'Must be a valid WebSocket URL',
    },

    // ── Jupiter ──
    {
        key: 'VITE_JUPITER_API_URL',
        description: 'Jupiter Aggregator API URL',
        required: false,
        default: 'https://quote-api.jup.ag/v6',
        pattern: /^https?:\/\/.+/,
        patternMessage: 'Must be a valid HTTP/HTTPS URL',
    },
];

/**
 * Validates runtime configuration and environment variables.
 */
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
     * Run validation against current environment variables.
     * Reads from `import.meta.env` (Vite) or `process.env` (Node).
     */
    validate(): ConfigValidationResult {
        const missing: string[] = [];
        const warnings: string[] = [];
        const values: Record<string, string | undefined> = {};

        for (const rule of this.rules) {
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
        try {
            // Vite environment (browser) — accessed via dynamic property to avoid TS errors
            const globalAny = globalThis as Record<string, unknown>;
            const viteImportMeta = (globalAny as { import?: { meta?: Record<string, string> } }).import;
            if (viteImportMeta?.meta) {
                const val = viteImportMeta.meta[key];
                if (val !== undefined) return val;
            }

            // Node.js environment
            const proc = globalAny.process as { env?: Record<string, string | undefined> } | undefined;
            if (proc?.env) {
                const val = proc.env[key];
                if (val !== undefined) return val;
            }

            return undefined;
        } catch {
            // Silently fail — environment might not support any of these
            return undefined;
        }
    }
}

/**
 * Pre-configured singleton validator with default rules.
 */
export const configValidator = new ConfigValidator();