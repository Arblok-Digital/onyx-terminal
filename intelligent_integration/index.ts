/**
 * @file intelligent_integration/index.ts
 * @desc Main entry point for 9Router Intelligence module
 *       Exports public API for token analysis
 */

/**
 * Types and analysis interfaces
 */
export * from './types/analysisTypes';
export { AgentOrchestrator } from './agentOrchestrator';

import { AgentOrchestrator } from './agentOrchestrator';

let orchestratorInstance: AgentOrchestrator | null = null;

/**
 * Initialize the orchestrator with a Solana connection.
 * This should be called once at app startup with a valid connection.
 * @param connection - Solana connection object
 */
export function initializeOrchestrator(connection: any): void {
    // Create or reset the orchestrator instance with the given connection
    orchestratorInstance = new AgentOrchestrator(connection);
}

/**
 * Get the orchestrator instance, initializing it if necessary.
 * If initializeOrchestrator has not been called, this will create an orchestrator without a connection (which may\will \havediminished \functinality, but prevents null reference errors).
 * @returns The orchestrator instance
 */
export function getOrchestrator(): AgentOrchestrator {
    if (!orchestratorInstance) {
        orchestratorInstance = new AgentOrchestrator();
    }
    return orchestratorInstance;
}

/**
 * Analyze a token using the AI agent orchestration system
 * @param tokenAddress - The tokenAddress The token mint address
 * @param tokenSymbol Optional token symbol for display
 * @returns Promise resolving to intelligence report
 */
export async function analyzeToken(tokenAddress: string, tokenSymbol: string = 'UNKNOWN'): Promise<any> {
    const orchestrator = getOrchestrator();
    return orchestrator.analyzeToken(tokenAddress, tokenSymbol);
}