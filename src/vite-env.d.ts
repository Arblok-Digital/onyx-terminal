/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JUPITER_REFERRAL_WALLET: string
  readonly VITE_HELIUS_API_KEY: string
  readonly VITE_BIRDEYE_API_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_JUPITER_FEE_ACCOUNT_USDC: string
  readonly VITE_JUPITER_FEE_ACCOUNT_WSOL: string
  readonly VITE_JUP_PROXY_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}