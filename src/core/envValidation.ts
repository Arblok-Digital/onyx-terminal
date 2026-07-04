/**
 * @file envValidation.ts
 * @desc Environment validation at startup. Warns on missing critical keys.
 * @layer core
 */

import { NETWORK, CONFIG } from './config';

export interface EnvCheckResult {
    key: string;
    present: boolean;
    severity: 'critical' | 'warning' | 'info';
    message: string;
}

export function validateEnvironment(): EnvCheckResult[] {
    const results: EnvCheckResult[] = [];

    // Critical: Solana Program / On-chain
    results.push({
        key: 'VITE_SOLANA_NETWORK',
        present: !!import.meta.env.VITE_SOLANA_NETWORK,
        severity: 'info',
        message: `Network: ${NETWORK} (default: mainnet-beta)`
    });

    // Critical: Helius API key for RPC
    results.push({
        key: 'VITE_HELIUS_API_KEY',
        present: !!CONFIG.HELIUS_API_KEY,
        severity: CONFIG.HELIUS_API_KEY ? 'info' : 'warning',
        message: CONFIG.HELIUS_API_KEY
            ? 'Helius RPC available'
            : 'Missing VITE_HELIUS_API_KEY. Using public Solana RPC (rate limited).'
    });

    // Critical: OpenRouter AI
    results.push({
        key: 'VITE_OPENROUTER_API_KEY',
        present: !!import.meta.env.VITE_OPENROUTER_API_KEY,
        severity: import.meta.env.VITE_OPENROUTER_API_KEY ? 'info' : 'warning',
        message: import.meta.env.VITE_OPENROUTER_API_KEY
            ? 'OpenRouter AI available'
            : 'Missing VITE_OPENROUTER_API_KEY. AI features disabled.'
    });

    // Important: Supabase
    results.push({
        key: 'VITE_SUPABASE_URL',
        present: !!CONFIG.SUPABASE_URL,
        severity: CONFIG.SUPABASE_URL ? 'info' : 'info',
        message: CONFIG.SUPABASE_URL
            ? 'Supabase configured'
            : 'Supabase not configured (analytics disabled)'
    });

    results.push({
        key: 'VITE_SUPABASE_ANON_KEY',
        present: !!CONFIG.SUPABASE_ANON_KEY,
        severity: CONFIG.SUPABASE_ANON_KEY ? 'info' : 'info',
        message: CONFIG.SUPABASE_ANON_KEY
            ? 'Supabase anon key present'
            : 'Supabase anon key missing (analytics disabled)'
    });

    // Optional: Birdeye
    results.push({
        key: 'VITE_BIRDEYE_API_KEY',
        present: !!CONFIG.BIRDEYE_API_KEY,
        severity: CONFIG.BIRDEYE_API_KEY ? 'info' : 'info',
        message: CONFIG.BIRDEYE_API_KEY
            ? 'Birdeye API available'
            : 'Birdeye not configured (chart features limited)'
    });

    // Optional: Jupiter referral
    results.push({
        key: 'VITE_JUPITER_REFERRAL_WALLET',
        present: !!import.meta.env.VITE_JUPITER_REFERRAL_WALLET,
        severity: 'info',
        message: import.meta.env.VITE_JUPITER_REFERRAL_WALLET
            ? 'Jupiter referral configured'
            : 'Using default Jupiter fee accounts'
    });

    return results;
}

export function logEnvStatus(): void {
    const checks = validateEnvironment();
    const critical = checks.filter(c => c.severity === 'critical');
    const warnings = checks.filter(c => c.severity === 'warning');

    console.log('=== ONYX ENVIRONMENT STATUS ===');
    checks.forEach(c => {
        const icon = c.severity === 'critical' ? '❌' : c.severity === 'warning' ? '⚠️' : '✅';
        console.log(`  ${icon} ${c.key}: ${c.message}`);
    });
    console.log('===============================');

    if (critical.length > 0) {
        console.error(`[Onyx] ${critical.length} critical env issues found!`);
    }
    if (warnings.length > 0) {
        console.warn(`[Onyx] ${warnings.length} non-critical env vars missing.`);
    }
}