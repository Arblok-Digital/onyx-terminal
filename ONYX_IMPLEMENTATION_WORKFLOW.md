# Onyx Protocol Implementation Workflow

> **Last Updated:** 2026-07-21
> **Status:** TokenAnalysis Track (Active) — Fee Treasury Track (Archived)
> **Supersedes:** Versi lama yang ngarah ke FeeConfig/Treasury — itu udah bukan target.
> **Lihat juga:** `ONYX_ROADMAP_2026.md` (Decision Log & roadmap lengkap)

---

## 🎯 Perubahan Arah

Dokumen ini adalah **revisi total** dari workflow sebelumnya. Perubahan utama:

| Aspek | Dulu (Salah) | Sekarang (Benar) |
|-------|-------------|-------------------|
| **Target protocol** | FeeConfig + Treasury PDA (custody) | OnyxConfig + TokenAnalysis (rug registry) |
| **Fee logic** | Pindah ke on-chain | Tetap di Jupiter API (`platformFeeBps`) |
| **Value prop** | "Punya protokol sendiri" | "On-chain intelligence — rug-score terverifikasi" |
| **Risk profile** | Tinggi (pegang duit user) | Rendah (gak pegang duit siapapun) |
| **Audit diperlukan** | WAJIB kalau mainnet | Tidak diperlukan (gak ada dana dikelola) |

---

## 📊 Arsitektur Protocol Saat Ini

```
┌────────────────────────────────────────────┐
│           ONYX PROTOCOL (DEVNET)            │
├────────────────────────────────────────────┤
│                                             │
│  OnyxConfig (singleton PDA)                 │
│  ├── authority: Pubkey (admin)              │
│  ├── fee_wallet: Pubkey                     │
│  ├── paused: bool                           │
│  └── analysis_count: u64                    │
│                                             │
│  TokenAnalysis (per-mint PDA)               │
│  ├── mint, authority                        │
│  ├── whale_activity (3 fields)              │
│  ├── holder_growth (2 fields)               │
│  ├── dev_activity (3 fields)                │
│  ├── liquidity (4 fields)                   │
│  ├── rugpull_scores (4 fields)              │
│  ├── risk_score                             │
│  └── contract_analysis (4 bool + age)       │
│                                             │
└────────────────────────────────────────────┘
```

**BACA INI DULU sebelum ngoding:** Protocol ini **TIDAK** pegang fee/duit user. Dia cuma nyimpen data intelligence yang ditulis AI agents dan dibaca frontend. Risiko bug di sini paling-paling data analysis salah — bukan duit ilang.

---

## 🔄 Phase 2: TokenAnalysis Hardening (Devnet → Mainnet)

### Step 1: Auth hardening

**Masalah:** Semua orang bisa `init_token_analysis` buat mint sembarang, bisa bikin PDA dusting.

**Fix:**
```rust
// instructions/init_token_analysis.rs
// Tambah constraint: cuma config.authority yang boleh init
fn handler(ctx: Context<InitTokenAnalysis>) -> Result<()> {
    let config = &ctx.accounts.config;
    let authority = &ctx.accounts.authority;
    
    require!(config.paused == false, ProtocolError::Paused);
    require_keys_eq!(authority.key(), config.authority, ProtocolError::Unauthorized);
    // ... sisanya tetap
}
```

**File affected:**
- `instructions/init_token_analysis.rs` — tambah `require_keys_eq!`
- `state.rs` — verify `authority` field on `OnyxConfig` (udah ada)
- **Opsional:** tambah instruction `force_close_token_analysis` buat admin reclaim PDA kalau di-squat

### Step 2: Wire paused flag

**Masalah:** Sekarang cuma `init_token_analysis` yang ngecek `paused`. Update & close skip.

**Fix:** Tambah `require!(config.paused == false, ProtocolError::Paused)` di:
- `instructions/update_token_analysis.rs`
- `instructions/close_token_analysis.rs`

### Step 3: Constants — decide atau delete

**Masalah:** `constants.rs` deklarasiin:
- `MIN_UPDATE_INTERVAL_SECONDS`
- `MAX_ANALYSIS_AGE_SECONDS`
- `StaleAnalysis` error variant di `error.rs`

Tapi gak ada satu pun instruction yang make ini.

**Putusin:**
- **Pilihan A:** Implementasi beneran — `update_token_analysis` tolak kalau < interval, `get_token_analysis` kasih flag `is_stale`.
- **Pilihan B:** Hapus dari code — simpen di doc aja kalo nanti butuh.

Gue saranin **Pilihan B dulu**. Ini premature optimization selama AI agents masih devnet & volume analysis masih kecil.

### Step 4: Test coverage

**Scope minimal** — test 4 instruction:

```bash
cd onyx-protocol
anchor test --skip-local-validator  # devnet
```

**Test cases minimal:**
- [ ] Initialize — sukses bikin config
- [ ] Init token analysis — sukses (authority matched)
- [ ] Init token analysis — gagal kalau caller bukan authority
- [ ] Update token analysis — sukses (field terupdate)
- [ ] Close token analysis — sukses
- [ ] Close token analysis — gagal kalau caller bukan authority

### Step 5: Dogfood di devnet

Biarin AI agents nulis TokenAnalysis beneran ke devnet selama beberapa minggu:
- Pantau transaction success rate
- Cek apakah ada PDA collision atau error aneh
- Verifikasi data yang ditulis AI agents bisa dibaca frontend dengan bener

### Step 6: Mainnet deployment prep

```toml
# Anchor.toml — tambah ini
[programs.mainnet]
onyx_protocol = "FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG"  # ganti nanti

[provider]
cluster = "devnet"  # default tetep devnet sampe mainnet ready
```

