# Onyx Terminal — Dual Network Architecture

> **Last Updated:** 2026-07-04
> **Status:** Production + Development Parallel

---

## 🎯 Overview

Onyx Terminal menjalankan **dua jalur paralel** yang terpisah secara arsitektur:

| Layer | Network | Purpose | Status |
|-------|---------|---------|--------|
| **PRODUCTION** | Mainnet | Revenue generation, real transactions | ✅ Active |
| **DEVELOPMENT** | Devnet | Protocol v2 development, testing | 🔄 In Progress |

---

## 📁 Folder Structure

```
onyx-terminal/
├── src/                          # PRODUCTION (Mainnet)
│   ├── panels/
│   │   └── swap/
│   │       └── Swap.tsx          # Swap panel → MAINNET
│   ├── core/
│   │   └── config.ts             # Network config, RPC endpoints
│   ├── services/
│   │   └── onyxOnChainBridge.ts  # Bridge to Onyx Protocol (DEVNET)
│   └── lib/
│       └── onyxProgram.ts        # Program IDL & connection
│
├── onyx-protocol/                # DEVELOPMENT (Devnet)
│   ├── programs/
│   │   └── onyx-protocol/        # Anchor smart contract
│   │       ├── src/
│   │       │   ├── lib.rs        # Program entrypoint
│   │       │   ├── state.rs      # Account structs
│   │       │   ├── instructions/ # Instruction handlers
│   │       │   └── constants.rs  # Program constants
│   │       └── Cargo.toml
│   ├── tests/
│   │   └── onyx-protocol.ts      # Integration tests
│   ├── Anchor.toml               # Devnet config
│   └── migrations/               # SQL migrations
│
├── api/                          # Serverless API (Vercel)
│   └── jup/
│       ├── quote.js              # Jupiter quote proxy
│       └── swap.js               # Jupiter swap proxy + fee injection
│
├── intelligent_integration/      # AI Agents (Network-agnostic)
│   ├── agents/
│   ├── core/
│   └── services/
│
├── .env                          # Environment variables
├── vite.config.ts                # CSP, PWA, build config
└── ONYX_ARCHITECTURE.md          # ← This file
```

---

## 🔌 Network Configuration

### Production Layer (Mainnet)

**Purpose:** Revenue generation melalui swap fee

**RPC Endpoint:**
```typescript
CONFIG.MAINNET_RPC  // Swap panel uses this
```

**Fallback Chain:**
1. `VITE_MAINNET_RPC` (custom RPC jika ada)
2. `https://mainnet.helius-rpc.com/?api-key=HELIUS_KEY`
3. `https://api.mainnet-beta.solana.com` (public, rate-limited)

**Fee Injection:**
- Fee Account WSOL: `7S7KfighhMhasJrVbkk8R3hKjtM73JuVLe92oXGCyNnT`
- Fee Account USDC: `EHJqU8SEg12muMp1pb6KH4ghn4UB6rA51KYARetKdAgr`
- Fee Rate: 50 bps (0.5%)

**Route:**
- Direct pool routing via Jupiter API
- PumpFun/Raydium/Meteora/Orca
- Fee otomatis masuk ke ATA treasury

### Development Layer (Devnet)

**Purpose:** Onyx Protocol v2 development

**RPC Endpoint:**
```typescript
CONFIG.DEVNET_RPC  // Protocol uses this
```

**Fallback Chain:**
1. `VITE_DEVNET_RPC` (custom devnet RPC)
2. `https://devnet.helius-rpc.com/?api-key=HELIUS_KEY`
3. `https://api.devnet.solana.com` (public)

**Program ID:**
```
FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG
```

**Deployment Info:**
- Network: Devnet
- Slot: 473370054
- Last deployed: 2026-07-02

---

## 🔑 Environment Variables

```env
# === NETWORK SELECTION ===
VITE_SOLANA_NETWORK=mainnet-beta

# === PRODUCTION (Mainnet) ===
VITE_SOLANA_RPC=https://api.mainnet-beta.solana.com
# VITE_MAINNET_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# === DEVELOPMENT (Devnet) ===
VITE_DEVNET_RPC=https://api.devnet.solana.com
VITE_ONYX_PROGRAM_ID=FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG

# === FEE ACCOUNTS (Mainnet) ===
VITE_JUPITER_FEE_ACCOUNT_WSOL=7S7KfighhMhasJrVbkk8R3hKjtM73JuVLe92oXGCyNnT
VITE_JUPITER_FEE_ACCOUNT_USDC=EHJqU8SEg12muMp1pb6KH4ghn4UB6rA51KYARetKdAgr

# === API KEYS ===
VITE_HELIUS_API_KEY=        # Optional, improves RPC reliability
VITE_BIRDEYE_API_KEY=       # Optional, for chart data
```

