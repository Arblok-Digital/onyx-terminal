import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import App from "./App";
import "./index.css";
import { CONFIG } from "./core/config"; // Asumsi CONFIG ada di sini atau bisa diimpor

// Import CSS untuk Wallet Adapter UI (opsional, tapi direkomendasikan)
import '@solana/wallet-adapter-react-ui/styles.css';

// Registrasi Service Worker untuk PWA
registerSW({ immediate: true });

const Root = () => {
  const endpoint = useMemo(() => CONFIG.HELIUS_RPC(CONFIG.HELIUS_API_KEY), []); // Gunakan RPC Helius lu
  const wallets = useMemo(() => [], []); // Biarkan kosong, wallet standard otomatis terdeteksi

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider> {/* Ini untuk UI modal Connect Wallet */}
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