**Upgrade authority:**
- Sementara: single wallet (deployer) — oke buat sekarang
- Nanti: multisig/Squads setelah stabil & ada value on-chain yang harus dijaga

---

## 🗑️ FeeConfig/Treasury — Arsip (dulu ngaco, sekarang gak usah dikerjain)

**JANGAN ngerjain ini.** Ini copium dari awal. Penjelasan lengkap di Decision Log `ONYX_ROADMAP_2026.md`.

Yang perlu lo tau:
- **Gak ada kode yang ditulis** buat FeeConfig/Treasury — instructions di `ONYX_IMPLEMENTATION_WORKFLOW.md` lama itu cuma pseudocode yang gak pernah di-compile.
- **Gak ada `fee_config.rs`** atau `treasury.rs` di `instructions/`.
- **State struct FeeConfig & Treasury di `state.rs`** — KALAU ADA (cek dulu), itu harus dihapus.
- **Jangan nulis ulang.** Kalau suatu saat butuh (staking discount / DAO governance), baru pikirin lagi — tapi waktu itu jangan pake doc ini sebagai referensi karena udah outdated.

---

## ⚡ Shortcut: Yang Bisa Dikerjain Sekarang

Prioritas (dari yang paling gampang & berdampak):

| # | Task | File | Waktu |
|---|------|------|-------|
| 1 | Check & hapus FeeConfig/Treasury state (kalau ada) | `state.rs` | 5 menit |
| 2 | Wire paused ke update & close instructions | 2 files | 15 menit |
| 3 | Auth guard init_token_analysis | 1 file | 10 menit |
| 4 | Putuskan constants (saran: hapus dari code) | `constants.rs` + `error.rs` | 5 menit |
| 5 | Test ke-4 instruction | `onyx-protocol/tests/` | 1-2 jam |
| 6 | Dogfood devnet | — | 1-2 minggu |
| 7 | Mainnet deployment prep | `Anchor.toml` | 30 menit |

**✅ Update 2026-07-21:** Confirmed `state.rs` bersih — FeeConfig/Treasury **tidak ada di code**. Tapi `constants.rs` masih bawa 4 constant gak terpakai (`MIN_UPDATE_INTERVAL_SECONDS`, `MAX_ANALYSIS_AGE_SECONDS`, `MAX_DESCRIPTION_LEN`, `MAX_AUTHORITIES`). Todo: hapus atau implementasi. Sementara gue biarin dulu.

---

## 📁 File Reference (Updated)

### Smart Contract Files — TokenAnalysis Track

| File | Purpose | Status |
|------|---------|--------|
| `onyx-protocol/programs/onyx-protocol/src/lib.rs` | Program entrypoint | ✅ Done |
| `onyx-protocol/programs/onyx-protocol/src/state.rs` | OnyxConfig + TokenAnalysis structs | ✅ Done |
| `onyx-protocol/programs/onyx-protocol/src/error.rs` | Error definitions | ✅ Done |
| `onyx-protocol/programs/onyx-protocol/src/constants.rs` | Constants | ⚠️ Decide to keep or delete |
| `onyx-protocol/programs/onyx-protocol/src/instructions/initialize.rs` | Initialize config | ✅ Done |
| `onyx-protocol/programs/onyx-protocol/src/instructions/init_token_analysis.rs` | Init analysis → **tambah auth guard** | 🔜 Phase 2 |
| `onyx-protocol/programs/onyx-protocol/src/instructions/update_token_analysis.rs` | Update analysis → **tambah paused check** | 🔜 Phase 2 |
| `onyx-protocol/programs/onyx-protocol/src/instructions/close_token_analysis.rs` | Close analysis → **tambah paused check** | 🔜 Phase 2 |

### Frontend Files (gak berubah)

| File | Purpose | Network |
|------|---------|---------|
| `src/panels/swap/Swap.tsx` | Swap panel UI | Mainnet |
| `src/core/config.ts` | Network configuration | Both |
| `src/services/onyxOnChainBridge.ts` | Bridge ke on-chain data → AI agents | Devnet → Mainnet |
| `src/lib/onyxProgram.ts` | Anchor program client (borsh manual) | Devnet → Mainnet |
| `src/lib/idl/onyx_protocol.ts` | IDL types + PDA seeds + discriminators | Devnet → Mainnet |

### API Files (gak berubah)

| File | Purpose | Keterangan |
|------|---------|------------|
| `api/jup/quote.js` | Jupiter quote + `platformFeeBps=50` | Phase 1 (tetap) |
| `api/jup/swap.js` | Jupiter swap + fee injection ke ATA | Phase 1 (tetap) |

---

## 🚀 Dev Commands

```bash
# Start frontend (mainnet swap)
npm run dev

# Build smart contract
cd onyx-protocol && anchor build

# Test di devnet
cd onyx-protocol && anchor test --skip-local-validator

# Deploy ke devnet (kalau ada perubahan)
cd onyx-protocol && anchor deploy --provider.cluster devnet
```

---

## ⚠️ Penting

1. **Swap panel (`src/panels/swap/`) = MAINNET.** Jangan touch buat devnet testing.
2. **Onyx Protocol (`onyx-protocol/`) = DEVNET** sampe Phase 2 selesai.
3. **Fee 50bps tetep lewat Jupiter API** — gak bakal pindah ke on-chain.
4. **TokenAnalysis gak pegang duit** — kalau ada bug, paling data analysis rusak, bukan duit ilang.
5. **Kalau nemu referensi FeeConfig/Treasury** di code, hapus aja — itu sisa dari versi lama.

---

*Dokumen ini sinkron dengan `ONYX_ROADMAP_2026.md`. Kalau roadmap berubah, update kedua doc barengan.*
