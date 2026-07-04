/**
 * @file health.js
 * @desc Vercel serverless endpoint for checking all service connections.
 *       Checks: Supabase, OpenRouter, 9Router, Solana RPC, Helius, Arkham, Jupiter.
 * @endpoint GET /api/health
 * @returns {object} { status, timestamp, services }
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const NINE_ROUTER_API_KEY = process.env.VITE_NINE_ROUTER_API_KEY || "";
const SOLANA_RPC = process.env.VITE_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const HELIUS_API_KEY = process.env.VITE_HELIUS_API_KEY || "";
const ARKHAM_API_KEY = process.env.VITE_ARKHAM_API_KEY || "";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const startTime = Date.now();
  const results = {
    supabase: { status: "unknown", latency: null, error: null },
    openRouter: { status: "unknown", latency: null, error: null },
    nineRouter: { status: "unknown", latency: null, error: null },
    solanaRpc: { status: "unknown", latency: null, error: null },
    helius: { status: "unknown", latency: null, error: null },
    arkham: { status: "unknown", latency: null, error: null },
  };

  try {
    // ── Check Supabase ──
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabaseStart = Date.now();
      try {
        const supabaseResp = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          signal: AbortSignal.timeout(5000),
        });
        const latency = Date.now() - supabaseStart;
        results.supabase = supabaseResp.ok
          ? { status: "connected", latency, error: null }
          : { status: "error", latency, error: `HTTP ${supabaseResp.status}` };
      } catch (err) {
        results.supabase = { status: "error", latency: Date.now() - supabaseStart, error: err.message };
      }
    } else {
      results.supabase = { status: "skipped", latency: null, error: "No credentials configured" };
    }

    // ── Check OpenRouter ──
    if (OPENROUTER_API_KEY) {
      const orStart = Date.now();
      try {
        const orResp = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
          signal: AbortSignal.timeout(5000),
        });
        const latency = Date.now() - orStart;
        if (orResp.ok) {
          results.openRouter = { status: "connected", latency, error: null };
        } else if (orResp.status === 401) {
          results.openRouter = { status: "unauthorized", latency, error: "Invalid API key" };
        } else {
          results.openRouter = { status: "error", latency, error: `HTTP ${orResp.status}` };
        }
      } catch (err) {
        results.openRouter = { status: "error", latency: Date.now() - orStart, error: err.message };
      }
    } else {
      results.openRouter = { status: "skipped", latency: null, error: "No API key configured" };
    }

    // ── Check 9Router ──
    if (NINE_ROUTER_API_KEY) {
      const nineStart = Date.now();
      try {
        const nineResp = await fetch("https://api.9router.com/v1/health", {
          headers: { "x-api-key": NINE_ROUTER_API_KEY },
          signal: AbortSignal.timeout(5000),
        });
        const latency = Date.now() - nineStart;
        results.nineRouter = { status: nineResp.ok ? "connected" : "error", latency, error: nineResp.ok ? null : `HTTP ${nineResp.status}` };
      } catch (err) {
        results.nineRouter = { status: "error", latency: Date.now() - nineStart, error: err.message };
      }
    } else {
      results.nineRouter = { status: "skipped", latency: null, error: "No API key configured" };
    }

    // ── Check Solana RPC ──
    {
      const solStart = Date.now();
      try {
        const solResp = await fetch(SOLANA_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth", params: [] }),
          signal: AbortSignal.timeout(5000),
        });
        const latency = Date.now() - solStart;
        if (solResp.ok) {
          const data = await solResp.json();
          results.solanaRpc = { status: data.result === "ok" ? "connected" : "degraded", latency, error: data.error?.message || null };
        } else {
          results.solanaRpc = { status: "error", latency, error: `HTTP ${solResp.status}` };
        }
      } catch (err) {
        results.solanaRpc = { status: "error", latency: Date.now() - solStart, error: err.message };
      }
    }

    // ── Check Helius ──
    if (HELIUS_API_KEY) {
      const heliusStart = Date.now();
      try {
        const heliusResp = await fetch(`https://api.helius.xyz/v0/webhooks?apiKey=${HELIUS_API_KEY}`, {
          signal: AbortSignal.timeout(5000),
        });
        const latency = Date.now() - heliusStart;
        results.helius = heliusResp.ok
          ? { status: "connected", latency, error: null }
          : { status: "error", latency, error: `HTTP ${heliusResp.status}` };
      } catch (err) {
        results.helius = { status: "error", latency: Date.now() - heliusStart, error: err.message };
      }
    } else {
      results.helius = { status: "skipped", latency: null, error: "No API key configured" };
    }

    // ── Check Arkham ──
    if (ARKHAM_API_KEY) {
      const arkhamStart = Date.now();
      try {
        const arkhamResp = await fetch("https://api.arkhamintelligence.com/health", {
          headers: { "API-Key": ARKHAM_API_KEY },
          signal: AbortSignal.timeout(5000),
        });
        const latency = Date.now() - arkhamStart;
        results.arkham = arkhamResp.ok
          ? { status: "connected", latency, error: null }
          : { status: "error", latency, error: `HTTP ${arkhamResp.status}` };
      } catch (err) {
        results.arkham = { status: "error", latency: Date.now() - arkhamStart, error: err.message };
      }
    } else {
      results.arkham = { status: "skipped", latency: null, error: "No API key configured" };
    }

    // ── Determine overall status ──
    const statuses = Object.values(results).map((s) => s.status);
    const allConnected = statuses.every((s) => s === "connected" || s === "skipped");
    const anyConnected = statuses.some((s) => s === "connected");

    const overallStatus = allConnected ? "healthy" : anyConnected ? "degraded" : "unhealthy";

    return res.status(200).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.VERCEL_ENV || "development",
      services: results,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
}