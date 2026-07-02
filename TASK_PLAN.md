# ONYX TERMINAL — TASK PLAN & PRIORITAS

> **Last Updated:** 7/2/2026 12:11 WIB  
> **Project Status:** 75% Complete — Devnet Deployed & Tested, Frontend Integration In Progress  
> **Critical Blocker:** ~~Smart Contract belum di-deploy~~ RESOLVED ✅

---

## 📊 EXECUTIVE SUMMARY

### Status Project
- ✅ **Smart Contract Code:** Complete (85% maturity)
- ✅ **Smart Contract Deployment:** DEPLOYED on Devnet ✅ (100%)
- ✅ **Frontend Architecture:** Complete (90% maturity)
- ⚠️ **On-chain Integration:** Partial (60% — deployed, frontend bug fixed, UI test pending)
- ✅ **AI Agents System:** Complete (95% — production ready)
- ✅ **Error Handling:** Good (80%)
- ⚠️ **Documentation:** Partial (60%)
- ❌ **Testing:** Incomplete (20% — critical gap)

### Network Configuration
- **Current Config:** Devnet (Anchor.toml) ✅
- **Deployed:** YES ✅ (Slot: 473370054)
- **Program ID:** `FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG` (deployed & verified)
- **Config PDA:** Initialized on-chain ✅

---

## 🎯 SKALA PRIORITAS

### **P0 — CRITICAL (Must Do NOW)**
**Goal:** Deploy smart contract ke devnet dan verify end-to-end functionality

### **P1 — HIGH (Next 1-2 minggu)**
**Goal:** Complete testing infrastructure dan production readiness

### **P2 — MEDIUM (2-4 minggu)**
**Goal:** Documentation, monitoring, dan mainnet preparation

### **P3 — LOW (Future work)**
**Goal:** Optimization dan advanced features

---

## ✅ COMPLETED WORK

### Platform Setup
- [x] Rust/Cargo installed ✅
- [x] Solana CLI v1.18.26 ✅
- [x] Anchor CLI v0.30.1 ✅
- [x] Build onyx-protocol — 0 errors, 0 warnings ✅
- [x] Platform tools downloaded & configured ✅

### Smart Contract Structure
- [x] `lib.rs` — 4 instructions (initialize, init_token_analysis, update_token_analysis, close_token_analysis) ✅
- [x] `state.rs` — OnyxConfig & TokenAnalysis structs ✅
- [x] `constants.rs` — PDA seeds ✅
- [x] `error.rs` — Custom error codes ✅
- [x] All instructions implemented with proper validation ✅

### Frontend Integration (Ready but Not Connected)
- [x] IDL TypeScript definition (`src/lib/idl/onyx_protocol.ts`) ✅
- [x] Program client wrapper (`src/lib/onyxProgram.ts`) ✅
- [x] React hook (`src/hooks/useOnyxProgram.ts`) ✅
- [x] Bridge service (`src/services/onyxOnChainBridge.ts`) ✅

### AI Intelligence System
- [x] 7 specialized agents (Flow, Onchain, Market, Opportunity, Narrative, SmartMoney, Survival) ✅
- [x] Agent orchestrator dengan 2-phase execution ✅
- [x] Circuit breaker & rate limiting ✅
- [x] WebSocket service ✅
- [x] OpenRouter integration ✅

---

## 🔴 P0 — CRITICAL (DO THIS FIRST)

### **P0.1 — Deploy Smart Contract ke Devnet**
**Status:** ✅ COMPLETED  
**Completed:** 7/2/2026  
**Impact:** HIGH — Blocking semua on-chain functionality

**Tasks:**
- [x] **P0.1.1** — Switch Solana config ke devnet ✅
  **Report:** RPC URL = https://api.devnet.solana.com

- [x] **P0.1.2** — Check/airdrop SOL devnet ✅
  **Report:** Balance sufficient, airdrop completed

- [x] **P0.1.3** — Deploy program ✅
  **Report:** 
  - Program ID: `FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG`
  - Deployed at slot: 473370054
  - Transaction signature saved

