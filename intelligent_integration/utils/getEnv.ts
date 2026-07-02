/**
 * @file getEnv.ts
 * @layer utils
 * @desc Utility to safely access environment variables in both Vite (browser) and Node.js environments.
 */

/**
 * Get environment variable from global scope.
 * Works in both Vite (browser with import.meta.env) and Node.js (process.env).
 * @param key The environment variable key.
 * @param defaultValue A default value to return if the key is not found.
 * @returns The value of the environment variable or the default value.
 */
export function getEnv(key: string, defaultValue: string = ''): string {
    try {
        // Vite environment (browser) — accessed via dynamic property to avoid TS errors
        const globalAny = globalThis as Record<string, unknown>;
        
        // Check for import.meta.env (Vite)
        // @ts-ignore - a way to check for vite env
        if (typeof import.meta !== 'undefined' && import.meta.env) {
             // @ts-ignore
            const val = import.meta.env[key];
            if (val !== undefined && val !== null) return String(val);
        }

        // Node.js environment
        const proc = globalAny.process as { env?: Record<string, string | undefined> } | undefined;
        if (proc?.env) {
            const val = proc.env[key];
            if (val !== undefined) return val;
        }

        return defaultValue;
    } catch {
        // Silently fail — environment might not support any of these
        return defaultValue;
    }
}