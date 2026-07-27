/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JUPITER_REFERRAL_WALLET: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_JUPITER_FEE_ACCOUNT_USDC: string
  readonly VITE_JUPITER_FEE_ACCOUNT_WSOL: string
  readonly VITE_JUP_PROXY_URL: string
  readonly VITE_AI_GATEWAY_URL: string
  readonly VITE_AI_GATEWAY_KEY: string
  readonly VITE_AI_MODEL: string
  readonly VITE_SOLANA_NETWORK: string
  readonly VITE_SOLANA_RPC: string
  readonly VITE_DEVNET_RPC: string
  readonly VITE_ONYX_PROGRAM_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