---

## 🔄 Development Workflow

### Phase 1: Production (Current)
- [x] Swap panel live di mainnet
- [x] Fee injection via Jupiter API
- [x] Direct pool routing
- [ ] Collect revenue → modal cukup untuk mainnet deployment

### Phase 2: Protocol v2 (Devnet)
- [ ] FeeConfig PDA implementation
- [ ] Treasury PDA for fee collection
- [ ] Instruction-based fee logic
- [ ] Comprehensive testing
- [ ] Security audit

### Phase 3: Migration
- [ ] Deploy Onyx Protocol ke mainnet
- [ ] Migrate fee logic dari Jupiter ke Onyx Protocol
- [ ] Full independence dari Jupiter fee system

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         ONYX TERMINAL                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐     ┌──────────────────────┐         │
│  │   PRODUCTION LAYER   │     │  DEVELOPMENT LAYER   │         │
│  │      (MAINNET)       │     │      (DEVNET)        │         │
│  ├──────────────────────┤     ├──────────────────────┤         │
│  │                      │     │                      │         │
│  │  ┌────────────────┐  │     │  ┌────────────────┐  │         │
│  │  │  Swap Panel    │  │     │  │ Onyx Protocol  │  │         │
│  │  │  (Swap.tsx)    │  │     │  │    v2 (Rust)   │  │         │
│  │  └───────┬────────┘  │     │  └───────┬────────┘  │         │
│  │          │           │     │          │           │         │
│  │          ▼           │     │          ▼           │         │
│  │  ┌────────────────┐  │     │  ┌────────────────┐  │         │
│  │  │ Jupiter API    │  │     │  │ FeeConfig PDA  │  │         │
│  │  │ + Fee Injection│  │     │  │ Treasury PDA   │  │         │
│  │  └───────┬────────┘  │     │  └───────┬────────┘  │         │
│  │          │           │     │          │           │         │
│  │          ▼           │     │          ▼           │         │
│  │  ┌────────────────┐  │     │  ┌────────────────┐  │         │
│  │  │  Fee Accounts  │  │     │  │  Local Tests   │  │         │
│  │  │  (WSOL/USDC)   │  │     │  │  Integration   │  │         │
│  │  └───────┬────────┘  │     │  └────────────────┘  │         │
│  │          │           │     │                      │         │
│  │          ▼           │     │                      │         │
│  │  💰 REVENUE 💰       │     │  🧪 TESTING 🧪       │         │
│  │                      │     │                      │         │
│  └──────────────────────┘     └──────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Important Notes untuk AI Agents

1. **JANGAN MODIFIED PRODUCTION CODE untuk devnet testing**
   - Swap panel (`src/panels/swap/`) SELALU mainnet
   - Protocol development di `onyx-protocol/` folder

2. **Network Selection via Config**
   - `CONFIG.MAINNET_RPC` untuk swap/transaksi real
   - `CONFIG.DEVNET_RPC` untuk protocol development

3. **Fee Logic**
   - Production: Fee injection via Jupiter API (`api/jup/swap.js`)
   - Development: On-chain fee via Onyx Protocol (coming soon)

4. **Testing Protocol**
   - Selalu test di devnet sebelum mainnet
   - Airdrop rate-limited, butuh waktu 8 jam untuk refill

---

## 🚀 Quick Start

```bash
# Development (mainnet swap + devnet protocol)
npm run dev

# Build production
npm run build

# Test protocol (devnet)
cd onyx-protocol
anchor test
```

---

## 📞 Contact & Resources

- **Repository:** https://github.com/Arblok-Digital/onyx-terminal
- **Helius RPC:** https://helius.dev
- **Jupiter API:** https://quote-api.jup.ag/v6
- **Anchor Docs:** https://www.anchor-lang.com

---

*Document ini harus di-update setiap ada perubahan arsitektur signifikan.*