- [x] **P0.1.4** — Verify deployment ✅
  **Report:** Program exists on-chain, verified via `solana program show`

**Acceptance Criteria:**
- Program deployed successfully
- Program account exists on devnet
- Transaction signature saved
- Program ID confirmed

---

### **P0.2 — Initialize Protocol State**
**Status:** ✅ COMPLETED  
**Completed:** 7/2/2026  
**Impact:** HIGH — Required before any token analysis

**Tasks:**
- [x] **P0.2.1** — Test initialize instruction ✅
  **Report:** Passed — initialize instruction working

- [x] **P0.2.2** — Initialize config on devnet ✅
  **Report:**
  - Config PDA created on-chain
  - Authority set to deployer wallet
  - Fee wallet configured
  - Config account readable & verified

**Acceptance Criteria:**
- OnyxConfig account created on-chain
- Authority set correctly
- Fee wallet configured
- Config account readable

---

### **P0.3 — Test All Instructions End-to-End**
**Status:** ✅ COMPLETED  
**Completed:** 7/2/2026  
**Impact:** HIGH — Verify all functionality works

**Tasks:**
- [x] **P0.3.1** — Test init_token_analysis ✅
  **Report:**
  - Token mint: random test mint (Keypair.generate())
  - Analysis PDA created successfully
  - Transaction confirmed on devnet

- [x] **P0.3.2** — Test update_token_analysis ✅
  **Report:**
  - All 21 fields updated with mock data
  - Data read back and verified correct
  - Transaction confirmed on devnet

- [x] **P0.3.3** — Test close_token_analysis ✅
  **Report:**
  - Rent reclaimed to authority wallet
  - Account closed (null after close)
  - Transaction confirmed on devnet

**Acceptance Criteria:**
- All 4 instructions work on devnet
- Data reads/writes correctly
- Rent economics working
- No errors or panics

---

### **P0.4 — Connect Frontend to Deployed Program**
**Status:** ⚠️ IN PROGRESS  
**Dependencies:** P0.3 complete ✅  
**Impact:** HIGH — Enable UI to interact with on-chain data

**Tasks:**
- [x] **P0.4.1** — Update .env configuration & fix onyxProgram.ts ✅
  **Report:**
  - `.env` already had correct VITE_ONYX_PROGRAM_ID & VITE_SOLANA_RPC
  - **Bug fixed in `src/lib/onyxProgram.ts`:** `buildInitTokenAnalysisTx` was sending 5 accounts (including `mint` and `PublicKey.default`), should be 4 accounts (without `mint`, with proper `SystemProgram` ID `11111111111111111111111111111111`)
  - Fix matches the working `scripts/test-onyx-program.cjs` which was already tested successfully

- [ ] **P0.4.2** — Test program connection from frontend
  - Load dev server: `npm run dev`
  - Open browser console
  - Check `useOnyxProgram` hook connects
  - Verify can read config
  
  **Report:**
  - Connection successful (yes/no)
  - Config data retrieved
  - Any errors

- [ ] **P0.4.3** — Test UI operations
  - Select a token in watchlist
  - Trigger analysis (if UI ready)
  - Verify data flow: UI → RPC → Program → UI
  
  **Report:**
  - Operations tested
  - Success rate
  - Any failures

**Acceptance Criteria:**
- Frontend connects to devnet program
- Can read on-chain state
- Can send transactions (if wallet connected)
- No connection errors

---

## 🔴 P0.5 — ON-CHAIN TO AI INTEGRATION (NEW - CRITICAL)

### **P0.5.1 — Fix AgentOrchestrator Import (BLOCKER)**
**Status:** ❌ NOT STARTED  
**Priority:** 🔴 **CRITICAL BLOCKER** — Blocks all AI intelligence functionality  
**Impact:** HIGH — Fixes console errors, enables AI analysis  
**File:** `intelligent_integration/index.ts`

**Current Issue:**
- Using legacy `ResearchManager` class (320 lines, deprecated)
- Causes `TypeError: Cannot read properties of undefined (reading 'map')`
- AgentOrchestrator already exists and is ready to use

