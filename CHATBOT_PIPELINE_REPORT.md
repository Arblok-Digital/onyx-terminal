# Onyx Terminal — Chatbot Pipeline & Logic Report

**Date:** 29 Juni 2026  
**Author:** Onyx Engineering  
**Version:** 1.0

---

## 1. Arsitektur Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                        │
│  ┌─────────────┐   ┌────────────────┐   ┌─────────────────────────┐  │
│  │ FloatingChat │──▶│ DashboardData   │──▶│ AMD Intelligence Agents │  │
│  │ (UI Chat)    │   │ Service         │   │ (Market, Narrative,     │  │
│  │              │   │ (Context Builder)│   │  SmartMoney, dll.)     │  │
│  └─────────────┘   └────────────────┘   └─────────────────────────┘  │
│         │                                                            │
│         ▼                                                            │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │              AI Backend Router (auto-detect)                │      │
│  │                                                             │      │
│  │  1️⃣ 9Router Gateway (Primary)     2️⃣ OpenRouter (Fallback) │      │
│  │     http://localhost:20128/v1          https://openrouter.ai │      │
│  │     Model: "arblok" (custom)          Model: gpt-3.5-turbo  │      │
│  └────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pipeline Detail (User → Response)

### Step 1: User Input
- **File:** `src/components/chat/FloatingChat.tsx`
- User mengetik di chat bubble → `handleSend()` dipanggil
- Input diseleksi: kalau kosong atau masih loading, skip

### Step 2: Intent Detection (NLP-lite)
- **File:** `FloatingChat.tsx` — fungsi `detectIntent()`
- Keyword-based scoring, **bukan neural network**
- Message dilowercase, tiap keyword di-score berdasarkan panjang karakter match
- Intent yang terdeteksi:

| Intent | Trigger Keywords | Fungsi |
|--------|-----------------|--------|
| `rug` | rug, scam, aman, bahaya, risk | Rug check & safety assessment |
| `whale` | whale, smart money, insider | Smart money detection |
| `flow` | flow, momentum, volume, pump, dump | Momentum analysis |
| `narrative` | narrative, hype, news, berita, katalis | Social/narrative analysis |
| `opportunity` | opportunity, early, gem, alpha, peluang | Opportunity scoring |
| `market` | market, price, harga, trend, marketcap | Market overview |
| `summary` | analysis, analisis, report, gimana, laporan | Full analysis report |
| `general` | (default jika tidak match) | General Q&A |

### Step 3: Dashboard Context Building
- **File:** `src/services/dashboardDataService.ts` — fungsi `getDashboardData()`
- Ambil data real-time dari **Price Store** (state management)
- Data diambil: price, volume, liquidity, market cap, txns, buy/sell pressure
- Format jadi natural language lewat `formatDashboardContext()` — output seperti:
  ```
  === DATA DASHBOARD ONYX untuk TOKEN ===
  Token: MyToken (MTK)
  Address: 0x123...
  Chain: SOLANA
  
  --- MARKET OVERVIEW ---
  Price: $0.00000123
  24h Change: +45.67%
  Volume 24h: $123.45K
  ...
  ```
- Kalau gagal ambil data → fallback message "Data tidak tersedia"

### Step 4: System Prompt Construction
- System prompt berisi:
  - **Identity:** "Kamu adalah ONYX AI Assistant"
  - **Capabilities:** analisis market, rug check, smart money, momentum
  - **Data context:** dashboard data real-time (jika ada)
  - **Instructions:** jawab dalam Bahasa Indonesia, pakai emoji, detail
  - **Warning behavior:** kalau ada rug risk tinggi, kasih tau jelas

### Step 5: AI Backend Selection
- **File:** `FloatingChat.tsx` — fungsi `getAIConfig()`
- Prioritas auto-detect:
  1. **9Router Gateway** (jika `VITE_AI_GATEWAY_URL` + `VITE_AI_GATEWAY_KEY` ada)
     - URL: `http://localhost:20128/v1` → append `/chat/completions`
     - Model: `"arblok"` (custom)
  2. **OpenRouter** (jika `VITE_OPENROUTER_ENDPOINT` + key + enabled)
     - URL: `https://openrouter.ai/api/v1/chat/completions`
     - Model: `"openai/gpt-3.5-turbo"`
  3. **Gagal** → throw error `AI_NOT_CONFIGURED`

### Step 6: API Call
- Method: `POST`
- Headers: `Authorization: Bearer <key>`, `Content-Type: application/json`
- Body: `{ model, messages (system + history + user), max_tokens: 1000, temperature: 0.4, stream: false }`
- Messages: system prompt → last 6 history messages → user message
- **Tidak streaming** — response synchronous

### Step 7: Response Handling
- Parse JSON → `result.choices[0].message.content`
- Jika kosong → error "AI returned empty response"
- Jika sukses → render chat bubble dengan teks
- Jika error → tampilkan pesan error spesifik (konfigurasi, API, timeout)

---

## 3. AMD Intelligence Integration (Deep Pipeline)

Untuk analisis mendalam (rug check, smart money, dll.), Onyx juga punya **layer agent**:

