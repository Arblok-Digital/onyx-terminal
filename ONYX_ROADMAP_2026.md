# Onyx Terminal — Roadmap & Architecture (Ground Truth)

> **Supersedes:** `ONYX_IMPLEMENTATION_WORKFLOW.md` (yang lama nyebut Fee Treasury sebagai Phase 2/3 — itu udah gak jadi arah kita, lihat Decision Log).
> **Status:** Living doc — update tiap ada keputusan arsitektur baru, sama kayak `ONYX_ARCHITECTURE.md`.
> **Konteks:** Solo dev, zero-cost bootstrap. Swap panel udah live mainnet & generating fee revenue. Semua keputusan di bawah dioptimalkan buat itu — stabilkan yang udah jalan dan hasilin duit dulu, baru scale.

---

## 0. Decision Log (biar gak diulang-ulang / gak ke-lupa)

| Keputusan | Kenapa |
|---|---|
| **Swap execution tetap 100% lewat Jupiter aggregator** | Bangun router sendiri = proyek segede Jupiter itu sendiri. Gak realistis buat solo dev, gak perlu juga. |
| **Fee mechanism tetap pakai `platformFeeBps` + `feeAccount` (Jupiter API), bukan program custom** | Sejak Jan 2025 gak perlu Referral Program/dashboard, murni parameter API. ATA fee (WSOL/USDC) udah exist & aktif — gak ada biaya baru. 99% volume swap lu kena fee (in maupun out) karena hampir semua rute lewat SOL/USDC. |
| **On-chain protocol yang dikembangin ke depan = TokenAnalysis (rug-score registry), BUKAN Fee Treasury** | Treasury = custody contract, butuh audit mahal kalau mau aman, dan gak nambah revenue (fee tetap 50bps sama aja). TokenAnalysis gak pegang duit user, resiko lebih rendah kalau ada bug, dan ini justru value proposition asli Onyx Terminal ("on-chain intelligence"). |
| **Fee Treasury/custody program: DITUNDA, bukan dibatalkan** | Baru worth dibangun kalau ada alasan utility konkret yang butuh logic on-chain paksa — misal diskon fee buat staker token ONYX, atau governance DAO. Bukan cuma buat gaya "punya protokol sendiri." |
| **Token ONYX + airdrop: jalan paralel, independen dari keputusan protocol** | Cukup SPL mint biasa, gak butuh Anchor program kompleks. Bisa mulai kapan aja, kriteria airdrop dari data swap yang udah ada. |
| **Hardening fee (nambah instruksi transfer sendiri di luar `platformFeeBps`) = optional, not urgent** | Cuma jaring pengaman kalau Jupiter suatu saat cabut fitur itu. Belum ada tanda-tanda itu bakal kejadian. |

---

## 1. Arsitektur Aktual (koreksi dari doc lama)

