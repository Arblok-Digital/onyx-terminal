# Onyx Protocol Implementation Workflow

> **Last Updated:** 2026-07-04
> **Status:** Ready for Implementation
> **Based on:** ONYX_ARCHITECTURE.md

---

## 🎯 Goal

Implementasi Onyx Protocol v2 yang menggantikan fee injection via Jupiter API dengan on-chain fee logic yang sepenuhnya independen.

---

## 📊 Current State vs Target State

| Aspect | Current (Phase 1) | Target (Phase 3) |
|--------|-------------------|------------------|
| **Network** | Mainnet (Swap) | Mainnet (All) |
| **Fee Logic** | Jupiter API injection | On-chain via Onyx Protocol |
| **Fee Collection** | ATA static accounts | Treasury PDA (dynamic) |
| **Independence** | Dependent on Jupiter | Fully independent |
| **Revenue** | 50 bps per swap | 50 bps per swap (on-chain) |

---

## 🔄 Implementation Phases

### Phase 1: PRODUCTION (Current) ✅

**Status:** Active, generating revenue

**What's Working:**
- [x] Swap panel live di mainnet
- [x] Fee injection via Jupiter API (`api/jup/swap.js`)
- [x] Direct pool routing (PumpFun/Raydium/Meteora/Orca)
- [x] Dual RPC architecture (`MAINNET_RPC` / `DEVNET_RPC`)
- [x] Fee accounts configured (WSOL/USDC ATA)

**Revenue Flow:**
```
User Swap → Jupiter API → Fee Injected → ATA Treasury
                                    ↓
                              50 bps (0.5%)
```

**Action Items:**
- [ ] Monitor revenue accumulation
- [ ] Track fee collection metrics
- [ ] Prepare ~10-20 SOL for mainnet deployment

---

### Phase 2: DEVELOPMENT (In Progress)

**Status:** Devnet development

**Goal:** Build Onyx Protocol v2 smart contract

#### 2.1 Smart Contract Architecture

**Location:** `onyx-protocol/programs/onyx-protocol/src/`

**Core Components:**

```rust
// state.rs - Account Structures
pub struct FeeConfig {
    pub authority: Pubkey,           // Admin wallet
    pub treasury: Pubkey,            // Treasury PDA
    pub fee_bps: u16,                // Fee in basis points (50 = 0.5%)
    pub supported_mints: Vec<Pubkey>, // WSOL, USDC, etc.
    pub bump: u8,
}

pub struct Treasury {
    pub fee_config: Pubkey,          // Parent FeeConfig
    pub mint: Pubkey,                // Token mint
    pub balance: u64,                // Accumulated fees
    pub bump: u8,
}
```

**Instructions to Implement:**

```rust
// instructions/mod.rs
pub mod initialize_fee_config;   // Setup fee config PDA
pub mod update_fee_config;       // Update fee rate, authority
pub mod collect_fee;             // Collect fee from swap
pub mod withdraw_treasury;       // Withdraw accumulated fees
pub mod close_fee_config;        // Close config (admin only)
```

#### 2.2 Implementation Checklist

**Step 1: State Definition** (`state.rs`)
- [ ] Define `FeeConfig` account struct
- [ ] Define `Treasury` account struct
- [ ] Add serialization/deserialization
- [ ] Implement space calculation

**Step 2: Error Handling** (`error.rs`)
- [ ] Define custom error codes
- [ ] InvalidAuthority
- [ ] InvalidMint
- [ ] InsufficientBalance
- [ ] FeeConfigAlreadyExists

**Step 3: Initialize Instruction** (`instructions/initialize_fee_config.rs`)
- [ ] Create FeeConfig PDA
- [ ] Set authority and treasury
- [ ] Set fee_bps (default 50)
- [ ] Initialize supported mints

**Step 4: Collect Fee Instruction** (`instructions/collect_fee.rs`)
- [ ] Validate token mint
- [ ] Calculate fee amount
- [ ] Transfer fee to Treasury PDA
- [ ] Emit event for tracking

**Step 5: Withdraw Instruction** (`instructions/withdraw_treasury.rs`)
- [ ] Verify authority signature
- [ ] Check treasury balance
- [ ] Transfer to destination wallet
- [ ] Update treasury balance

**Step 6: Update Config Instruction** (`instructions/update_fee_config.rs`)
- [ ] Verify authority signature
- [ ] Update fee_bps if provided
- [ ] Update supported_mints if provided
- [ ] Emit update event

#### 2.3 Testing Strategy

**Location:** `onyx-protocol/tests/onyx-protocol.ts`

**Test Cases:**
- [ ] Initialize FeeConfig successfully
- [ ] Initialize fails if already exists
- [ ] Collect fee in WSOL
- [ ] Collect fee in USDC
- [ ] Collect fee fails for unsupported mint
- [ ] Withdraw treasury by authority
- [ ] Withdraw fails for non-authority
- [ ] Update fee_bps
- [ ] Update supported_mints
- [ ] Close FeeConfig

**Test Commands:**
```bash
cd onyx-protocol
anchor build
anchor test --skip-local-validator  # Use devnet
```

#### 2.4 Devnet Deployment

**Prerequisites:**
- [ ] Get devnet SOL airdrop (max 2 SOL per request)
- [ ] Wait 8 hours if rate limited
- [ ] Ensure ~5 SOL for deployment

**Deployment Steps:**
```bash
# 1. Build
anchor build

# 2. Deploy to devnet
anchor deploy --provider.cluster devnet

# 3. Initialize FeeConfig
anchor run initialize

# 4. Verify deployment
anchor run verify
```

