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
        enabled: true // Biar bisa ngetest PWA di localhost
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
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: "dist"
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  server: {
    port: DEFAULT_PORT,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: { strict: true },
  },
  preview: {
    port: DEFAULT_PORT,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
