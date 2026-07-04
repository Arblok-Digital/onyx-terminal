
/**
 * Onyx Terminal Global Configuration
 * Centralizing environment variables with fallback logic.
 * 
 * DUAL NETWORK ARCHITECTURE:
 * - Swap Panel: MAINNET (real transactions, fee revenue)
 * - Onyx Protocol: DEVNET (development, testing)
 */

// Primary network for UI display and swap panel
export const NETWORK = import.meta.env.VITE_SOLANA_NETWORK || "mainnet-beta";

// Extract env vars once to avoid circular reference
const _heliusKey = import.meta.env.VITE_HELIUS_API_KEY || "";
const _birdeyeKey = import.meta.env.VITE_BIRDEYE_API_KEY || "";
const _mainnetRpc = import.meta.env.VITE_MAINNET_RPC || "";
const _devnetRpc = import.meta.env.VITE_DEVNET_RPC || "https://api.devnet.solana.com";

export const CONFIG = {
  // Solana & Trading
  JUPITER_REFERRAL_WALLET: import.meta.env.VITE_JUPITER_REFERRAL_WALLET || "5wYwgdRCUDPPtXTrAhPWr7GiqaXHzKWaLPDDj7REtV43",
  JUPITER_FEE_ACCOUNT_USDC: import.meta.env.VITE_JUPITER_FEE_ACCOUNT_USDC || "EHJqU8SEg12muMp1pb6KH4ghn4UB6rA51KYARetKdAgr",
  JUPITER_FEE_ACCOUNT_WSOL: import.meta.env.VITE_JUPITER_FEE_ACCOUNT_WSOL || "7S7KfighhMhasJrVbkk8R3hKjtM73JuVLe92oXGCyNnT",
  
  // API Keys (Helius & Birdeye) - NEVER hardcode fallback values, only use .env
  HELIUS_API_KEY: _heliusKey,
  BIRDEYE_API_KEY: _birdeyeKey,

  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "",

  // API Endpoints - Network-aware, no hardcoded production keys
  HELIUS_RPC: (key: string) => key 
    ? (NETWORK === "devnet" 
        ? `https://devnet.helius-rpc.com/?api-key=${key}`
        : `https://mainnet.helius-rpc.com/?api-key=${key}`)
    : undefined,
  BIRDEYE_API_URL: "https://public-api.birdeye.so",
  
  // === DUAL RPC ENDPOINTS ===
  
  // Mainnet RPC for Swap Panel (real transactions, fee revenue)
  // Priority: VITE_MAINNET_RPC > Helius with API key > Public RPC
  MAINNET_RPC: (() => {
    if (_mainnetRpc) return _mainnetRpc;
    if (_heliusKey) return `https://mainnet.helius-rpc.com/?api-key=${_heliusKey}`;
    return "https://api.mainnet-beta.solana.com";
  })(),
  
  // Devnet RPC for Onyx Protocol (development, testing)
  // Priority: VITE_DEVNET_RPC > Helius devnet > Public devnet
  DEVNET_RPC: (() => {
    if (_devnetRpc && _devnetRpc !== "https://api.devnet.solana.com") return _devnetRpc;
    if (_heliusKey) return `https://devnet.helius-rpc.com/?api-key=${_heliusKey}`;
    return "https://api.devnet.solana.com";
  })(),
  
  // Legacy: Network-aware RPC endpoint (for backward compatibility)
  // Use MAINNET_RPC or DEVNET_RPC explicitly instead
  SOLANA_RPC: (() => {
    const customRpc = import.meta.env.VITE_SOLANA_RPC;
    if (customRpc) return customRpc;
    // Default to mainnet for swap panel
    return _heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${_heliusKey}` : "https://api.mainnet-beta.solana.com";
  })(),
  
  // Feature Flags
  USE_EXTERNAL_RPC: !!_heliusKey,
  USE_EXTERNAL_CHART: !!_birdeyeKey,
  
  // Onyx Protocol Config (always devnet for now)
  ONYX_PROGRAM_ID: import.meta.env.VITE_ONYX_PROGRAM_ID || "FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG",
  ONYX_NETWORK: "devnet" as const, // Protocol always on devnet during development
};

// Log warning jika API key penting belum diisi di .env
if (!CONFIG.HELIUS_API_KEY) console.warn("Onyx: VITE_HELIUS_API_KEY is missing. Using public/fallback RPC.");
if (!CONFIG.SUPABASE_ANON_KEY) console.info("Onyx Analytics: Supabase keys missing. Event logging disabled (401 expected).");
