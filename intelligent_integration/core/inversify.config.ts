/**
 * @file inversify.config.ts
 * @layer core
 * @desc InversifyJS container configuration for the intelligent integration module.
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { TOKENS } from './diTokens';

// ── Core ────────────────────────────────────────────────────────────────
import { Logger, ConsoleLogger } from './logger';
import { ConfigValidator } from './configValidator';
import { CircuitBreaker } from './circuitBreaker';
import { RateLimiter } from './rateLimiter';

// ── Services ────────────────────────────────────────────────────────────
import { OpenRouterResearchManager } from '../services/openRouterService';
import { OpenRouterQueryManager } from '../services/openRouterService/queryModel';
import { ArkhamIntelligenceService } from '../services/arkhamIntelligenceService';
import { WebsocketService } from '../services/websocketService';

// ── Managers ────────────────────────────────────────────────────────────
import { AgentRouter } from './agentRouter';
import { ResearchManager } from '../researchManager';
import { AgentOrchestrator } from '../agentOrchestrator';

// ── Agents ──────────────────────────────────────────────────────────────
import { MarketAgent } from '../agents/marketAgent';
import { OnchainAgent } from '../agents/onchainAgent';
import { NarrativeAgent } from '../agents/narrativeAgent';
import { OpportunityAgent } from '../agents/opportunityAgent';
import { SmartMoneyAgent } from '../agents/smartMoneyAgent';
import { SurvivalAgent } from '../agents/survivalAgent';
import { FlowIntelligenceAgent } from '../agents/flowIntelligenceAgent';

// ── Utils ───────────────────────────────────────────────────────────────
import { ReportParser } from '../reportParser';
import { PromptBuilder } from '../promptBuilders';

const container = new Container({
    defaultScope: 'Singleton',
});

// ── Infrastructure ──────────────────────────────────────────────────────
container.bind<Logger>(TOKENS.Logger).to(ConsoleLogger);
container.bind<ConfigValidator>(TOKENS.ConfigValidator).to(ConfigValidator);
container.bind<CircuitBreaker>(TOKENS.CircuitBreaker).to(CircuitBreaker);
container.bind<RateLimiter>(TOKENS.RateLimiter).to(RateLimiter);

// ── Services ────────────────────────────────────────────────────────────
container.bind<OpenRouterResearchManager>(TOKENS.OpenRouterService).to(OpenRouterResearchManager);
container.bind<OpenRouterQueryManager>(TOKENS.OpenRouterQueryManager).to(OpenRouterQueryManager);
container.bind<ArkhamIntelligenceService>(TOKENS.ArkhamIntelligenceService).to(ArkhamIntelligenceService);
container.bind<WebsocketService>(TOKENS.WebSocketService).to(WebsocketService);

// ── Managers ────────────────────────────────────────────────────────────
container.bind<AgentRouter>(TOKENS.AgentRouter).to(AgentRouter);
container.bind<ResearchManager>(TOKENS.ResearchManager).to(ResearchManager);
container.bind<AgentOrchestrator>(TOKENS.AgentOrchestrator).to(AgentOrchestrator);

// ── Agents ──────────────────────────────────────────────────────────────
container.bind<MarketAgent>(TOKENS.MarketAgent).to(MarketAgent);
container.bind<OnchainAgent>(TOKENS.OnchainAgent).to(OnchainAgent);
container.bind<NarrativeAgent>(TOKENS.NarrativeAgent).to(NarrativeAgent);
container.bind<OpportunityAgent>(TOKENS.OpportunityAgent).to(OpportunityAgent);
container.bind<SmartMoneyAgent>(TOKENS.SmartMoneyAgent).to(SmartMoneyAgent);
container.bind<SurvivalAgent>(TOKENS.SurvivalAgent).to(SurvivalAgent);
container.bind<FlowIntelligenceAgent>(TOKENS.FlowIntelligenceAgent).to(FlowIntelligenceAgent);

// ── Utils ───────────────────────────────────────────────────────────────
container.bind<ReportParser>(TOKENS.ReportParser).to(ReportParser);
container.bind<PromptBuilder>(TOKENS.PromptBuilder).to(PromptBuilder);

export { container };