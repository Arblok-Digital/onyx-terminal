# Onyx Terminal — On-Chain Intelligence & Portfolio Terminal

> ⚠️ **Status: Active Development & Debugging**  
> Proyek ini masih dalam tahap pengembangan intensif. Banyak fitur yang belum stabil, refactoring masih berjalan, dan dokumentasi API akan menyusul.

---

## 📌 Tentang Project

**Onyx Terminal** adalah dashboard real-time untuk analisis on-chain kripto yang terintegrasi dengan:

- **Solana Program** — Smart contract untuk token analysis (Anchor / Rust)
- **AI Agents** — Multi-agent intelligence system yang terhubung ke OpenRouter API (LLMs)
- **On-Chain Data** — Pull data dari Jupiter, Arkham Intelligence, WebSocket RPC
- **Supabase** — Backend auth & database

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State | Zustand |
| Routing | wouter |
| Charts | Recharts + react-grid-layout |
| Backend (API) | Express.js (serverless via `api/`) |
| AI Integration | OpenRouter (multi-model) + Inversify DI |
| Blockchain | Solana Web3.js + Anchor (onyx-protocol) |
| Database | Supabase (PostgreSQL) |
| Wallet | Solana Wallet Adapter |

---

## 🚀 Cara Menjalankan

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build production
npm run build

# Type checking
npm run typecheck

# Tests
npm test
```

### Environment Variables

Copy `.env.example` ke `.env` dan isi:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
OPENROUTER_API_KEY=...
```

---

## 🧠 AI Agents System

Proyek ini memiliki intelligent integration layer (`intelligent_integration/`) dengan beberapa agen:

| Agent | Fungsi |
|-------|--------|
| **Market Agent** | Analisis sentimen & trend pasar |
| **OnChain Agent** | Analisis data on-chain (whales, flow) |
| **Narrative Agent** | Identifikasi narasi dominan |
| **Survival Agent** | Early warning & risk detection |
| **Smart Money Agent** | Track smart money movement |
| **Opportunity Agent** | Deteksi peluang arbitrase / entry |
| **Flow Intelligence Agent** | Cross-chain flow analysis |

Semua agen di-orchestrate oleh `AgentOrchestrator` dan bisa dipanggil via `FloatingChat` UI.

---

## 🔗 Solana Program (onyx-protocol)

Folder `onyx-protocol/` berisi smart contract Anchor untuk:

- `initialize` — Init token analysis account
- `init_token_analysis` — Start tracking token
- `update_token_analysis` — Update on-chain analysis state
- `close_token_analysis` — Close analysis account

---

## 🗂️ Struktur Folder

```
onyx-terminal/
├── src/                        # Frontend utama (React + Vite)
│   ├── components/             # UI components
│   ├── core/                   # Supabase, Config
│   ├── feeds/                  # Feed widgets
│   ├── hooks/                  # React hooks
│   ├── lib/                    # IDL, validasi, program client
│   ├── pages/                  # Halaman aplikasi
│   ├── panels/                 # Dashboard panels (Chart, Info, dll)
│   ├── services/               # Service layer
│   ├── ui/                     # UI primitives (shadcn)
│   └── utils/                  # Utility functions
├── intelligent_integration/    # AI Agent system (TypeScript)
│   ├── agents/                 # Individual AI agents
│   ├── core/                   # DI container, orchestrator, router
│   ├── models/                 # Type definitions
│   ├── services/               # OpenRouter, RPC, Arkham, dll
│   ├── tests/                  # Unit tests & mocks
│   ├── types/                  # Shared types
│   └── utils/                  # Helper functions
├── onyx-protocol/              # Solana Anchor program (Rust)
├── api/                        # Edge functions / serverless
├── scripts/                    # Dev & debug scripts
├── public/                     # Static assets
└── deploy.yml                  # CI/CD
```

---

## 🛠️ Status Pengembangan

- [x] Core dashboard layout & panels
- [x] Chart components (Recharts)
- [x] AI Agent orchestration system
- [x] Solana on-chain data fetching
- [x] OpenRouter multi-model integration
- [ ] **Stabilisasi AI Agents** (ongoing debugging)
- [ ] **Refactoring & cleanup** (ongoing)
- [ ] **Unit test coverage** (masih minim)
- [ ] **Error handling & retry logic** (belum sempurna)
- [ ] **Dokumentasi API publik**
- [ ] **Deployment production**

> **Catatan:** Proyek ini sedang dalam proses debugging berat untuk menstabilkan komunikasi antar-agent, rate limiting, dan error recovery. Jika ada issue atau pertanyaan, silakan buka GitHub Issues.

---

## 📄 Lisensi

Private — Arblok Digital