**Expected Output:**
```
Program ID: FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG
FeeConfig PDA: [derived]
Treasury PDA (WSOL): [derived]
Treasury PDA (USDC): [derived]
```

---

### Phase 3: MIGRATION (Future)

**Prerequisites:**
- [ ] Phase 2 completed and tested thoroughly
- [ ] Security audit (optional but recommended)
- [ ] Sufficient SOL for mainnet deployment (~10-20 SOL)
- [ ] Revenue from Phase 1 accumulated

#### 3.1 Mainnet Deployment

**Step 1: Prepare Wallet**
- [ ] Transfer SOL to deployer wallet
- [ ] Verify mainnet balance

**Step 2: Deploy Program**
```bash
# Build for mainnet
anchor build

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

**Step 3: Initialize On Mainnet**
```bash
# Initialize FeeConfig with production values
anchor run initialize --provider.cluster mainnet
```

**Step 4: Update Frontend**
- [ ] Update `CONFIG.ONYX_PROGRAM_ID` with mainnet program ID
- [ ] Update `CONFIG.ONYX_NETWORK` to `mainnet-beta`
- [ ] Test swap with on-chain fee collection

#### 3.2 Fee Logic Migration

**Before (Phase 1):**
```javascript
// api/jup/swap.js
const feeAccount = mint === WSOL 
  ? process.env.VITE_JUPITER_FEE_ACCOUNT_WSOL
  : process.env.VITE_JUPITER_FEE_ACCOUNT_USDC;

// Fee injected via Jupiter API
```

**After (Phase 3):**
```javascript
// Swap.tsx
const feeConfigPDA = await getFeeConfigPDA(programId);
const treasuryPDA = await getTreasuryPDA(programId, mint);

// Fee collected via on-chain instruction
await program.methods
  .collectFee(amount)
  .accounts({ feeConfig: feeConfigPDA, treasury: treasuryPDA })
  .rpc();
```

#### 3.3 Verification Checklist

- [ ] Fee collected correctly on mainnet
- [ ] Treasury PDA receives fees
- [ ] Withdrawal works for authority
- [ ] Swap UX unchanged for users
- [ ] No dependency on Jupiter fee API

---

## 📁 File Reference

### Smart Contract Files
| File | Purpose | Priority |
|------|---------|----------|
| `onyx-protocol/programs/onyx-protocol/src/lib.rs` | Program entrypoint | Core |
| `onyx-protocol/programs/onyx-protocol/src/state.rs` | Account structs | Core |
| `onyx-protocol/programs/onyx-protocol/src/error.rs` | Error definitions | Core |
| `onyx-protocol/programs/onyx-protocol/src/constants.rs` | Constants | Core |
| `onyx-protocol/programs/onyx-protocol/src/instructions/` | Instruction handlers | Core |

### Frontend Files
| File | Purpose | Network |
|------|---------|---------|
| `src/panels/swap/Swap.tsx` | Swap panel UI | Mainnet |
| `src/core/config.ts` | Network configuration | Both |
| `src/services/onyxOnChainBridge.ts` | Protocol bridge | Devnet → Mainnet |
| `src/lib/onyxProgram.ts` | Program IDL & connection | Devnet → Mainnet |

### API Files
| File | Purpose | Phase |
|------|---------|-------|
| `api/jup/quote.js` | Jupiter quote proxy | Phase 1 |
| `api/jup/swap.js` | Jupiter swap + fee injection | Phase 1 → Phase 3 |

---

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build frontend
npm run build

# Build smart contract
cd onyx-protocol && anchor build

# Test on devnet
cd onyx-protocol && anchor test --skip-local-validator

# Deploy to devnet
cd onyx-protocol && anchor deploy --provider.cluster devnet

# Deploy to mainnet (Phase 3)
cd onyx-protocol && anchor deploy --provider.cluster mainnet
```

---

## ⚠️ Important Notes

1. **Don't touch Production code for Devnet testing**
   - Swap panel (`src/panels/swap/`) is ALWAYS mainnet
   - Protocol development happens in `onyx-protocol/`

2. **Network Selection**
   - `CONFIG.MAINNET_RPC` for swap/real transactions
   - `CONFIG.DEVNET_RPC` for protocol development

3. **Fee Logic Transition**
   - Phase 1: Jupiter API handles fee injection
   - Phase 3: Onyx Protocol handles fee on-chain

4. **Devnet Limitations**
   - Airdrop rate-limited to 2 SOL per 8 hours
   - Plan deployment timing accordingly

---

## 📈 Success Metrics

### Phase 1 (Current)
- [ ] Revenue tracking dashboard
- [ ] Monthly fee collection report
- [ ] User adoption metrics

### Phase 2 (Development)
- [ ] All tests passing on devnet
- [ ] Security review completed
- [ ] Gas optimization verified

### Phase 3 (Migration)
- [ ] Mainnet deployment successful
- [ ] Fee collection verified on-chain
- [ ] Zero downtime migration
- [ ] Jupiter independence achieved

---

## 🚀 Quick Reference

**Program ID (Devnet):**
```
FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG
```

**Fee Accounts (Mainnet):**
```
WSOL: 7S7KfighhMhasJrVbkk8R3hKjtM73JuVLe92oXGCyNnT
USDC: EHJqU8SEg12muMp1pb6KH4ghn4UB6rA51KYARetKdAgr
```

**Fee Rate:** 50 bps (0.5%)

---

*This document should be updated as implementation progresses.*