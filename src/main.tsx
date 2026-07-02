import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import React, { useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import App from "./App";
import "./index.css";
import { CONFIG } from "./core/config";
import { configValidator } from "../intelligent_integration/core/configValidator";
import { initializeOrchestrator } from "../intelligent_integration";

// Import CSS untuk Wallet Adapter UI
import '@solana/wallet-adapter-react-ui/styles.css';

// Registrasi Service Worker untuk PWA
registerSW({ immediate: true });

// --- Validasi Konfigurasi ---
const validationResult = configValidator.validate();

const FatalErrorScreen = ({ errors }: { errors: string[] }) => (
  <div style={{
    backgroundColor: '#1a0000',
    color: '#ff8a8a',
    fontFamily: 'monospace',
    padding: '2rem',
    height: '100vh',
    overflowY: 'auto'
  }}>
    <h1 style={{ color: '#ffcdd2' }}>❌ Konfigurasi Error</h1>
    <p>Aplikasi tidak dapat dijalankan karena ada masalah pada file konfigurasi (.env).</p>
    <ul style={{ paddingLeft: '1.5rem', listStyle: 'none' }}>
      {errors.map((error, index) => (
        <li key={index} style={{ marginBottom: '0.75rem', borderLeft: '2px solid #ef5350', paddingLeft: '1rem' }}>
          {error}
        </li>
      ))}
    </ul>
    <p style={{ marginTop: '2rem', color: '#e57373' }}>
      Mohon periksa file `.env` Anda dan pastikan semua variabel yang dibutuhkan sudah terisi dengan benar.
    </p>
  </div>
);


const OrchestratorInit = ({ children }: { children: React.ReactNode }) => {
  const { connection } = useConnection();
  
  useEffect(() => {
    if (connection) {
      try {
        initializeOrchestrator(connection);
        console.log('[main] AgentOrchestrator initialized with connection');
      } catch (err) {
        console.error('[main] Failed to initialize orchestrator:', err);
      }
    }
  }, [connection]);

  return <>{children}</>;
};

const Root = () => {
  const endpoint = useMemo(() => CONFIG.SOLANA_RPC, []);
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <OrchestratorInit>
            <App />
          </OrchestratorInit>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

if (!validationResult.valid) {
  root.render(<FatalErrorScreen errors={validationResult.missing} />);
} else {
  root.render(<Root />);
}