**Tasks:**
- [ ] **P0.5.1.1** — Replace `ResearchManager` import with `AgentOrchestrator`
  ```typescript
  // Change:
  import { ResearchManager } from './researchManager';
  // To:
  import { AgentOrchestrator } from './agentOrchestrator';
  import { Connection } from '@solana/web3.js';
  ```

- [ ] **P0.5.1.2** — Update orchestrator initialization
  ```typescript
  let orchestrator: AgentOrchestrator | null = null;
  let connection: Connection | null = null;
  
  export function initializeOrchestrator(solanaConnection: Connection) {
    connection = solanaConnection;
    orchestrator = new AgentOrchestrator(connection);
  }
  ```

- [ ] **P0.5.1.3** — Update `analyzeToken` function
  ```typescript
  export async function analyzeToken(token: string): Promise<IntelligenceReport> {
    const orch = getOrchestrator();
    return orch.analyzeToken(token, 'UNKNOWN', 30);
  }
  ```

- [ ] **P0.5.1.4** — DELETE `intelligent_integration/researchManager.ts`
  - File is 320 lines, no longer used
  - Already replaced by AgentOrchestrator + OpenRouterResearchManager

**Acceptance Criteria:**
- No `ResearchManager` errors in console
- No `Cannot read properties of undefined` errors
- Intelligence analysis works without crashes

---

### **P0.5.2 — Initialize Orchestrator in Frontend**
**Status:** ❌ NOT STARTED  
**Dependencies:** P0.5.1 complete  
**Impact:** HIGH — Connects on-chain data to AI agents  
**File:** `src/App.tsx`

**Tasks:**
- [ ] **P0.5.2.1** — Import orchestrator initializer
  ```typescript
  import { initializeOrchestrator } from '@intelligent_integration';
  import { useConnection } from '@solana/wallet-adapter-react';
  ```

- [ ] **P0.5.2.2** — Initialize on connection ready
  ```typescript
  const { connection } = useConnection();
  
  useEffect(() => {
    if (connection) {
      initializeOrchestrator(connection);
      console.log('[App] Orchestrator initialized with on-chain connection');
    }
  }, [connection]);
  ```

**Acceptance Criteria:**
- Console shows: `[App] Orchestrator initialized with on-chain connection`
- No initialization errors
- Connection passed to orchestrator successfully

---

### **P0.5.3 — Create OnyxOnChainService**
**Status:** ❌ NOT STARTED  
**Dependencies:** P0.5.1, P0.5.2 complete  
**Impact:** HIGH — Fetches verified on-chain data for AI agents  
**File:** `intelligent_integration/services/onyxOnChainService.ts` (NEW)

**Tasks:**
- [ ] **P0.5.3.1** — Create service class with OnyxOnChainBridge integration
  - Accept `Connection` in constructor
  - Initialize `OnyxOnChainBridge`
  - Implement caching (5 min TTL)

- [ ] **P0.5.3.2** — Implement `fetchTokenAnalysis` method
  - Check cache first
  - Fetch from bridge: `bridge.loadAnalysis(mintAddress)`
  - Transform `TokenAnalysisEnriched` → `OnchainAnalysis` format
  - Cache result

- [ ] **P0.5.3.3** — Add error handling & fallbacks
  - Try-catch for bridge calls
  - Return null if on-chain data unavailable
  - Log data source for debugging

- [ ] **P0.5.3.4** — Export via `intelligent_integration/index.ts`
  ```typescript
  export { OnyxOnChainService } from './services/onyxOnChainService';
  ```

**Acceptance Criteria:**
- Service fetches on-chain data successfully
- Transforms data to correct format for AI agents
- Caching works (5 min TTL)
- Graceful fallback if data unavailable

---

### **P0.5.4 — Update OnchainAgent to Use On-Chain Data**
**Status:** ❌ NOT STARTED  
**Dependencies:** P0.5.3 complete  
**Impact:** MEDIUM — Enables AI to use verified on-chain data  
**File:** `intelligent_integration/agents/onchainAgent.ts`

