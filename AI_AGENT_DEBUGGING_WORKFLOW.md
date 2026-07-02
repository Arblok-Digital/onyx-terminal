# 🤖 AI Agent Debugging Workflow — Onyx Terminal
**Date:** 2026-07-03  
**Agent:** Nemorton Ultra  
**Priority:** 🔴 CRITICAL — Fix all AI agent runtime errors

---

## 📋 CURRENT STATUS (as of 2026-07-02 15:55 WIB)

### ✅ WORKING COMPONENTS
- **Blockchain Protocol:** 100% operational on Solana devnet
- **Smart Contract:** `FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG` deployed & tested
- **All Instructions:** initialize, init_token_analysis, update_token_analysis, close_token_analysis ✅
- **Frontend Build:** Compiles without errors
- **Circular Dependency:** Fixed via lazy initialization in `agentOrchestrator.ts`

### 🔴 BROKEN COMPONENTS
- **AI Agents:** Multiple runtime errors in browser console
- **Intelligence Reports:** Cannot generate due to agent failures
- **External API Integration:** Arkham Intelligence + OpenRouter connection issues
- **Error Details:** 
  - `TypeError: Cannot read properties of undefined (reading 'map')`
  - `Error generating intelligence report`
  - Network failures to external services
  - Wallet connection warnings

---

## 🎯 MISSION OBJECTIVES

**Primary Goal:** Debug and fix all 7 AI agents + orchestrator to enable intelligence report generation.

**Success Criteria:**
1. ✅ No red errors in browser console
2. ✅ All 7 agents return valid analysis data
3. ✅ `Chart.tsx` can call `analyzeToken()` successfully
4. ✅ `IntelligenceReportView` renders complete reports
5. ✅ External API integrations working (or gracefully fail with fallbacks)

---

## 📍 PHASE 1: DIAGNOSTIC (30-45 minutes)

### Step 1.1: Identify Error Sources
**Location:** Browser console at `http://localhost:5173`

**Tasks:**
1. Open browser DevTools (F12)
2. Navigate to Console tab
3. Clear console, refresh page
4. Screenshot all red errors
5. Group errors by category:
   - Agent initialization errors
   - Runtime execution errors
   - External API failures
   - Type errors / undefined properties

**Expected Output:** List of all unique error messages with file paths and line numbers

### Step 1.2: Check Environment Variables
**Location:** `.env` file in project root

**Tasks:**
1. Verify all required API keys exist:
   ```bash
   VITE_OPENROUTER_API_KEY=...
   VITE_ARKHAM_API_KEY=...
   VITE_HELIUS_API_KEY=...
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
2. Check if any keys are empty, expired, or invalid
3. Test API keys manually if needed (curl or Postman)

**Expected Output:** Confirmation that all API keys are present and valid

### Step 1.3: Verify DI Container Setup
**Location:** `intelligent_integration/core/inversify.config.ts`

**Tasks:**
1. Read file to confirm all 7 agents are bound:
   - FlowIntelligenceAgent
   - OnchainAgent
   - MarketAgent
   - OpportunityAgent
   - NarrativeAgent
   - SmartMoneyAgent
   - SurvivalAgent
2. Check that `AgentOrchestrator` and `AgentRouter` are bound
3. Verify no typos in TOKENS references

**Expected Output:** All bindings correct, no missing agents

---

## 📍 PHASE 2: AGENT ISOLATION TESTING (2-3 hours)

### Strategy: Test Each Agent in Isolation
**Approach:** Create test script that mocks dependencies and tests agents one by one

### Step 2.1: Create Agent Test Script
**Location:** Create new file `scripts/test-agents.cjs`

**Template:**
```javascript
const { Connection, PublicKey } = require('@solana/web3.js');

