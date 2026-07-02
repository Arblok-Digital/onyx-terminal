# ONYX TERMINAL — DATA FLOW WORKFLOW

**Last Updated:** 2026-07-02  
**Purpose:** Panduan lengkap untuk integrasi On-Chain → AI Intelligence → Frontend

---

## 🔄 COMPLETE DATA PIPELINE

### 1. USER SELECTS TOKEN
Event: `token:select` emitted via event bus
```
Watchlist.tsx → bus.emit('token:select', {address, chain, symbol})
```

### 2. FRONTEND REQUESTS ANALYSIS
```
Chart.tsx (useEffect) → analyzeToken(tokenAddress)
```

### 3. ORCHESTRATOR COORDINATES AGENTS
```
intelligent_integration/index.ts:analyzeToken()
  └→ AgentOrchestrator.analyzeToken()
       ├→ PHASE 1 (Parallel):
       │   ├→ FlowIntelligenceAgent.analyzeToken() → Jupiter WS data
       │   ├→ OnchainAgent.analyzeToken() 
       │   │   ├→ TRY: OnyxOnChainService.fetchTokenAnalysis()
       │   │   │      └→ OnyxOnChainBridge.loadAnalysis()
       │   │   │             └→ OnyxProgramClient.getTokenAnalysis()
       │   │   │                    └→ [SOLANA RPC] Read on-chain PDA
       │   │   └→ FALLBACK: RPC service (Helius)
       │   └→ MarketAgent.analyzeToken() → DexScreener + Birdeye APIs
       │
       └→ PHASE 2 (Dependent):
           ├→ OpportunityAgent (needs Flow + Onchain + Market)
           ├→ NarrativeAgent (needs Onchain + Market)
           ├→ SmartMoneyAgent (needs Onchain + Flow)
           └→ SurvivalAgent (needs Onchain + Market + Flow)
```

### 4. SYNTHESIS & REPORTING
```
OpenRouterResearchManager.generateIntelligenceReport()
  ├→ Combine all agent analyses
  ├→ Calculate composite ranking
  ├→ Generate executive summary
  └→ Return IntelligenceReport
```

### 5. UI DISPLAYS RESULTS
```
IntelligenceReportView.tsx renders:
  ├→ Executive Summary
  ├→ Risk Assessment
  ├→ Opportunity Score
  ├→ On-Chain Verification Badge (if available)
  └→ Key Insights
```

---

## 🎯 IMPLEMENTATION PHASES

### **PHASE 1: ON-CHAIN INTEGRATION**
**Goal:** Bridge service fetch data dari Onyx Protocol smart contract

#### Task 1.1: Create OnyxOnChainService
**File:** `intelligent_integration/services/onyxOnChainService.ts` (NEW)
- Fetch on-chain data via `OnyxOnChainBridge`
- Transform to `OnchainAnalysis` format
- Implement caching (5 min TTL)
- Error handling & fallbacks

#### Task 1.2: Update OnchainAgent
**File:** `intelligent_integration/agents/onchainAgent.ts`
- Accept `OnyxOnChainService` in constructor
- Try on-chain data first
- Fallback to RPC if unavailable
- Log data source

#### Task 1.3: Update AgentOrchestrator
**File:** `intelligent_integration/agentOrchestrator.ts`
- Accept `Connection` in constructor
- Initialize `OnyxOnChainService`
- Pass to `OnchainAgent`

---

### **PHASE 2: FIX AI ORCHESTRATION** 🔴 **CRITICAL**

#### Task 2.1: Fix intelligent_integration/index.ts
**Priority:** 🔴 **BLOCKER** — This task blocks everything else

**Current Issue:**
```typescript
// BROKEN:
import { ResearchManager } from './researchManager'; // ❌ Wrong class
let orchestrator: ResearchManager | null = null;     // ❌ Wrong type
```

**Fix Required:**
```typescript
// CORRECT:
import { AgentOrchestrator } from './agentOrchestrator';
import { Connection } from '@solana/web3.js';

let orchestrator: AgentOrchestrator | null = null;
let connection: Connection | null = null;

export function initializeOrchestrator(solanaConnection: Connection) {
  connection = solanaConnection;
  orchestrator = new AgentOrchestrator(connection);
}

function getOrchestrator(): AgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator();
  }
  return orchestrator;
}

export async function analyzeToken(token: string): Promise<IntelligenceReport> {
  const orch = getOrchestrator();
  return orch.analyzeToken(token, 'UNKNOWN', 30);
}
```

#### Task 2.2: Delete Legacy ResearchManager
**File:** `intelligent_integration/researchManager.ts`
**Action:** DELETE (320 lines) — Already replaced by `AgentOrchestrator` + `OpenRouterResearchManager`

#### Task 2.3: Initialize in Frontend
**File:** `src/App.tsx`
```typescript
import { useConnection } from '@solana/wallet-adapter-react';
import { initializeOrchestrator } from '@intelligent_integration';

useEffect(() => {
  if (connection) {
    initializeOrchestrator(connection);
    console.log('[App] Orchestrator initialized with on-chain connection');
  }
}, [connection]);
```

