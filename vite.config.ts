import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
const DEFAULT_PORT = 5173;

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    // runtimeErrorOverlay() removed as it's a Replit-specific plugin
    VitePWA({
      injectRegister: 'auto',
      devOptions: {
        enabled: true, // Biar bisa ngetest PWA di localhost
      },
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/api/, /^\/__/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.dexscreener\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "dexscreener-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 5 },
            },
          },
          {
            urlPattern:
              /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      manifest: {
        id: "onyx-terminal",
        name: "Onyx Terminal",
        short_name: "Onyx",
        description:
          "Bloomberg-grade crypto/DEX trading terminal. See everything. Miss nothing.",
        theme_color: "#0a0a0b",
        background_color: "#0a0a0b",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        categories: ["finance", "productivity"],
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  define: {
    global: "globalThis",
    "process.env": "{}",
    "Buffer": "globalThis.Buffer",
  },
    resolve: {
      alias: {
        "buffer": "buffer",
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
        "@intelligent_integration": path.resolve(import.meta.dirname, "intelligent_integration"),
      },
      dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: "dist",
    target: "esnext"
  },
  optimizeDeps: {
    esbuildOptions: {
        define: {
            global: 'globalThis',
            Buffer: 'globalThis.Buffer',
        },
    },
    include: ['react', 'react-dom', 'bn.js', 'buffer']
  },
  server: {
    port: DEFAULT_PORT,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: { strict: true },
    headers: {
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.walletconnect.com https://*.solflare.com https://*.phantom.app",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https://*.dexscreener.com https://arweave.net https://*.arweave.net https://img-v2.galxy.io",
        "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
        "connect-src 'self' http://localhost:3001 ws://localhost:3001 https://api.dexscreener.com https://quote-api.jup.ag https://api.jup.ag https://*.supabase.co wss://*.supabase.co https://openrouter.ai https://api.9router.com https://api.mainnet-beta.solana.com https://api.devnet.solana.com https://api.testnet.solana.com https://*.solana.com wss://*.solana.com wss://api.devnet.solana.com https://fonts.googleapis.com wss://fonts.googleapis.com",
        "frame-src 'self' https://*.walletconnect.com https://*.solflare.com https://*.phantom.app https://www.geckoterminal.com",
        "manifest-src 'self'",
        "worker-src 'self' blob:",
      ].join("; "),
    },
  },
  preview: {
    port: DEFAULT_PORT,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});