async function testMarketAgent() {
    console.log('\n=== Testing MarketAgent ===');
    try {
        // Import agent
        const { MarketAgent } = require('../intelligent_integration/agents/marketAgent');
        
        // Create mock dependencies
        const mockLogger = {
            info: console.log,
            error: console.error,
            warn: console.warn,
            debug: console.log
        };
        
        // Initialize agent
        const agent = new MarketAgent(mockLogger);
        
        // Test with real token
        const testTokenAddress = 'So11111111111111111111111111111111111111112'; // SOL
        const result = await agent.analyzeToken(testTokenAddress);
        
        console.log('✓ MarketAgent result:', JSON.stringify(result, null, 2));
        return true;
    } catch (error) {
        console.error('✗ MarketAgent failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Test all agents
async function main() {
    const results = {
        market: await testMarketAgent(),
        // TODO: Add other agents
    };
    
    console.log('\n=== Test Results ===');
    console.log(results);
}

main().catch(console.error);
```

**Tasks:**
1. Create the test script
2. Test MarketAgent first (simplest)
3. Add tests for other agents incrementally
4. Document which agents pass/fail

### Step 2.2: Fix MarketAgent (Highest Priority)
**Location:** `intelligent_integration/agents/marketAgent.ts`

**Common Issues to Check:**
1. **Undefined API responses:** Add null checks
   ```typescript
   const data = await fetchData();
   if (!data || !data.pairs) {
       return createErrorResponse();
   }
   ```
2. **Missing error handling:** Wrap API calls in try-catch
3. **Type mismatches:** Verify return types match `MarketAnalysis` interface
4. **Dependency injection:** Ensure constructor gets valid Logger

**Tasks:**
1. Read current MarketAgent code
2. Identify bugs based on console errors
3. Add defensive programming (null checks, fallbacks)
4. Test with mock data first, then real API
5. Verify it returns valid `MarketAnalysis` object

### Step 2.3: Fix OnchainAgent
**Location:** `intelligent_integration/agents/onchainAgent.ts`

**Common Issues:**
1. **RPC connection failures:** Check Helius API key
2. **Solana transaction parsing:** Handle missing data gracefully
3. **PDA derivation errors:** Verify seeds match on-chain program

**Tasks:**
1. Similar process to MarketAgent
2. Add connection retry logic
3. Mock Solana RPC responses for testing
4. Verify it returns valid `OnchainAnalysis` object

### Step 2.4: Fix Remaining Agents (FlowIntelligenceAgent, OpportunityAgent, NarrativeAgent, SmartMoneyAgent, SurvivalAgent)
**Locations:** `intelligent_integration/agents/` directory

**Strategy for Each:**
1. Read agent code
2. Identify dependencies (which APIs it calls)
3. Add error handling for API failures
4. Test with mock data
5. Verify return type matches expected interface

**Priority Order:**
1. FlowIntelligenceAgent (depends on Onchain)
2. OpportunityAgent (depends on Market + Onchain)
3. NarrativeAgent (depends on external APIs)
4. SmartMoneyAgent (depends on Onchain + Flow)
5. SurvivalAgent (depends on Market + Onchain)

---

## 📍 PHASE 3: ORCHESTRATOR INTEGRATION (1-2 hours)

### Step 3.1: Test AgentOrchestrator
**Location:** `intelligent_integration/agentOrchestrator.ts`

**Tasks:**
1. Verify lazy getters work correctly (already implemented)
2. Test `analyzeToken()` method with mock token
3. Check that all agents are called in correct order
4. Verify error aggregation in `createErrorReport()`
5. Test cache functionality

**Test Command:**
```javascript
const orchestrator = new AgentOrchestrator(connection);
const report = await orchestrator.analyzeToken('So11111111111111111111111111111111111111112', 'SOL');
console.log(report);
```

### Step 3.2: Test OpenRouterResearchManager
**Location:** `intelligent_integration/services/openRouterService/index.ts`

**Tasks:**
1. Verify API key is valid
2. Test `generateIntelligenceReport()` method
3. Check rate limiting + circuit breaker
4. Add fallback for when OpenRouter is down
5. Test with mock agent results first

---

## 📍 PHASE 4: FRONTEND INTEGRATION (1 hour)

### Step 4.1: Test Chart.tsx Integration
**Location:** `src/panels/chart/Chart.tsx`

**Tasks:**
1. Open app at `http://localhost:5173`
2. Navigate to Chart panel
3. Toggle "AI Intelligence" button
4. Enter test token address
5. Verify `analyzeToken()` is called
6. Check console for errors
7. Confirm loading states work

### Step 4.2: Test IntelligenceReportView
**Location:** `src/panels/chart/IntelligenceReportView.tsx`

**Tasks:**
1. Wait for intelligence report to generate
2. Verify all sections render:
   - Flow Analysis
   - Onchain Analysis
   - Market Analysis
   - Opportunity Score
   - Narrative Analysis
   - Smart Money Analysis
   - Survival Analysis
3. Check for missing data or rendering errors
4. Test error states (when analysis fails)

---

## 📍 PHASE 5: ERROR HANDLING & FALLBACKS (1 hour)

### Step 5.1: Add Graceful Degradation
**Strategy:** App should work even if some agents fail

**Tasks:**
1. Add fallback responses for each agent
2. Implement partial report generation (show successful agents even if some fail)
3. Add user-friendly error messages
4. Log errors for debugging but don't crash app

### Step 5.2: Add Rate Limiting Protection
**Locations:** `intelligent_integration/core/rateLimiter.ts`, `intelligent_integration/core/circuitBreaker.ts`

**Tasks:**
1. Verify rate limiters are configured correctly
2. Test circuit breaker with failing API
3. Add exponential backoff for retries
4. Cache successful responses to reduce API calls

---

## 📍 PHASE 6: DOCUMENTATION & COMMIT (30 minutes)

### Step 6.1: Update DEVELOPMENT_LOG.md
**Location:** `DEVELOPMENT_LOG.md`

**Add New Section:**
```markdown
### Session Summary (2026-07-03 — AI Agent Debugging)
- **Status**: P0.5 AI Integration ✅ COMPLETED
- **Major Milestone**: All 7 agents operational, intelligence reports generating

#### Completed This Session
1. ✅ Fixed MarketAgent — [specific bugs fixed]
2. ✅ Fixed OnchainAgent — [specific bugs fixed]
3. ✅ Fixed FlowIntelligenceAgent — [specific bugs fixed]
4. ✅ Fixed OpportunityAgent — [specific bugs fixed]
5. ✅ Fixed NarrativeAgent — [specific bugs fixed]
6. ✅ Fixed SmartMoneyAgent — [specific bugs fixed]
7. ✅ Fixed SurvivalAgent — [specific bugs fixed]
8. ✅ AgentOrchestrator fully operational
9. ✅ Frontend integration verified
10. ✅ Error handling + fallbacks implemented

#### Verification ✅
- **Build:** `npm run build` → 0 errors
- **Console:** No red errors at runtime
- **Intelligence Reports:** Successfully generating
- **All Agents:** Returning valid analysis data
```

### Step 6.2: Update TASK_PLAN.md
**Location:** `TASK_PLAN.md`

**Mark Completed:**
```markdown
## P0.5 — AgentOrchestrator Wiring & Integration ✅ COMPLETED

- [x] P0.5.1 — Fixed initializeOrchestrator + DI setup
- [x] P0.5.2 — Orchestrator initialization in main.tsx
- [x] P0.5.3 — OnyxOnChainService created
- [x] P0.5.4 — Agent constructors fixed
- [x] P0.5.5 — Circular dependency resolved
- [x] P0.5.6 — All 7 agents debugged & operational
- [x] P0.5.7 — Frontend integration verified
- [x] P0.5.8 — Error handling + fallbacks added
```

### Step 6.3: Commit Changes
**Commands:**
```bash
git add .
git commit -m "fix(P0.5): debug and fix all AI agents

- Fixed MarketAgent: [list specific fixes]
- Fixed OnchainAgent: [list specific fixes]
- Fixed FlowIntelligenceAgent: [list specific fixes]
- Fixed OpportunityAgent: [list specific fixes]
- Fixed NarrativeAgent: [list specific fixes]
- Fixed SmartMoneyAgent: [list specific fixes]
- Fixed SurvivalAgent: [list specific fixes]
- Added comprehensive error handling
- Implemented graceful degradation
- Verified frontend integration
- All console errors resolved"

git push origin main
```

---

## 🛠️ DEBUGGING TOOLS & COMMANDS

### Useful Commands
```bash
# Start dev server with verbose logging
npm run dev

# Build and check for errors
npm run build

# Run tests
npm test

# Check TypeScript types
npx tsc --noEmit

# View Solana program logs
solana logs FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG

# Test on-chain program
node scripts/test-onyx-program.cjs

# Test agents (create this script)
node scripts/test-agents.cjs
```

### Browser DevTools Tips
1. **Preserve log:** Enable in Console settings to keep errors across page reloads
2. **Filter errors:** Use filter box to search for specific error messages
3. **Network tab:** Monitor API calls to external services
4. **React DevTools:** Inspect component props and state
5. **Breakpoints:** Set breakpoints in agent code to debug step-by-step

---

## 📊 SUCCESS METRICS

### Definition of Done
- [ ] All 7 agents return valid data (no undefined/null crashes)
- [ ] `AgentOrchestrator.analyzeToken()` completes successfully
- [ ] Intelligence reports render in UI without errors
- [ ] Browser console shows 0 red errors
- [ ] External API failures handled gracefully
- [ ] Build completes with 0 errors
- [ ] All changes committed to GitHub
- [ ] DEVELOPMENT_LOG.md updated with session summary

---

## 🚨 ESCALATION PATH

### If Stuck on Specific Agent
1. Add detailed error logging
2. Test with mock data to isolate API vs logic issues
3. Check agent dependencies (which other agents/services it needs)
4. Review agent's source code for recent changes
5. Check if external API has changed (breaking changes)

### If External APIs Consistently Fail
1. Verify API keys are valid and not expired
2. Check rate limits (use fallback mock data if hit)
3. Implement circuit breaker to prevent repeated failures
4. Add caching to reduce API dependency
5. Consider alternative data sources

### If Frontend Integration Fails
1. Check that `useOnyxProgram` hook returns orchestrator correctly
2. Verify React component props match expected types
3. Test orchestrator in isolation (outside React)
4. Check browser console for rendering errors
5. Review error boundary implementation

---

## 📞 CONTACT & RESOURCES

### Key Files Reference
- **Agents:** `intelligent_integration/agents/`
- **Orchestrator:** `intelligent_integration/agentOrchestrator.ts`
- **DI Setup:** `intelligent_integration/core/inversify.config.ts`
- **Frontend:** `src/panels/chart/Chart.tsx`, `src/panels/chart/IntelligenceReportView.tsx`
- **Types:** `intelligent_integration/types/analysisTypes.ts`

### External Documentation
- **Solana Web3.js:** https://solana-labs.github.io/solana-web3.js/
- **InversifyJS:** https://inversify.io/
- **OpenRouter API:** https://openrouter.ai/docs
- **Arkham Intelligence:** https://docs.arkhamintelligence.com/

---

## ✅ FINAL CHECKLIST

Before marking task complete, verify:

- [ ] Phase 1: Diagnostics complete, all errors documented
- [ ] Phase 2: All 7 agents tested individually and fixed
- [ ] Phase 3: Orchestrator integration working
- [ ] Phase 4: Frontend integration verified
- [ ] Phase 5: Error handling + fallbacks added
- [ ] Phase 6: Documentation updated, changes committed
- [ ] No red errors in browser console
- [ ] Intelligence reports generating successfully
- [ ] Build completes without errors
- [ ] All tests passing

---

**End of Workflow** — Good luck Nemorton Ultra! 🚀