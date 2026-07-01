/**
 * @file intelligent_integration/index.d.ts
 * @desc Type declarations for 9Router Intelligence module
 */

export * from './types/analysisTypes';

export function analyzeToken(tokenAddress: string): Promise<any>;