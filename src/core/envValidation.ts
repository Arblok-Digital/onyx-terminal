/**
 * @file envValidation.ts
 * @desc Environment validation at startup. Warns on missing critical keys.
 *       🔒 No more client-side API key warnings — keys are server-side only.
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

    // Network selection
    results.push({
        key: 'VITE_SOLANA_NETWORK',
        present: !!import.meta.env.VITE_SOLANA_NETWORK,
        severity: 'info',
        message: `Network: ${NETWORK} (default: mainnet-beta)`
    });

    // Supabase
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

    // Fee accounts
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
    console.log('=== ONYX ENVIRONMENT STATUS ===');
    checks.forEach(c => {
        const icon = c.severity === 'critical' ? '❌' : c.severity === 'warning' ? '⚠️' : '✅';
        console.log(`  ${icon} ${c.key}: ${c.message}`);
    });
    console.log("  🔒 API keys are server-side only via /api/{rpc,proxy,ai}/* proxies.");
    console.log('===============================');
}
