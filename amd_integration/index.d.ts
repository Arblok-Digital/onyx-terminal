/**
 * @file amd_integration/index.d.ts
 * @desc Type declarations for AMD Integration module
 */

export * from './types/analysisTypes';

export function analyzeToken(tokenAddress: string): Promise<any>;