**Tasks:**
- [ ] **P0.5.4.1** — Add OnyxOnChainService to constructor
  ```typescript
  constructor(onyxService?: OnyxOnChainService) {
    this.onyxService = onyxService;
  }
  ```

- [ ] **P0.5.4.2** — Update `analyzeToken` method
  - TRY: Fetch from OnyxOnChainService first
  - Log: `[OnchainAgent] Using on-chain data from Onyx Protocol`
  - FALLBACK: Use RPC service if on-chain unavailable

- [ ] **P0.5.4.3** — Keep existing RPC fallback as `analyzeViaRPC` method

**Acceptance Criteria:**
- Agent tries on-chain data first
- Falls back to RPC gracefully
- Logs data source for verification

---

### **P0.5.5 — Update AgentOrchestrator Constructor**
**Status:** ❌ NOT STARTED  
**Dependencies:** P0.5.3, P0.5.4 complete  
**Impact:** MEDIUM — Wires everything together  
**File:** `intelligent_integration/agentOrchestrator.ts`

**Tasks:**
- [ ] **P0.5.5.1** — Accept Connection parameter
  ```typescript
  constructor(connection?: Connection) {
    if (connection) {
      this.onyxService = new OnyxOnChainService(connection);
    }
    this.onchainAgent = new OnchainAgent(this.onyxService);
    // ... rest of agents
  }
  ```

- [ ] **P0.5.5.2** — Pass OnyxOnChainService to OnchainAgent

**Acceptance Criteria:**
- Orchestrator initializes with connection
- OnchainAgent receives OnyxOnChainService
- Full pipeline: Frontend → Orchestrator → OnchainAgent → OnyxService → Bridge → Smart Contract

---

### **P0.5.6 — Update UI Components**
**Status:** ❌ NOT STARTED  
**Dependencies:** P0.5.1-P0.5.5 complete  
**Impact:** MEDIUM — User-facing improvements  
**Files:** `Chart.tsx`, `Info.tsx`, `IntelligenceReportView.tsx`

**Tasks:**
- [ ] **P0.5.6.1** — Add on-chain badge in Chart.tsx
  ```typescript
  {intelligenceReport?.metadata?.onchainDataAvailable && (
    <span className={styles.onchainBadge} title="Using verified on-chain data">
      ⛓️ ON-CHAIN
    </span>
  )}
  ```

- [ ] **P0.5.6.2** — Display on-chain metrics in IntelligenceReportView
  - Safety Score (0-100)
  - Risk Category (LOW/MEDIUM/HIGH/CRITICAL)
  - Whale Wallets count
  - Holder concentration

- [ ] **P0.5.6.3** — Show protocol status in Info panel
  - Onyx Protocol: ✅ Active / ⚠️ Initializing
  - Check via `program.configExists()`

**Acceptance Criteria:**
- On-chain badge visible when using on-chain data
- Metrics displayed correctly
- Protocol status accurate

---

## 🟡 P1 — HIGH PRIORITY (Next 1-2 Minggu)

### **P1.1 — Add Smart Contract Tests**
**Status:** ❌ NOT STARTED  
**Impact:** HIGH — Critical for quality assurance

**Tasks:**
- [ ] **P1.1.1** — Create Rust unit tests
  - Add tests in `src/instructions/*.rs`
  - Test validation logic
  - Test error cases
  
  **Report:**
  - Number of tests added
  - Coverage percentage
  - Test results

- [ ] **P1.1.2** — Create Anchor integration tests
  - Add to `tests/` folder
  - Test full instruction flow
  - Test PDA derivation
  
  **Report:**
  - Test file created
  - Test scenarios covered
  - Pass/fail status

- [ ] **P1.1.3** — Run full test suite
  ```bash
  anchor test
  cargo test
  ```
  **Report:**
  - Total tests: X
  - Passed: X
  - Failed: X
  - Coverage: X%

