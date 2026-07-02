/**
 * Onyx Terminal Global Configuration
 * Centralizing environment variables with fallback logic.
 */

export const NETWORK = import.meta.env.VITE_SOLANA_NETWORK || "mainnet-beta";

export const CONFIG = {
  // Solana & Trading
  JUPITER_REFERRAL_WALLET: import.meta.env.VITE_JUPITER_REFERRAL_WALLET || "5wYwgdRCUDPPtXTrAhPWr7GiqaXHzKWaLPDDj7REtV43",
  JUPITER_FEE_ACCOUNT_USDC: import.meta.env.VITE_JUPITER_FEE_ACCOUNT_USDC || "EHJqU8SEg12muMp1pb6KH4ghn4UB6rA51KYARetKdAgr",
  JUPITER_FEE_ACCOUNT_WSOL: import.meta.env.VITE_JUPITER_FEE_ACCOUNT_WSOL || "7S7KfighhMhasJrVbkk8R3hKjtM73JuVLe92oXGCyNnT",
  
  // API Keys (Helius & Birdeye)
  HELIUS_API_KEY: import.meta.env.VITE_HELIUS_API_KEY || "6aa38557-de0e-43c2-a65c-c7cc113d0e33",
  BIRDEYE_API_KEY: import.meta.env.VITE_BIRDEYE_API_KEY || "",

  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "",

  // API Endpoints
  HELIUS_RPC: (key: string) => `https://mainnet.helius-rpc.com/?api-key=${key}`,
  BIRDEYE_API_URL: "https://public-api.birdeye.so",
  
  // Network-aware RPC endpoint
  SOLANA_RPC: (() => {
    const network = NETWORK;
    const customRpc = import.meta.env.VITE_SOLANA_RPC;
    if (customRpc) return customRpc;
    if (network === "devnet") return "https://api.devnet.solana.com";
    if (network === "testnet") return "https://api.testnet.solana.com";
    const heliusKey = import.meta.env.VITE_HELIUS_API_KEY || "6aa38557-de0e-43c2-a65c-c7cc113d0e33";
    return `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
  })(),
  
  // Feature Flags
  USE_EXTERNAL_RPC: !!import.meta.env.VITE_HELIUS_API_KEY,
  USE_EXTERNAL_CHART: !!import.meta.env.VITE_BIRDEYE_API_KEY,
};

// Log warning jika API key penting belum diisi di .env
if (!CONFIG.HELIUS_API_KEY) console.warn("Onyx: VITE_HELIUS_API_KEY is missing. Using public/fallback RPC.");
if (!CONFIG.SUPABASE_ANON_KEY) console.info("Onyx Analytics: Supabase keys missing. Event logging disabled (401 expected).");