/**
 * Onyx Terminal Global Configuration
 * Centralizing environment variables with fallback logic.
 */

export const CONFIG = {
  // Solana & Trading
  JUPITER_REFERRAL_WALLET: import.meta.env.VITE_JUPITER_REFERRAL_WALLET || "5wYwgdRCUDPPtXTrAhPWr7GiqaXHzKWaLPDDj7REtV43",
  
  // API Keys (Helius & Birdeye)
  HELIUS_API_KEY: import.meta.env.VITE_HELIUS_API_KEY || "6aa38557-de0e-43c2-a65c-c7cc113d0e33",
  BIRDEYE_API_KEY: import.meta.env.VITE_BIRDEYE_API_KEY || "",

  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "",

  // API Endpoints
  HELIUS_RPC: (key: string) => `https://mainnet.helius-rpc.com/?api-key=${key}`,
  BIRDEYE_API_URL: "https://public-api.birdeye.so",
  
  // Feature Flags
  USE_EXTERNAL_RPC: !!import.meta.env.VITE_HELIUS_API_KEY,
  USE_EXTERNAL_CHART: !!import.meta.env.VITE_BIRDEYE_API_KEY,
};

// Log warning jika API key penting belum diisi di .env
if (!CONFIG.HELIUS_API_KEY) console.warn("Onyx: VITE_HELIUS_API_KEY is missing. Using public/fallback RPC.");