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
  readonly VITE_AI_GATEWAY_URL: string
  readonly VITE_AI_GATEWAY_KEY: string
  readonly VITE_AI_MODEL: string
  readonly VITE_AMD_API_KEY: string
  readonly VITE_AMD_LLAMA_ENDPOINT: string
  readonly VITE_AMD_MISTRAL_ENDPOINT: string
  readonly VITE_OPENROUTER_API_KEY: string
  readonly VITE_OPENROUTER_ENABLED: string
  readonly VITE_OPENROUTER_ENDPOINT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}