/**
 * @file intelligent_integration/utils.ts
 * @desc Utility functions for 9Router Intelligence
 */

export function getEnv(key: string, defaultValue: string = ''): string {
    // Browser environment (Vite)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key] || defaultValue;
    }
    // Node.js environment
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || defaultValue;
    }
    return defaultValue;
}