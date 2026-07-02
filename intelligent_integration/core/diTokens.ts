/**
 * @file diTokens.ts
 * @layer core
 * @desc Central registry of DI token strings for type-safe service resolution.
 *       Every service registered in the DI container must have a unique token defined here.
 *
 * @usage
 *   import { TOKENS } from './diTokens';
 *   import { container } from './diContainer';
 *
 *   container.registerSingleton(TOKENS.OpenRouterProvider, () => new OpenRouterProvider());
 *   const provider = container.resolve<OpenRouterProvider>(TOKENS.OpenRouterProvider);
 */

export const TOKENS = {
    // ── Core Providers ──────────────────────────────────────
    OpenRouterProvider: 'core.OpenRouterProvider',

    // ── Services ─────────────────────────────────────────────
    RpcService: 'services.RpcService',
    WebSocketService: 'services.WebSocketService',
    OpenRouterService: 'services.OpenRouterService',
    OpenRouterQueryManager: 'services.OpenRouterQueryManager',
    ArkhamIntelligenceService: 'services.ArkhamIntelligenceService',

    // ── Managers ─────────────────────────────────────────────
    AgentOrchestrator: 'managers.AgentOrchestrator',
    AgentRouter: 'managers.AgentRouter',

    // ── Agents ───────────────────────────────────────────────
    FlowIntelligenceAgent: 'agents.FlowIntelligenceAgent',
    MarketAgent: 'agents.MarketAgent',
    NarrativeAgent: 'agents.NarrativeAgent',
    OnchainAgent: 'agents.OnchainAgent',
    OpportunityAgent: 'agents.OpportunityAgent',
    SmartMoneyAgent: 'agents.SmartMoneyAgent',
    SurvivalAgent: 'agents.SurvivalAgent',

    // ── Utilities ────────────────────────────────────────────
    PromptBuilder: 'utils.PromptBuilder',
    ReportParser: 'utils.ReportParser',

    // ── Infrastructure ───────────────────────────────────────
    CircuitBreaker: 'infra.CircuitBreaker',
    RateLimiter: 'infra.RateLimiter',
    Logger: 'infra.Logger',
    ConfigValidator: 'infra.ConfigValidator',
} as const;

export type Token = (typeof TOKENS)[keyof typeof TOKENS];