---

### **PHASE 3: FRONTEND INTEGRATION**

#### Task 3.1: Update Chart.tsx
**File:** `src/panels/chart/Chart.tsx`
- Add on-chain data indicator badge
- Show when using verified on-chain data

#### Task 3.2: Update IntelligenceReportView
**File:** `src/panels/chart/IntelligenceReportView.tsx`
- Display on-chain metrics section
- Show safety score (0-100)
- Show risk category (LOW/MEDIUM/HIGH/CRITICAL)
- Display whale wallets count

#### Task 3.3: Update Info Panel
**File:** `src/panels/info/Info.tsx`
- Show Onyx Protocol status
- Display whether protocol is initialized

---

## ⚠️ CRITICAL PATH

```
Task 2.1 (Fix index.ts) 
  → Task 2.3 (Init in App) 
    → Task 1.1 (OnyxService) 
      → Task 1.2 (OnchainAgent) 
        → Task 1.3 (Orchestrator) 
          → Task 3.x (UI Updates)
```

**ALL tasks depend on Task 2.1 being completed first.**

---

## ✅ VERIFICATION CHECKLIST

After implementation:

1. **Run dev server:**
   ```bash
   npm run dev
   ```

2. **Check console for:**
   - ✅ `[App] Orchestrator initialized with on-chain connection`
   - ✅ `[OnchainAgent] Using on-chain data from Onyx Protocol`
   - ❌ NO `ResearchManager` errors
   - ❌ NO `Cannot read properties of undefined` errors

3. **Test UI flow:**
   - Select a token from watchlist
   - Click "INTELLIGENCE" tab in Chart panel
   - Verify report loads without errors
   - Check for on-chain badge (if data available)

4. **Verify data flow:**
   - Open browser DevTools → Network tab
   - Confirm RPC calls to Solana (for on-chain data)
   - Confirm API calls to DexScreener, Birdeye (for market data)
   - Confirm OpenRouter calls (for AI synthesis)

---

## 📊 COMPONENT DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Watchlist  │→→│  Chart   │→→│   Info   │→→│ Intelligence │  │
│  │   Panel    │  │  Panel   │  │  Panel   │  │ Report View  │  │
│  └─────┬──────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│        │              │              │               │          │
│        └──────────────┴──────────────┴───────────────┘          │
│                         EVENT BUS (mitt)                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │  intelligent_integration    │
                │  ┌───────────────────────┐  │
                │  │ AgentOrchestrator     │  │
                │  │ ┌───────────────────┐ │  │
                │  │ │ OnyxOnChainService│ │  │
                │  │ └────────┬──────────┘ │  │
                │  │          │            │  │
                │  │   ┌──────┴──────┐     │  │
                │  │   │ 7 AI Agents │     │  │
                │  │   └─────────────┘     │  │
                │  └───────────────────────┘  │
                └───────────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼───────┐   ┌──────────▼──────────┐   ┌───────▼───────┐
│ Onyx Protocol │   │   External APIs     │   │  OpenRouter   │
│ (Solana L1)   │   │ DexScreener/Birdeye │   │   AI Models   │
└───────────────┘   └─────────────────────┘   └───────────────┘
```

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue: "Cannot read properties of undefined (reading 'map')"
**Cause:** `ResearchManager` still being used in `intelligent_integration/index.ts`
**Solution:** Complete Task 2.1 (replace with `AgentOrchestrator`)

### Issue: "Wallet not connected"
**Cause:** Expected behavior when wallet not connected
**Solution:** Connect wallet or implement read-only mode

### Issue: "On-chain data not available"
**Cause:** Token not yet analyzed on Onyx Protocol
**Solution:** Fallback to RPC data (automatic)

### Issue: Intelligence report shows mock data
**Cause:** Missing OpenRouter API key
**Solution:** Add `VITE_OPENROUTER_API_KEY` to `.env`

---

## 📚 KEY FILES REFERENCE

| File | Purpose | Layer |
|------|---------|-------|
| `intelligent_integration/index.ts` | Entry point, orchestrator initialization | Integration |
| `intelligent_integration/agentOrchestrator.ts` | Coordinates 7 AI agents | Core |
| `intelligent_integration/services/onyxOnChainService.ts` | Fetches on-chain data | Service |
| `src/services/onyxOnChainBridge.ts` | Bridge to smart contract | Service |
| `src/lib/onyxProgram.ts` | Smart contract client | Library |
| `src/hooks/useOnyxProgram.ts` | React hook for program access | Hook |
| `src/panels/chart/Chart.tsx` | Main chart panel | UI |
| `src/panels/chart/IntelligenceReportView.tsx` | Intelligence display | UI |

---

**For Questions:** Check TASK_PLAN.md for detailed task breakdown and progress tracking.