**Acceptance Criteria:**
- Minimum 10 test cases
- All tests passing
- Coverage ≥70%

---

### **P1.2 — Complete Bridge Integration**
**Status:** ⚠️ PARTIAL (code ready, needs deployment)  
**Impact:** HIGH — Core functionality

**Tasks:**
- [ ] **P1.2.1** — Add retry mechanism to bridge
  - Implement exponential backoff
  - Handle RPC failures gracefully
  
  **Report:**
  - Retry logic added (yes/no)
  - Max retries: X
  - Backoff strategy

- [ ] **P1.2.2** — Add transaction confirmation monitoring
  - Poll for confirmation status
  - Handle timeout scenarios
  
  **Report:**
  - Monitoring implemented
  - Timeout duration: X seconds
  - Success rate

- [ ] **P1.2.3** — Improve error messages
  - User-friendly error text
  - Include troubleshooting hints
  
  **Report:**
  - Error message examples
  - User feedback

**Acceptance Criteria:**
- Failed transactions retry automatically
- Users see clear error messages
- Transaction confirmations tracked

---

### **P1.3 — Environment Configuration**
**Status:** ⚠️ PARTIAL (.env.example exists)  
**Impact:** MEDIUM — Developer experience

**Tasks:**
- [ ] **P1.3.1** — Create .env.devnet
  - Devnet-specific configuration
  - Document all variables
  
  **Report:**
  - File created
  - Variables documented

- [ ] **P1.3.2** — Create .env.mainnet (template)
  - Mainnet-specific configuration
  - Add warnings about production
  
  **Report:**
  - Template created
  - Warnings added

- [ ] **P1.3.3** — Add config validation
  - Check required vars on startup
  - Fail fast if missing
  
  **Report:**
  - Validation added
  - Errors caught

**Acceptance Criteria:**
- Clear env setup for devnet/mainnet
- Validation prevents misconfiguration
- Documentation complete

---

### **P1.4 — Create Integration Test Suite**
**Status:** ❌ NOT STARTED  
**Impact:** HIGH — Ensure stability

**Tasks:**
- [ ] **P1.4.1** — Test agent orchestration end-to-end
  - Mock external APIs
  - Verify agent coordination
  
  **Report:**
  - Test scenarios: X
  - Pass rate: X%

- [ ] **P1.4.2** — Test on-chain bridge with devnet
  - Real program calls
  - Verify data consistency
  
  **Report:**
  - Operations tested: X
  - Success rate: X%

- [ ] **P1.4.3** — Test error recovery paths
  - Simulate failures
  - Verify graceful degradation
  
  **Report:**
  - Failure scenarios: X
  - Recovery successful: X/X

**Acceptance Criteria:**
- 15+ integration test cases
- All scenarios covered
- 100% pass rate

---

## 🟢 P2 — MEDIUM PRIORITY (2-4 Minggu)

### **P2.1 — Documentation**
**Status:** ⚠️ PARTIAL (architecture doc exists)  
**Impact:** MEDIUM — Team onboarding

**Tasks:**
- [ ] **P2.1.1** — Complete API documentation
  - Document all public functions
  - Add JSDoc comments
  
  **Report:**
  - Functions documented: X/X
  - Coverage: X%

- [ ] **P2.1.2** — Create deployment guide
  - Step-by-step instructions
  - Include troubleshooting
  
  **Report:**
  - Guide created
  - Tested by new user

- [ ] **P2.1.3** — Write troubleshooting guide
  - Common issues & solutions
  - Error code reference
  
  **Report:**
  - Issues documented: X
  - Solutions provided: X

**Acceptance Criteria:**
- API docs complete
- Guides easy to follow
- New developers can deploy

---

### **P2.2 — Monitoring & Analytics**
**Status:** ❌ NOT STARTED  
**Impact:** MEDIUM — Operational visibility

**Tasks:**
- [ ] **P2.2.1** — Track transaction success rate
  - Log all transactions
  - Calculate metrics
  
  **Report:**
  - Metrics tracked
  - Dashboard created (if applicable)