```
User Request (Intent: "rug check")
        │
        ▼
   FloatingChat
        │
        ▼
   getDashboardContext()
        │
        ▼
   analyzeToken(tokenAddress)     ← dari @amd_integration
        │
        ▼
   Agent Orchestrator             ← agentOrchestrator.ts
        │
        ├── marketAgent.ts        → Market analysis
        ├── narrativeAgent.ts     → Social sentiment
        ├── smartMoneyAgent.ts    → Whale tracking
        ├── survivalAgent.ts      → Rug pull detection
        ├── flowIntelligenceAgent.ts → Momentum
        └── opportunityAgent.ts   → Opportunity scoring
        │
        ▼
   OpenRouterProvider             ← openRouterProvider.ts
        ├── chat()                → Primary model
        └── chatWithFallback()    → Fallback on failure
        │
        ▼
   Model (per task):
     - report:      deepseek-r1:free / llama-3.3-70b
     - attention:   mistral-7b:free / llama-3.1-8b
     - conviction:  qwen-2.5-7b:free / llama-3.1-8b
     - general:     llama-3.3-70b / mistral-7b
        │
        ▼
   Intelligence Report (structured JSON)
        │
        ▼
   Formatted in Dashboard Data → dikirim ke FloatingChat
```

---

## 4. File-by-File Breakdown

| File | Role |
|------|------|
| `src/components/chat/FloatingChat.tsx` | UI chat, intent detection, API call orchestration |
| `src/services/dashboardDataService.ts` | Ambil data real-time dari store & format context |
| `amd_integration/core/agentRouter.ts` | Route intent ke agent spesifik |
| `amd_integration/agentOrchestrator.ts` | Orchestrate multiple agents for full analysis |
| `amd_integration/agents/marketAgent.ts` | Market analysis agent |
| `amd_integration/agents/narrativeAgent.ts` | Narrative/social sentiment agent |
| `amd_integration/agents/smartMoneyAgent.ts` | Whale/smart money detection |
| `amd_integration/agents/survivalAgent.ts` | Rug pull risk assessment |
| `amd_integration/agents/flowIntelligenceAgent.ts` | Momentum & flow analysis |
| `amd_integration/agents/opportunityAgent.ts` | Opportunity scoring |
| `amd_integration/agents/onchainAgent.ts` | On-chain data analysis |
| `amd_integration/core/openRouterProvider.ts` | OpenAI-compatible API provider with fallback |
| `amd_integration/models/openRouterModels.ts` | Model configs per task type |
| `jup-proxy.js` | Jupiter swap proxy (port 3001) |

---

## 5. Data Flow Diagram (Simplified)

```
┌──────┐    ┌──────────┐    ┌─────────────┐    ┌──────────────┐
│ User │───▶│ Floating │───▶│ Dashboard   │───▶│ AI Backend   │
│ Type │    │ Chat     │    │ Data Service │   │ (9Router/OR) │
└──────┘    └──────────┘    └─────────────┘    └──────┬───────┘
       ▲                                               │
       │                                               ▼
       │                                    ┌──────────────────┐
       └────────────────────────────────────│ LLM Model        │
           Streaming Response               │ (arblok / GPT)   │
                                            └──────────────────┘
```

---

## 6. Current Status & Known Issues

### ✅ Working
- UI chat (FloatingChat) — render, input, quick prompts ✅
- Intent detection (keyword-based) ✅
- Dashboard data building (getDashboardContext) ✅
- OpenRouter fallback provider ✅
- AMD Intelligence agents ✅

### ❌ Issues
1. **9Router Gateway (Primary AI) DOWN**
   - `http://localhost:20128/v1` — tidak bisa diakses
   - Model `"arblok"` tidak dikenal oleh 9Router → AI return empty response
2. **Jupiter Proxy (port 3001) DOWN**
   - `http://localhost:3001/api/jup/test` — not running
   - Swap & quote functionality tidak bisa digunakan
3. **No streaming** — response synchronous, user nunggu full response
4. **No WebSocket** — REST only, no real-time token streaming

---

## 7. Cara Memperbaiki (Quick Fixes)

### Fix 9Router:
```bash
# Cek apakah 9Router berjalan
curl http://localhost:20128/v1/models

# Kalau tidak jalan, pastikan docker/process 9Router aktif
# Atau fallback ke OpenRouter yang sudah dikonfigurasi
# Di .env: pastikan VITE_OPENROUTER_ENABLED=true
```

### Fix Jupiter Proxy:
```bash
# Jalankan Jupiter proxy
node jup-proxy.js
# Atau double-click run_jup_proxy.bat
```

---

## 8. Summary

Onyx Terminal chatbot adalah **chat assistant berbasis intent detection dan dashboard data integration**. Pipeline-nya:

1. User bertanya → intent di-detect via keyword matching
2. Dashboard data real-time diambil sebagai context
3. System prompt + data dikirim ke AI backend (9Router priority, OpenRouter fallback)
4. AI merespons dengan analisis berdasarkan data real-time
5. Response ditampilkan di chat bubble

**Inti logic:** bukan chatbot biasa — dia **context-aware** dengan data market real-time, dan bisa trigger **deep analysis pipeline** (AMD Intelligence agents) untuk analisis lebih lanjut seperti rug check, smart money detection, dan momentum analysis.