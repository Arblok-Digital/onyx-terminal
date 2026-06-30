/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_TITLE: string;
    readonly VITE_HELIUS_API_KEY: string;
    readonly VITE_BIRDEYE_API_KEY: string;
    readonly VITE_OPENROUTER_ENDPOINT: string;
    readonly VITE_OPENROUTER_API_KEY: string;
    readonly VITE_OPENROUTER_ENABLED: string;
    // Add other environment variables here
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}