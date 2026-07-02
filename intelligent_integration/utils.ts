/**
 * @file intelligent_integration/utils.ts
 * @desc Utility functions for 9Router Intelligence
 */

import { getEnv } from './utils/getEnv';

/**
 * Warn a message with optional context.
 * @param message The message to warn.
 * @param context Optional context to include.
 */
export function warn(message: string, context?: Record<string, unknown>): void {
    console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: 'WARN', message, context }, null, 2));
}

export { getEnv };