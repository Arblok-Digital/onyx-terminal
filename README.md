# Onyx Terminal — On-Chain Intelligence & Portfolio Terminal

> ⚠️ **Status: Active Development & Debugging**  
> This project is under active development. Features are being stabilized, refactoring is ongoing, and public API documentation is forthcoming.

---

## 📌 About

**Onyx Terminal** is a real-time on-chain crypto analysis dashboard integrating:

- **Solana Program** — Smart contract for token analysis (Anchor / Rust)
- **AI Agents** — Multi-agent intelligence system connected to OpenRouter API (LLMs)
- **On-Chain Data** — Data ingestion from Jupiter, Arkham Intelligence, WebSocket RPC
- **Supabase** — Backend authentication & database

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State Management | Zustand |
| Routing | wouter |
| Charts | Recharts + react-grid-layout |
| API Backend | Express.js (serverless via `api/`) |
| AI Integration | OpenRouter (multi-model) + Inversify DI |
| Blockchain | Solana Web3.js + Anchor (onyx-protocol) |
| Database | Supabase (PostgreSQL) |
| Wallet | Solana Wallet Adapter |

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Type checking
npm run typecheck

# Tests
npm test
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
OPENROUTER_API_KEY=...
```

---

## 🧠 AI Agents System

The project includes an intelligent integration layer (`intelligent_integration/`) with multiple specialized agents:

| Agent | Role |
|-------|------|
| **Market Agent** | Market sentiment & trend analysis |
| **OnChain Agent** | On-chain data analysis (whales, flow) |
| **Narrative Agent** | Dominant narrative identification |
| **Survival Agent** | Early warning & risk detection |
| **Smart Money Agent** | Smart money movement tracking |
| **Opportunity Agent** | Arbitrage & entry opportunity detection |
| **Flow Intelligence Agent** | Cross-chain flow analysis |

All agents are orchestrated by the `AgentOrchestrator` and accessible via the `FloatingChat` UI.

---

## 🔗 Solana Program (onyx-protocol)

The `onyx-protocol/` directory contains an Anchor smart contract with the following instructions:

- `initialize` — Initialize a token analysis account
- `init_token_analysis` — Start tracking a token
- `update_token_analysis` — Update on-chain analysis state
- `close_token_analysis` — Close an analysis account

---

## 🗂️ Project Structure

```
onyx-terminal/
├── src/                        # Main frontend (React + Vite)
│   ├── components/             # UI components
│   ├── core/                   # Supabase, Config
│   ├── feeds/                  # Feed widgets
│   ├── hooks/                  # React hooks
│   ├── lib/                    # IDL, validation, program client
│   ├── pages/                  # Application pages
│   ├── panels/                 # Dashboard panels (Chart, Info, etc.)
│   ├── services/               # Service layer
│   ├── ui/                     # UI primitives (shadcn)
│   └── utils/                  # Utility functions
├── intelligent_integration/    # AI Agent system (TypeScript)
│   ├── agents/                 # Individual AI agents
│   ├── core/                   # DI container, orchestrator, router
│   ├── models/                 # Type definitions
│   ├── services/               # OpenRouter, RPC, Arkham, etc.
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

## 🛠️ Development Status

- [x] Core dashboard layout & panels
- [x] Chart components (Recharts)
- [x] AI Agent orchestration system
- [x] Solana on-chain data fetching
- [x] OpenRouter multi-model integration
- [ ] **AI Agents stabilization** (ongoing debugging)
- [ ] **Refactoring & cleanup** (ongoing)
- [ ] **Unit test coverage** (still minimal)
- [ ] **Error handling & retry logic** (not yet complete)
- [ ] **Public API documentation**
- [ ] **Production deployment**

> **Note:** This project is undergoing heavy debugging to stabilize inter-agent communication, rate limiting, and error recovery.

---

## 📄 License

Private — Arblok Digital