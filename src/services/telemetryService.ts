/**
 * @file telemetryService.ts
 * @desc Client-side telemetry and monitoring reporter.
 *       Tracks app health, agent cycles, API latency, and errors.
 *       Sends periodic health pings to /api/health for status monitoring.
 */

import { Logger } from "../../intelligent_integration/core/logger";
import { createLogger } from "../../intelligent_integration/core/logger";

const logger: Logger = createLogger();

interface TelemetryEvent {
  type: "cycle" | "error" | "api_latency" | "health_check";
  timestamp: number;
  data: Record<string, unknown>;
}

interface HealthSnapshot {
  status: "healthy" | "degraded" | "unhealthy";
  services: Record<string, { status: string; latency: number | null }>;
  timestamp: string;
}

class TelemetryService {
  private events: TelemetryEvent[] = [];
  private healthCache: HealthSnapshot | null = null;
  private lastHealthCheck = 0;
  private readonly HEALTH_INTERVAL = 60_000; // every 60s
  private readonly MAX_EVENTS = 100;

  /** Log an agent cycle completion */
  recordCycle(agentId: string, durationMs: number, success: boolean): void {
    this.addEvent("cycle", { agentId, durationMs, success });
    logger.info(`[Telemetry] Cycle: ${agentId} ${success ? "OK" : "FAIL"} (${durationMs}ms)`);
  }

  /** Log an error event */
  recordError(source: string, error: string): void {
    this.addEvent("error", { source, error });
    logger.warn(`[Telemetry] Error: ${source} — ${error}`);
  }

  /** Log API call latency */
  recordApiLatency(service: string, latencyMs: number): void {
    this.addEvent("api_latency", { service, latencyMs });
  }

  /** Get aggregated metrics */
  getMetrics(): {
    totalCycles: number;
    totalErrors: number;
    successRate: number;
    avgLatencyByService: Record<string, number>;
  } {
    const cycles = this.events.filter((e) => e.type === "cycle");
    const errors = this.events.filter((e) => e.type === "error");
    const latencies = this.events.filter((e) => e.type === "api_latency");

    const successRate = cycles.length > 0
      ? cycles.filter((c) => c.data.success).length / cycles.length
      : 1;

    // Group latencies by service
    const latencyMap: Record<string, number[]> = {};
    for (const evt of latencies) {
      const service = evt.data.service as string;
      const ms = evt.data.latencyMs as number;
      if (!latencyMap[service]) latencyMap[service] = [];
      latencyMap[service].push(ms);
    }
    const avgLatencyByService: Record<string, number> = {};
    for (const [service, vals] of Object.entries(latencyMap)) {
      avgLatencyByService[service] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    return {
      totalCycles: cycles.length,
      totalErrors: errors.length,
      successRate,
      avgLatencyByService,
    };
  }

  /** Check backend health, returns cached result if within interval */
  async checkHealth(): Promise<HealthSnapshot> {
    const now = Date.now();
    if (this.healthCache && now - this.lastHealthCheck < this.HEALTH_INTERVAL) {
      return this.healthCache;
    }

    try {
      const resp = await fetch("/api/health", { signal: AbortSignal.timeout(8_000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: HealthSnapshot & { uptime?: number; environment?: string } = await resp.json();
      this.healthCache = data;
      this.lastHealthCheck = now;
      return data;
    } catch (err) {
      const degraded: HealthSnapshot = {
        status: "unhealthy",
        services: {},
        timestamp: new Date().toISOString(),
      };
      this.healthCache = degraded;
      this.lastHealthCheck = now;
      return degraded;
    }
  }

  /** Get status summary string */
  getStatusString(): string {
    const m = this.getMetrics();
    return `Cycles:${m.totalCycles} | Success:${(m.successRate * 100).toFixed(1)}% | Errors:${m.totalErrors}`;
  }

  private addEvent(type: TelemetryEvent["type"], data: Record<string, unknown>): void {
    this.events.push({ type, timestamp: Date.now(), data });
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }
  }
}

export const telemetryService = new TelemetryService();