```
┌─────────────────────────────────────────────────────────────────┐
│                      ONYX TERMINAL (LIVE)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Swap Panel (src/panels/swap/Swap.tsx)  ──► MAINNET, custom UI    │
│      │  "SWAP MODULE v2 · Custom + Fee Account"                  │
│      │  (bukan Jupiter Plugin lagi — udah lepas dari embed UI)   │
│      ▼                                                            │
│  /api/jup/quote.js  ──►  Jupiter Quote API (platformFeeBps=50)   │
│      ▼                                                            │
│  /api/jup/swap.js   ──►  Jupiter Swap API (feeAccount inject)    │
│      ▼                                                            │
│  Fee ATA (WSOL: 7S7Kf... / USDC: EHJqU...)  ──►  💰 REVENUE      │
│                                                                    │
│  ──────────────────────────────────────────────────────────────  │
│                                                                    │
│  Onyx Protocol (onyx-protocol/) ──► DEVNET, belum ke mainnet     │
│      OnyxConfig (admin, pause flag)                              │
│      TokenAnalysis (rug-score per mint, ditulis AI agents)       │
│      ⚠️ BUKAN FeeConfig/Treasury — itu gak pernah ditulis         │
│                                                                    │
│  ──────────────────────────────────────────────────────────────  │
│                                                                    │
│  AI Agents (intelligent_integration/) ──► NVIDIA (primary,       │
│      via /api/ai/chat.js proxy) → OpenRouter (fallback,          │
│      ⚠️ masih exposed client-side, lihat Phase 0)                 │
│                                                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Yang berubah dari `ONYX_ARCHITECTURE.md` versi lama:** dokumen itu masih nyebut fee logic devnet protocol sebagai "coming soon" pengganti Jupiter — itu udah bukan rencana kita lagi (lihat Decision Log). Update bagian itu pas lu sempet.

---

## 2. Roadmap

### 🟢 Phase 0 — Stabilize & Secure (sekarang, zero cost, kerjain duluan)

Ini semua **kerjaan kode doang, nol biaya infra**, dan langsung ngelindungin revenue engine yang udah jalan.

- [ ] Pindahin `VITE_HELIUS_API_KEY`, `VITE_BIRDEYE_API_KEY`, `VITE_OPENROUTER_API_KEY`, `VITE_NVIDIA_API_KEY` yang masih kebaca client-side (`src/core/config.ts`, `intelligent_integration/services/*`, `FloatingChat.tsx` fallback) ke serverless proxy — samain pola `api/jup/swap.js` / `api/ai/chat.js`.
- [ ] Benerin `ALLOWED_ORIGINS` di `api/jup/quote.js`, `api/jup/swap.js`, `vercel.json` — sekarang nunjuk `arblok-digital.vercel.app`, harusnya domain Onyx Terminal sendiri.
- [ ] Pindahin CSP header dari `vite.config.ts` (`server.headers`, cuma jalan pas dev) ke `vercel.json` (`headers` rule buat `/(.*)`, biar beneran ke-apply di production).
- [ ] Hapus file `deploy.yml` kosong di root (yang asli udah ada di `.github/workflows/deploy.yml`).

### 🟡 Phase 1 — Revenue-Funded Reliability (begitu fee mulai kerasa ngumpul)

- [ ] Cek saldo ATA fee (WSOL/USDC) berkala — bikin monitoring simpel (cron/script kecil, atau manual check tiap minggu dulu juga cukup).
- [ ] Upgrade **Helius ke paid tier duluan** — ini langsung nyentuh reliability swap (= revenue), prioritas di atas AI chat.
- [ ] Baru nyusul NVIDIA/OpenRouter paid tier kalau ada sisa, buat stabilin AI Agents.
- [ ] Backfill test buat jalur duit: `api/jup/quote.js`, `api/jup/swap.js`, fee calculation logic. Ini duluan sebelum nambah test coverage di tempat lain.

### 🔵 Phase 2 — Onyx Protocol Hardening (TokenAnalysis track, devnet → mainnet, pelan-pelan)

- [ ] Batasi `init_token_analysis` — cuma `config.authority` (bot/backend Onyx) yang boleh manggil, atau tambah instruction admin-override buat reclaim PDA yang di-squat orang lain.
- [ ] Wire `paused` check ke `update_token_analysis` dan `close_token_analysis` (sekarang cuma `init_token_analysis` yang ngecek).
- [ ] Putuskan: constants staleness (`MIN_UPDATE_INTERVAL_SECONDS`, `MAX_ANALYSIS_AGE_SECONDS`, `StaleAnalysis`) mau diimplementasi beneran atau dihapus — sekarang cuma dideklarasiin, gak dipake.
- [ ] Tambah test buat 4 instruction (`initialize`, `init_token_analysis`, `update_token_analysis`, `close_token_analysis`) — scope kecil, gak perlu segede swap flow.
- [ ] Dogfooding di devnet — biarin AI agents nulis/baca data beneran beberapa minggu, pantau stabil apa nggak.
- [ ] Tambah `[programs.mainnet]` di `Anchor.toml` + putusin upgrade authority (single wallet buat sekarang oke, tapi rencanain migrasi ke multisig/Squads begitu udah stabil & ada value on-chain yang harus dijaga).
- [ ] Update `ONYX_IMPLEMENTATION_WORKFLOW.md` (atau ganti total sama doc ini) biar nyebut TokenAnalysis sebagai target aktual, arsipin bagian FeeConfig/Treasury sebagai "future, conditional."

### 🟣 Phase 3 — Token ONYX + Airdrop (paralel, independen, bisa mulai kapan aja)

- [ ] Mint SPL token ONYX (murah, ~0.01 SOL, gak butuh Anchor program).
- [ ] Tarik kriteria airdrop dari data yang **udah ada**: volume swap per wallet dari fee ATA / log `api/jup/quote`+`swap`.
- [ ] Pasang threshold volume/aktivitas (contek pola Jupiter sendiri pas airdrop JUP) — biar gak kena airdrop farming (connect-swap-recehan-hilang).
- [ ] Hati-hati framing marketing: **jangan janjiin token "backed by treasury/revenue"** atau ada ekspektasi return finansial — itu mulai masuk area yang bisa dianggap instrumen investasi (ranah OJK/Bappebti di Indonesia). Framing "reward buat early user" jauh lebih aman.
- [ ] (Opsional, later) Kalau mau token ONYX punya utility beneran (bukan cuma reward dump), staking-buat-diskon-fee bisa jadi alasan konkret buat akhirnya bangun program Anchor kecil — ini pintu masuk yang lebih valid ke arah "protokol sendiri" dibanding Treasury generic.

### ⚪ Phase 4 — Conditional / Future (jangan dikerjain sampai ada sinyal konkret)

- [ ] **Fee hardening:** tambah instruksi transfer SPL sendiri di `api/jup/swap.js` (di luar `platformFeeBps`) sebagai fallback kalau Jupiter suatu saat cabut fitur fee-nya. Murah buat dikerjain (~jam, bukan minggu) begitu memang perlu — gak usah preventif sekarang.
- [ ] **Fee Treasury/custody program:** cuma kalau ada kebutuhan logic on-chain yang gak bisa diakalin instruction biasa (staking discount, DAO governance fee rate). Butuh audit kalau mau aman — budget-in itu, jangan skip.
- [ ] **Priority fee dinamis:** ganti `prioritizationFeeLamports: 2000000` yang hardcoded di `api/jup/swap.js` jadi dynamic estimation dari Jupiter kalau mulai ada keluhan swap gagal pas network congestion.

---

## 3. Kalau bingung mulai dari mana

Urutan paling logis: **Phase 0 semua item dulu** (satu-dua sesi kerja bareng agent, nol biaya, langsung ngelindungin apa yang udah jalan) → baru **Phase 3 (token+airdrop)** bisa disicil paralel karena independen dan murah → **Phase 2** jalan pelan di background tiap ada waktu luang → **Phase 1** items nyusul otomatis begitu ada revenue yang kerasa → **Phase 4** ditinggal sampai beneran dibutuhin.
