/**
 * @file event-bus.ts
 * @layer core
 * @desc Cross-panel pub/sub. SATU-SATUNYA cara panel berkomunikasi satu sama lain.
 *       Jangan pernah prop-drill antar panel.
 * @exposes bus, EventMap
 * @deps mitt
 */
import mitt from "mitt";

export type EventMap = {
  /** User picked a token from any panel — chart should switch to it. */
  "token:select": { address: string; chain: string; symbol?: string };
  /** Open the swap panel pre-filled. */
  "swap:open": { inputMint?: string; outputMint?: string };
  /** Toggle a panel's visibility. */
  "panel:toggle": { id: string };
  /** Notification toast. */
  "notify": { kind: "info" | "success" | "warn" | "error"; message: string };
  /** Latency tick from any feed (ms). */
  "feed:latency": { source: string; ms: number };
  /** Connection state change. */
  "feed:status": { source: string; status: "online" | "degraded" | "offline" };
};

export const bus = mitt<EventMap>();
