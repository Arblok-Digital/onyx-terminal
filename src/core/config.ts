/**
 * Onyx Terminal Global Configuration
 * Centralizing environment variables with fallback logic.
 * 
 * DUAL NETWORK ARCHITECTURE:
 * - Swap Panel: MAINNET (real transactions, fee revenue)
 * - Onyx Protocol: DEVNET (development, testing)
 * 
 * 🔒 SECURITY: All API keys are now server-side only.
 *   RPC calls go through /api/rpc proxy.
 *   Birdeye calls go through /api/proxy/birdeye proxy.
 *   AI calls go through /api/ai/agent proxy.
 */

// Primary network for UI display and swap panel
export const NETWORK = import.meta.env.VITE_SOLANA_NETWORK || "mainnet-beta";

export const CONFIG = {
  // Solana & Trading
  JUPITER_REFERRAL_WALLET: import.meta.env.VITE_JUPITER_REFERRAL_WALLET || "5wYwgdRCUDPPtXTrAhPWr7GiqaXHzKWaLPDDj7REtV43",
  JUPITER_FEE_ACCOUNT_USDC: import.meta.env.VITE_JUPITER_FEE_ACCOUNT_USDC || "EHJqU8SEg12muMp1pb6KH4ghn4UB6rA51KYARetKdAgr",
  JUPITER_FEE_ACCOUNT_WSOL: import.meta.env.VITE_JUPITER_FEE_ACCOUNT_WSOL || "7S7KfighhMhasJrVbkk8R3hKjtM73JuVLe92oXGCyNnT",
  
  // Supabase (public anon key is safe for client-side)
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "",

  // API Endpoints — all keys stay on server, we use proxy URLs
  RPC_PROXY: "/api/rpc",
  BIRDEYE_PROXY: "/api/proxy/birdeye",
  AI_AGENT_PROXY: "/api/ai/agent",

  // === DUAL RPC ENDPOINTS ===
  // Client-side gets public RPC only. For Helius-backed RPC, use /api/rpc proxy.
  MAINNET_RPC: "https://api.mainnet-beta.solana.com",
  DEVNET_RPC: (() => {
    const custom = import.meta.env.VITE_DEVNET_RPC;
    return custom || "https://api.devnet.solana.com";
  })(),

  // Legacy: backward-compatible RPC for wallet adapter
  SOLANA_RPC: (() => {
    const customRpc = import.meta.env.VITE_SOLANA_RPC;
    if (customRpc) return customRpc;
    return "https://api.mainnet-beta.solana.com";
  })(),

  // Feature Flags
  USE_EXTERNAL_RPC: false,
  USE_EXTERNAL_CHART: false,

  // Onyx Protocol Config (always devnet for now)
  ONYX_PROGRAM_ID: import.meta.env.VITE_ONYX_PROGRAM_ID || "FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG",
  ONYX_NETWORK: "devnet" as const,
};

// Log warning — no more env key warnings since they're server-side now
console.info("Onyx: API keys are server-side only via /api/{rpc,proxy,ai}/* proxies.");
