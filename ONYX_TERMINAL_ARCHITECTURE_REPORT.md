# ONYX TERMINAL — Arsitektur & Pipeline Report

**Dibuat:** 26 Juni 2026  
**Versi Kode:** Latest (Commit `21d8f4b3`)  
**Author:** Cline AI Analysis

---

## 📋 Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Arsitektur Frontend (React/Vite)](#2-arsitektur-frontend-reactvite)
   - 2.1 Layering & Dependency Direction
   - 2.2 Panel System
   - 2.3 Event Bus (Pub/Sub)
   - 2.4 State Management (Zustand)
   - 2.5 UI Components
3. [Pipeline Data](#3-pipeline-data)
   - 3.1 DexScreener Feed
   - 3.2 Jupiter WebSocket Feed
   - 3.3 Jupiter Proxy (Express Middleware)
   - 3.4 Helius RPC Service
   - 3.5 Birdeye API
   - 3.6 Rate Limiter
4. [AMD Intelligence Module](#4-amd-intelligence-module)
   - 4.1 Agent Orchestrator
   - 4.2 AI Agents
   - 4.3 AMD AI Service & Router
   - 4.4 Analysis Types
5. [Onyx Protocol (Solana Smart Contract)](#5-onyx-protocol-solana-smart-contract)
   - 5.1 Anchor Program
   - 5.2 State & Instructions
   - 5.3 TypeScript SDK
6. [Backend & Deployment](#6-backend--deployment)
   - 6.1 Supabase
   - 6.2 API Routes
   - 6.3 Vercel Deployment
   - 6.4 CI/CD Pipeline
7. [Konfigurasi & Build](#7-konfigurasi--build)
8. [Diagram Aliran Data](#8-diagram-aliran-data)

---

## 1. Ringkasan Eksekutif

**Onyx Terminal** adalah terminal trading crypto multi-chain berbasis web dengan fokus utama **Solana** (dan support Ethereum, Base, Arbitrum, BSC, Polygon). Aplikasi ini menggabungkan:

- **Frontend React + Vite + TypeScript** — arsitektur panel modular (mirip Bloomberg Terminal)
- **Multi-Agent AI Intelligence System** — 7 agen AI untuk analisis token real-time (Flow, Onchain, Market, Opportunity, Narrative, Smart Money, Survival)
- **Solana Smart Contract (Anchor)** — program on-chain untuk fitur protocol terdesentralisasi
- **Jupiter DEX Aggregation** — proxy untuk routing swap, price fetching via WebSocket
- **Supabase Backend** — database analytics & user data
- **PWA Support** — bisa diinstall sebagai mobile app

**Tech Stack Utama:**
| Layer | Teknologi |
|-------|-----------|
| UI Framework | React 18 + TypeScript |
| Bundler | Vite 5 |
| Styling | Tailwind CSS + CSS Modules |
| State | Zustand 5 |
| Event Bus | Mitt |
| Layout | React-Grid-Layout |
| Chart | TradingView (Embed) + Recharts |
| Smart Contract | Anchor (Rust) |
| AI | AMD Cloud AI |
| Data Feeds | DexScreener, Jupiter, Birdeye, CoinGecko, Helius |
| Backend | Supabase (PostgreSQL) |
| Deployment | Vercel + GitHub Actions |

---

## 2. Arsitektur Frontend (React/Vite)

### 2.1 Layering & Dependency Direction

Proyek ini mengikuti **struktur layer ketat** dengan arah dependensi satu arah:

```
feeds/       (lapisan data ingestion)  → hanya import core/
    ↓
core/        (state management, event-bus, rate-limiter)  → tidak import panel/hooks/ui
    ↓
hooks/       (React bridge layer)  → import core/
    ↓
panels/      (komponen UI)  → import core/, hooks/
    ↓
ui/          (komponen layout global)  → import panels/, hooks/, core/
```

**Aturan Dependency:**
- `feeds/` → DILARANG import dari `panels/`, `hooks/`, `ui/`
- `core/` → DILARANG import dari `panels/`, `hooks/`, `ui/`
- `panels/` → BOLEH import dari `core/`, `hooks/`
- `ui/` → BOLEH import dari mana saja (top-level)

### 2.2 Panel System

Terminal terdiri dari **6 panel draggable/resizable** menggunakan `react-grid-layout`:

| Panel ID | File | Fungsi |
|----------|------|--------|
| `watchlist` | `src/panels/watchlist/Watchlist.tsx` | Daftar token yang dipantau + search/scan |
| `chart` | `src/panels/chart/Chart.tsx` | TradingView chart + Intelligence tabs |
| `info` | `src/panels/info/Info.tsx` | Detail token (price, liquidity, socials) |
| `swap` | `src/panels/swap/Swap.tsx` | Swap/trading interface via Jupiter |
| `discover` | `src/panels/discover/Discover.tsx` | Token discovery & scanner |
| `flow-monitor` | `src/panels/flow-monitor/FlowMonitor.tsx` | Flow analysis & market activity |

**Layout disimpan** di `useLayoutStore` (Zustand) dengan persist ke localStorage. User bisa drag/resize panel, dan reset layout ke default.

**Mobile Support:** Di layar < 768px, layout berubah menjadi tab-based (MARKET | TRADE | FLOW) dengan bottom navigation bar.

### 2.3 Event Bus (Pub/Sub)

**File:** `src/core/event-bus.ts`  
**Library:** `mitt` (tiny event emitter)

**Events yang terdefinisi:**
| Event | Payload | Tujuan |
|-------|---------|--------|
| `token:select` | `{address, chain, symbol}` | User pilih token → Chart, Info, Swap ganti |
| `swap:open` | `{inputMint?, outputMint?}` | Buka panel Swap dengan token terisi |
| `panel:toggle` | `{id}` | Show/hide panel tertentu |
| `notify` | `{kind, message}` | Toast notification |
| `feed:latency` | `{source, ms}` | Update latency di StatusBar |
| `feed:status` | `{source, status}` | Update koneksi status |

**Pola:** Event bus adalah SATU-SATUNYA cara panel berkomunikasi. Tidak ada prop-drill antar panel.

### 2.4 State Management (Zustand)

**Empat store utama:**

| Store | File | Fungsi |
|-------|------|--------|
| `usePriceStore` | `src/core/store/price.store.ts` | Harga token + metadata realtime (TokenSnapshot) |
| `useUIStore` | `src/core/store/ui.store.ts` | UI state: activeToken, theme, dll |
| `useLayoutStore` | `src/core/store/layout.store.ts` | Layout panel positions (persist localStorage) |
| `useWatchlistStore` | `src/panels/watchlist/watchlist.store.ts` | Daftar watchlist user (persist localStorage) |

**TokenSnapshot (normalized data shape):**
```typescript
{
  address, chain, symbol, name, iconUrl,
  pairAddress, dexId,
  priceUsd, priceChange5m/1h/6h/24h,
  volume5m/1h/6h/24h,
  txns5m/1h/6h/24h (buys/sells),
  liquidity, fdv, marketCap,
  pairCreatedAt, links, updatedAt
}
```

### 2.5 UI Components

**`Ticker.tsx`** — Header bar horizontal dengan:
- Logo Onyx + indikator live
- Search bar (di mobile condensed)
- Active token price ticker (auto-scroll)
- Watchlist token prices (marquee scroll)

**`StatusBar.tsx`** — Footer bar dengan:
- Feed status indicators (online/degraded/offline via `feed:status`)
- Latency per feed (via `feed:latency`)
- Active token info
- Clock

**`Terminal.tsx`** — Root layout yang menggabungkan:
- Ticker (top) + GridLayout (middle) + StatusBar (bottom)
- Logic subscription ke DexScreener feed
- Auto-select first watchlist token
- Mobile vs Desktop layout switching

---

## 3. Pipeline Data

### 3.1 DexScreener Feed

**File:** `src/feeds/dexscreener.ts`

Primary price feed — **gratis, tanpa API key**, rate limit 300 req/min.

**Cara kerja:**
1. Ambil daftar address dari watchlist + market index mints
2. Batch dalam chunks 10 address (karena batasan 30 pair per response)
3. Fetch ke `https://api.dexscreener.com/latest/dex/tokens/...`
4. Normalisasi response ke format `TokenSnapshot[]`
5. Push ke `usePriceStore.upsertMany()`
6. Emit `feed:latency` ke event bus
7. Polling setiap 10-30 detik (adaptive tergantung jumlah token)

**Proses batch khusus:** Address di-sortir ascending (lexical) dulu, lalu dibagi per 10. Ini penting karena DexScreener hanya return max 30 pair — dengan batch per 10, token kecil tidak tenggelam oleh token besar yang punya banyak pair.

### 3.2 Jupiter WebSocket Feed

**File:** `feed/jup-ws.ts` / `src/feeds/jupiter.ts`

**Fungsi:** Koneksi WebSocket real-time ke server proxy Jupiter untuk:
- Price updates streaming
- Swap quotes & routing
- Token metadata

### 3.3 Jupiter Proxy (Express Middleware)

**File:** `jup-proxy.js`

**Fungsi:** Express server yang berjalan sebagai proxy/helper:
- CORS handling untuk Jupiter API calls
- Rate limiting
- Logging & monitoring
- Fallback routing

**Dijalankan via:** `run_jup_proxy.bat`

### 3.4 Helius RPC Service

**File:** `amd_integration/services/rpcService.ts`

**Fungsi:** Service untuk query data on-chain Solana via Helius API:
- Transaction history
- Token balances
- Whale activity tracking
- Developer wallet analysis

### 3.5 Birdeye API

**Fungsi:** Data market tambahan:
- Token price history
- Market cap
- Holder distribution

### 3.6 Rate Limiter

**File:** `src/core/rate-limiter.ts`

**Fungsi:** Queue-based rate limiter untuk semua HTTP calls:
- Schedule requests dengan delay
- Adaptive interval
- Retry logic
- Burst handling

**Semua feed WAJIB menggunakan rate limiter ini — aturan ketat di feeds layer.**

---

## 4. AMD Intelligence Module

**Folder:** `amd_integration/`  
Ini adalah **modul AI intelligence** yang menganalisis token menggunakan multi-agent system.

### 4.1 Agent Orchestrator

**File:** `amd_integration/agentOrchestrator.ts`

**Cara kerja:**
1. **Check cache** — 1 jam TTL per token
2. **Parallel Phase 1 (Core Agents):** Jalankan 3 agen secara paralel:
   - FlowIntelligenceAgent → FlowAnalysis
   - OnchainAgent → OnchainAnalysis
   - MarketAgent → MarketAnalysis
3. **Parallel Phase 2 (Dependent Agents):** Jalankan 4 agen dengan hasil dari Phase 1:
   - OpportunityAgent → EarlyOpportunityAnalysis
   - NarrativeAgent → NarrativeAnalysis
   - SmartMoneyAgent → SmartMoneyAnalysis
   - SurvivalAgent → SurvivalAnalysis
4. **Synthesis:** AMDResearchManager.generateIntelligenceReport() → IntelligenceReport final
5. **Cache** report

### 4.2 AI Agents (7 Agen)

| Agent | File | Input | Output |
|-------|------|-------|--------|
| **FlowIntelligenceAgent** | `agents/flowIntelligenceAgent.ts` | tokenAddress, duration | Flow patterns, buy/sell pressure, whale activity |
| **OnchainAgent** | `agents/onchainAgent.ts` | tokenAddress | Whale activity, holder growth, dev activity, rug pull indicators |
| **MarketAgent** | `agents/marketAgent.ts` | tokenAddress | Price trend, volume, liquidity, sentiment |
| **OpportunityAgent** | `agents/opportunityAgent.ts` | + Flow, Onchain, Market | Early Opportunity Index (0-100) |
| **NarrativeAgent** | `agents/narrativeAgent.ts` | + Onchain, Market | Narrative classification + strength |
| **SmartMoneyAgent** | `agents/smartMoneyAgent.ts` | + Onchain, Flow | Smart money score, whale win rates |
| **SurvivalAgent** | `agents/survivalAgent.ts` | + Onchain, Market, Flow | Survival probability, estimated lifespan |

### 4.3 AMD AI Service & Router

**AMDResearchManager** (`services/amdAIService.ts`):
- Generate final intelligence report dari semua analisis agent
- Synthesize insights, risk assessment, opportunity assessment
- Pattern detection & recommendation

**AgentRouter** (`core/agentRouter.ts`):
- Routing decision ke model AI yang tepat
- Fallback handling
- Confidence scoring

### 4.4 Analysis Types

**File:** `amd_integration/types/analysisTypes.ts`

**Key types:**
- `FlowAnalysis` — Flow patterns + realtime buy/sell pressure
- `OnchainAnalysis` — Whale, holder, dev activity, rug pull score
- `MarketAnalysis` — Price trend, volume, sentiment, volatility
- `EarlyOpportunityAnalysis` — Early Opportunity Index (0-100) + rating
- `NarrativeAnalysis` — Narrative classification + strength
- `SmartMoneyAnalysis` — Smart whale tracking + win rate
- `SurvivalAnalysis` — Survival probability + estimated lifespan
- `IntelligenceReport` — Complete report dengan semua analisis + ranking
- `IntelligenceRanking` — Composite score (0-100) + rating (AVOID → STRONG OPPORTUNITY)
- `AttentionVelocityAnalysis` — Social + volume velocity
- `ConvictionScoreAnalysis` — Smart money vs retail conviction
- `SignalConsensusResult` — Conflicting signals resolution

**Intelligence Report di Frontend:**
- Ditampilkan di `IntelligenceReportView.tsx` dalam Chart panel
- Tab "Intelligence" menampilkan: mentions, sentiment, holder analysis, bundler detection, snipers

---

## 5. Onyx Protocol (Solana Smart Contract)

### 5.1 Anchor Program

**Location:** `onyx-protocol/programs/onyx-protocol/src/`

**Program ID:** `4ERj5qStaTQtvjC8Ae4pbmS4aJ7GNoJA6NUwPgCszNxV`

**Entry Point:** `lib.rs`
- Anchor framework program dengan satu instruction `initialize`

**Modul:**
| Modul | File | Fungsi |
|-------|------|--------|
| `constants` | `constants.rs` | Konstanta protocol (seeds, bump, dll) |
| `error` | `error.rs` | Custom error codes |
| `instructions` | `instructions/mod.rs` | Instruction handlers (initialize) |
| `state` | `state/mod.rs` | Account structs (state on-chain) |

### 5.2 State & Instructions

**Initialize:** Instruction untuk setup awal protocol:
- Membuat state account
- Inisialisasi parameter protocol

### 5.3 TypeScript SDK

**Location:** `onyx-protocol/app/`

SDK untuk interaksi frontend dengan smart contract:
- `IDL` (Interface Definition Language) — Anchor-generated
- Client utilities untuk call instructions
- Type definitions untuk state accounts

---

## 6. Backend & Deployment

### 6.1 Supabase (PostgreSQL)

**File:** `supabase_setup.sql`

Database schema untuk:
- User profiles
- Analytics data
- Token tracking history
- User preferences

**Tables:**
- `users` — User accounts + wallet connections
- `watchlists` — Saved token watchlists per user
- `transactions` — Swap history
- `analytics` — Market analytics data
- `intelligence_reports` — Cached AI analysis reports

### 6.2 API Routes

**Folder:** `api/`

**`api/jup/` — Jupiter API routes:**
- Proxy endpoints untuk Jupiter DEX aggregation
- Quote fetching
- Swap routing
- Token list management

### 6.3 Vercel Deployment

**File:** `vercel.json`

Konfigurasi:
- Build command: `vite build`
- Output directory: `dist`
- Rewrites untuk SPA routing
- Environment variables injection

### 6.4 CI/CD Pipeline

**File:** `deploy.yml` (GitHub Actions)

Workflow:
1. Trigger: push ke branch `main`
2. Setup: Node.js, Rust (untuk Anchor)
3. Test: TypeScript type checking, unit tests
4. Build: Vite build
5. Deploy: Vercel deployment
6. (Optional) Anchor program deploy ke devnet/testnet

---

## 7. Konfigurasi & Build

### Build Tools
| Tool | File | Versi |
|------|------|-------|
| Vite | `vite.config.ts` | ^5.0.0 |
| TypeScript | `tsconfig.json` | ~5.4 |
| Tailwind | `tailwind.config.js` | ^3.4.4 |
| PWA | `vite-plugin-pwa` | ^0.20.0 |

### Key Dependencies
- **Solana:** `@solana/web3.js`, `@solana/spl-token`, `@solana/wallet-adapter-*`
- **UI:** `framer-motion`, `lucide-react`, `react-grid-layout`, `recharts`
- **Data:** `axios`, `reconnecting-websocket`, `zustand`
- **Utility:** `clsx`, `class-variance-authority`, `tailwind-merge`, `zod`

### PWA
- Service worker via Workbox
- Cache strategy untuk static assets
- Install prompt
- Offline fallback

---

## 8. Diagram Aliran Data

```
┌─────────────────────────────────────────────────────────────┐
│                      BROWSER (PWA)                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    UI LAYER                           │  │
│  │  ┌─────────┐ ┌───────┐ ┌────┐ ┌──────┐ ┌─────────┐  │  │
│  │  │Watchlist│ │ Chart │ │Info│ │ Swap │ │ Discover │  │  │
│  │  └────┬────┘ └───┬───┘ └─┬──┘ └──┬───┘ └────┬────┘  │  │
│  │       │          │        │       │          │        │  │
│  │       └──────────┼────────┼───────┼──────────┘        │  │
│  │                  │   EVENT BUS (mitt)                  │  │
│  │  ┌───────────────┴────────┴──────────┐                │  │
│  │  │         ZUSTAND STORES            │                │  │
│  │  │  PriceStore │ UIStore │ Layout    │                │  │
│  │  └───────────────┬───────────────────┘                │  │
│  └──────────────────┼────────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────┼────────────────────────────────────┐  │
│  │          FEED LAYER                                   │  │
│  │  ┌──────────────┐ ┌──────────┐ ┌───────────────────┐  │  │
│  │  │ DexScreener  │ │ Jupiter  │ │ AMD Intelligence  │  │  │
│  │  │ (REST Poll)  │ │ (WS/API) │ │ (7 AI Agents)    │  │  │
│  │  └──────┬───────┘ └────┬─────┘ └────────┬──────────┘  │  │
│  │         │              │                 │             │  │
│  │    ┌────┴──────────────┴─────────────────┴───┐        │  │
│  │    │          RATE LIMITER                   │        │  │
│  │    └─────────────────────────────────────────┘        │  │
│  └──────────────────┬────────────────────────────────────┘  │
│                     │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
    ┌─────────────────┼──────────────────┐
    │                 │                   │
┌───┴───────┐  ┌──────┴──────┐  ┌───────┴────────┐
│DexScreener│  │Jupiter API  │  │ Helius/Birdeye │
│ API       │  │ + WebSocket │  │ + CoinGecko    │
└───────────┘  └─────────────┘  └────────────────┘

    ┌─────────────────────────────────────────────┐
    │           SOLANA BLOCKCHAIN                  │
    │  ┌───────────────────────────────────────┐  │
    │  │     Onyx Protocol (Anchor)            │  │
    │  │  Program ID: 4ERj5qStaTQtvjC8Ae4...  │  │
    │  └───────────────────────────────────────┘  │
    └─────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────┐
    │              SUPABASE (PostgreSQL)           │
    │  Users │ Watchlists │ Analytics │ Reports    │
    └─────────────────────────────────────────────┘
```

---

## Ringkasan Key Points

1. **Arsitektur sangat terstruktur** dengan layer separation yang ketat — feeds → core → hooks → panels → ui
2. **Event-driven** — panel berkomunikasi via event bus (mitt), bukan prop-drill
3. **Multi-agent AI system** — 7 agen berjalan dalam 2 fase (parallel + dependent) untuk menghasilkan intelligence report komprehensif
4. **Modular panel system** — 6 panel yang bisa di-drag, di-resize, dan di-rearrange
5. **Multi-chain support** — Solana utama + Ethereum, Base, Arbitrum, BSC, Polygon via DexScreener
6. **PWA-enabled** — bisa diinstall sebagai mobile app dengan bottom tab navigation
7. **Smart contract on Solana** — Onyx Protocol (Anchor/Rust) dengan SDK TypeScript
8. **Data pipeline** — DexScreener (primary price feed) + Jupiter (swap/proxy) + Helius/Birdeye (on-chain)
9. **AMD Cloud AI** — backend AI untuk analisis token menggunakan routing end-point
10. **Deployment** — Vercel + GitHub Actions + Supabase

---

*End of Report*