- [ ] **P2.2.2** — Monitor program account usage
  - Track analysis count
  - Monitor rent balances
  
  **Report:**
  - Monitoring active
  - Alert thresholds set

- [ ] **P2.2.3** — Alert system for failures
  - Email/Slack notifications
  - Critical error alerts
  
  **Report:**
  - Alert channels configured
  - Test alerts sent

**Acceptance Criteria:**
- Metrics tracked in real-time
- Alerts fire correctly
- Dashboard accessible

---

### **P2.3 — Mainnet Preparation**
**Status:** ❌ NOT STARTED  
**Dependencies:** P0-P1 complete + 2 weeks devnet testing  
**Impact:** HIGH (but not urgent)

**Tasks:**
- [ ] **P2.3.1** — Security audit
  - External audit of smart contract
  - Review access controls
  
  **Report:**
  - Audit report received
  - Issues: X
  - Fixed: X

- [ ] **P2.3.2** — Load testing
  - Simulate high transaction volume
  - Test rate limits
  
  **Report:**
  - Max TPS tested: X
  - Bottlenecks identified: X
  - Performance acceptable: yes/no

- [ ] **P2.3.3** — Mainnet deployment plan
  - Checklist created
  - Rollback plan defined
  
  **Report:**
  - Plan documented
  - Stakeholders reviewed

**Acceptance Criteria:**
- Security audit passed
- Load testing successful
- Deployment plan approved

---

## 🔵 P3 — LOW PRIORITY (Future Work)

### **P3.1 — Performance Optimization**
- [ ] Optimize Borsh serialization
- [ ] Reduce transaction size
- [ ] Batch operations

### **P3.2 — Advanced Features**
- [ ] Multi-token batch analysis
- [ ] Historical data queries
- [ ] Advanced analytics

### **P3.3 — Code Quality**
- [ ] Increase test coverage to 90%
- [ ] Add more JSDoc comments
- [ ] Refactor complex functions

---

## 📝 REPORTING REQUIREMENTS

### After Each Task Completion, Report:

1. **Task ID** (e.g., P0.1.1)
2. **Status** (✅ Complete / ⚠️ Partial / ❌ Failed)
3. **Key Outputs**
   - Transaction signatures
   - Program addresses
   - Test results
   - Error messages (if any)
4. **Blockers Encountered** (if any)
5. **Next Steps** (what to do next)

### Report Format Example:
```
## P0.1.1 — Switch to Devnet
**Status:** ✅ Complete
**Output:**
- RPC URL: https://api.devnet.solana.com
- Confirmed: solana config get
**Blockers:** None
**Next:** P0.1.2 — Check SOL balance
```

---

## 🎯 SUCCESS METRICS

### P0 Success (Critical Path):
- ✅ Program deployed to devnet
- ✅ All 4 instructions working
- ✅ Frontend connected & operational

### P1 Success (Quality):
- ✅ 10+ tests passing
- ✅ Error handling robust
- ✅ Integration tests green

### P2 Success (Production Ready):
- ✅ Documentation complete
- ✅ Monitoring active
- ✅ Security audit passed

---

## 🚨 CRITICAL NOTES

1. **DO NOT** proceed to P1 until P0 is 100% complete
2. **DO NOT** deploy to mainnet without P2.3.1 (security audit)
3. **ALWAYS** report after each task completion
4. **NEVER** skip testing — quality over speed
5. **If blocked**, escalate immediately, don't guess

---

## 📞 ESCALATION PATH

**Blocked on P0?** → Critical issue, notify immediately  
**Blocked on P1?** → High priority, report within 24h  
**Blocked on P2/P3?** → Document and continue other work

---

**NEXT AGENT: Start with P0.1.1 — Switch Solana config to devnet**

**Current Blockers:** None — all pre-requisites met (Rust, Solana CLI, Anchor installed & working)

**Estimated Time:**
- P0: 2-3 days (deployment + testing)
- P1: 1-2 weeks (testing + integration)
- P2: 2-4 weeks (docs + mainnet prep)