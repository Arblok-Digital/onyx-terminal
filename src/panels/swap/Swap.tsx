/**
 * @file Swap.tsx
 * @layer panel
 * @desc Custom Swap modal — Onyx Proxy powered, fee otomatis ke ATA.
 *       Pilih FROM/TO token Solana (preset KNOWN), atau paste CA.
 *       Quote dari proxy /api/jup/quote, eksekusi swap via /api/jup/swap,
 *       lalu sign & send dengan wallet Phantom.
 * @exposes default Swap
 * @deps hooks/useJupiterQuote.js, core/store/ui.store.js
 */

import { useEffect, useMemo, useState } from "react";
import { Buffer } from "buffer";
import { VersionedTransaction, Connection, PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  useJupiterTokenInfo,
  KNOWN_TOKENS,
  isValidSolanaMint,
} from "../../hooks/useJupiterQuote";
import { useUiStore } from "../../core/store/ui.store";
import css from "./Swap.module.css";
import { CONFIG } from "../../core/config";
import { trackSwap } from "../../core/analytics";

const KNOWN_LIST = Object.values(KNOWN_TOKENS);

// Helper: Format label token agar tidak double address
function getTokenLabel(info: any) {
  if (!info) return "";
  if (info.symbol === "UNKN" || !info.symbol) return `· ${shortMint(info.mint)}`;
  return `· ${info.symbol} · ${shortMint(info.mint)}`;
}

// Helper: short mint address
function shortMint(m: string | null | undefined) {
  if (!m) return "";
  return m.length <= 10 ? m : `${m.slice(0, 4)}…${m.slice(-4)}`;
}

// Helper: format output amount
function formatOut(rawStr, decimals) {
  if (!rawStr) return "—";
  try {
    const n = Number(rawStr) / Math.pow(10, decimals);
    if (!Number.isFinite(n)) return "—";
    
    // Logic cerdas: Kalau angka > 1000, desimal cukup 2 aja biar nggak berantakan.
    // Kalau angka kecil (misal 0.0001), tampilkan desimal lebih banyak biar presisi.
    const maxDec = n >= 1000 ? 2 : (n >= 1 ? 4 : Math.min(decimals, 8));

    return n.toLocaleString("id-ID", { 
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDec,
      useGrouping: true 
    });
  } catch {
    return "—";
  }
}

// Proxy URL - Bersihkan trailing slash jika ada
const PROXY_BASE = (import.meta.env.VITE_JUP_PROXY_URL || "").replace(/\/$/, "");

export default function Swap() {
  const open = useUiStore((s) => s.swapOpen);
  const close = useUiStore((s) => s.closeSwap);
  const selected = useUiStore((s) => s.selectedToken);

  // Form state
  const [fromMint, setFromMint] = useState(KNOWN_TOKENS.SOL.mint);
  const [toMint, setToMint] = useState(KNOWN_TOKENS.USDC.mint);
  const [amount, setAmount] = useState("0.1");
  const [pasteCa, setPasteCa] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [pasteErr, setPasteErr] = useState("");
  const [pasteTarget, setPasteTarget] = useState("to");

  // Quote state
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [isSafeLocked, setIsSafeLocked] = useState(false);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(20);

  // Swap execution state
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState("");
  const [swapSuccess, setSwapSuccess] = useState("");

  // Solana Wallet Adapter Hook
  const { 
    publicKey, 
    wallet, 
    disconnect, 
    select, 
    wallets, 
    signTransaction 
  } = useWallet();

  const [showMenu, setShowMenu] = useState(false);

  const connectTo = (walletAdapter: any) => {
    select(walletAdapter.adapter.name);
    setShowMenu(false);
  };

  const handleConnectClick = () => {
    setShowMenu(!showMenu);
  };

  // Fetch Balances (SOL & SPL)
  useEffect(() => {
    // Pengecekan ketat: pastikan publicKey valid dan memiliki method toBase58
    if (!open || !publicKey || typeof publicKey.toBase58 !== 'function') {
      if (!publicKey) setBalances({});
      return;
    }

    const fetchAllBalances = async () => {
      try {
        const connection = new Connection(CONFIG.HELIUS_RPC(CONFIG.HELIUS_API_KEY));
        const newBalances: Record<string, number> = {};

        // 1. Fetch SOL Balance secara aman
        try {
          const solBal = await connection.getBalance(publicKey);
          newBalances[KNOWN_TOKENS.SOL.mint] = solBal / 1e9;
        } catch (e) {
          console.warn("Gagal fetch saldo SOL:", e);
        }

        // 2. Fetch SPL Balances (Legacy & Token2022)
        try {
          const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
          const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

          const [spl, spl2022] = await Promise.all([
            connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID }),
            connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_2022_PROGRAM_ID })
          ]);

          [...spl.value, ...spl2022.value].forEach((acc) => {
            const info = acc.account.data.parsed.info;
            if (info && info.mint) {
              newBalances[info.mint] = info.tokenAmount.uiAmount || 0;
            }
          });
        } catch (e) {
          console.warn("Gagal fetch saldo token SPL:", e);
        }

        setBalances(newBalances);
      } catch (err) {
        console.error("Failed to fetch wallet balances:", err);
      }
    };

    fetchAllBalances();
  }, [open, publicKey, refreshTick]);

  // Resolve token info
  const toResolved = useJupiterTokenInfo(toMint);
  const fromResolved = useJupiterTokenInfo(fromMint);

  const tokenMap = useMemo(() => {
    const m: Record<string, any> = {};
    // 1. Masukkan koin-koin "Sepuh" (Big Cap) yang sudah kita hardcode
    for (const t of KNOWN_LIST) m[t.mint] = t;

    // 2. Tambahkan info dari Jupiter, tapi JANGAN timpa koin yang sudah ada
    // kecuali koin yang sudah ada itu simbolnya masih 'UNKN'
    if (toResolved && (!m[toResolved.mint] || (m[toResolved.mint].symbol === "UNKN" && toResolved.symbol !== "UNKN"))) {
      m[toResolved.mint] = toResolved;
    }
    if (fromResolved && (!m[fromResolved.mint] || (m[fromResolved.mint].symbol === "UNKN" && fromResolved.symbol !== "UNKN"))) {
      m[fromResolved.mint] = fromResolved;
    }
    return m;
  }, [toResolved, fromResolved]);

  const fromInfo = tokenMap[fromMint];
  const toInfo = tokenMap[toMint];

  const amountRaw = useMemo(() => {
    if (!fromInfo) return 0;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return 0;
    return Math.floor(amt * Math.pow(10, fromInfo.decimals));
  }, [amount, fromInfo]);

  // Auto-refresh timer: Hitung mundur & Update quote setiap 20 detik
  useEffect(() => {
    if (!open || swapping) return;
    
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setRefreshTick(t => t + 1);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [open, swapping]);

  // Reset countdown tiap kali user ubah parameter koin/amount
  useEffect(() => {
    setTimeLeft(20);
  }, [fromMint, toMint, amountRaw, slippage]);

  // Prefill TO token ketika modal dibuka dan selected token adalah Solana
  useEffect(() => {
    if (!open) return;
    setPasteErr("");
    setPasteCa("");
    if (selected && selected.chainId === "solana" && selected.address) {
      setToMint(selected.address); // Tidak perlu set allowPump lagi
    }
    setIsSafeLocked(false);
  }, [open, selected]);

  // Fetch quote via proxy
  useEffect(() => {
    let cancelled = false;

    if (!open || !fromMint || !toMint || !amountRaw) {
      if (!cancelled) setQuote(null);
      setIsSafeLocked(false);
      return;
    }

    setQuoteLoading(true);
    setQuoteError("");
    
    // Anti-Flicker: Jangan hapus quote lama saat refresh harga agar UI tidak "mental"
    setQuote(prev => {
      if (!prev) return null;
      if (prev.inputMint !== fromMint || prev.outputMint !== toMint) return null;
      return prev;
    });

    const slippageBps = slippage.toLowerCase().trim() === 'auto' 
      ? 'auto' 
      : Math.floor(Number(slippage) * 100) || 50;

    const params = new URLSearchParams({
      inputMint: fromMint,
      outputMint: toMint,
      amount: String(amountRaw),
      slippageBps: String(slippageBps),
      isSafeLocked: String(isSafeLocked)
    });

    const url = `${PROXY_BASE}/api/jup/quote?${params}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) {
          // Cek apakah response berupa JSON atau HTML error dari Vercel
          return res.text().then(text => {
            try {
              const json = JSON.parse(text);
              throw new Error(json.error || "Quote failed");
            } catch {
              // Jika teks bukan JSON, berarti dapet HTML (404/500)
              throw new Error(`Server Error (${res.status}). Pastikan /api sudah terdeploy atau proxy lokal nyala.`);
            }
          });
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setQuote(data);
          // Cek rute: Jika tidak lewat Pump.fun, kunci jalurnya!
          const hasPump = data.routePlan?.some((step: any) => 
            step.swapInfo.label.toLowerCase().includes("pump")
          );
          if (!hasPump && data.routePlan?.length > 0) setIsSafeLocked(true);
        }
      })
      .catch((err) => {
        console.error("Fetch error details:", err);
        if (!cancelled) {
          setQuote(null); // Bersihkan jalur jika quote gagal
          setQuoteError(err.message === "Failed to fetch" ? "Serverless Proxy tidak merespon. Pastikan Environment Variables sudah di-set di Vercel." : err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, fromMint, toMint, amountRaw, slippage, refreshTick]); // Hapus allowPump dari dependencies

  // Eksekusi swap
  const executeSwap = async () => {
    if (!quote || !publicKey || !signTransaction) return;
    
    setSwapping(true);
    setSwapError("");
    setSwapSuccess("");

    try {
      const swapRes = await fetch(`${PROXY_BASE}/api/jup/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toBase58(),
          wrapAndUnwrapSol: true,
        }),
      });

      if (!swapRes.ok) {
        const err = await swapRes.json();
        throw new Error(err.error || "Swap API error");
      }

      const { swapTransaction } = await swapRes.json();

      // Deserialize base64 ke VersionedTransaction agar wallet bisa mengenali datanya
      const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
      
      // Sign transaksi
      const signed = await signTransaction(transaction);
      
      // Kirim via RPC (Gunakan Helius dari config)
      const connection = new Connection(CONFIG.HELIUS_RPC(CONFIG.HELIUS_API_KEY));
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
      });

      setSwapSuccess(signature);
      
      // Analytics: Track successful swap to Supabase
      trackSwap(
        fromInfo?.symbol || fromMint,
        toInfo?.symbol || toMint,
        Number(amount)
      );

      setQuote(null);
    } catch (e) {
      console.error("Execute Swap Error:", e);
      let msg = e.message || String(e);

      // Handle Jupiter Slippage Error (0x1771 atau 6001)
      if (msg.includes("0x1771") || msg.includes("6001")) {
        msg = "SLIPPAGE ERROR: Harga bergerak terlalu cepat. Naikkan Slippage (misal: 10 atau ketik 'auto') dan coba lagi.";
      } else if (msg.includes("User rejected")) {
        msg = "Transaksi dibatalkan di wallet.";
      } else if (msg.includes("0x177e") || msg.includes("6006")) {
        msg = "SALDO SOL TIPIS: Sisa SOL di wallet tidak cukup untuk biaya 'Rent' akun token baru.";
      } else if (msg.includes("too large")) {
        msg = "Transaksi terlalu kompleks. Coba rute lain.";
      }
      
      setSwapError(msg);
    } finally {
      setSwapping(false);
    }
  };

  // Keyboard Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const flip = () => { const a = fromMint; setFromMint(toMint); setToMint(a); };

  const tryUseCa = () => {
    const v = pasteCa.trim();
    if (!v) { setPasteErr(""); return; }
    if (!isValidSolanaMint(v)) {
      setPasteErr("Format CA invalid — harus base58 Solana mint (32-44 char).");
      return;
    }
    setPasteErr("");
    if (pasteTarget === "from") setFromMint(v); else setToMint(v);
    // Tidak perlu set allowPump lagi
    // setAllowPump(false); 
    setPasteCa("");
  };

  const onPasteKey = (e) => { if (e.key === "Enter") { e.preventDefault(); tryUseCa(); } };

  const renderTokenOptions = () => {
    const opts = [];
    const knownMints = new Set(KNOWN_LIST.map(t => t.mint));

    // 1. Group: Koin Umum (SOL, USDC, dll)
    opts.push(
      <optgroup key="common" label="COMMON TOKENS">
        {KNOWN_LIST.map(t => (
          <option key={t.mint} value={t.mint}>{t.symbol}</option>
        ))}
      </optgroup>
    );

    // 2. Group: Koin di Wallet (Saldo > 0)
    const walletOpts = [];
    Object.entries(balances).forEach(([mint, amount]) => {
      if (amount <= 0 || knownMints.has(mint)) return;
      
      const info = tokenMap[mint];
      const label = info && info.symbol !== "UNKN" 
        ? `${info.symbol} (${amount.toLocaleString()})`
        : `${shortMint(mint)} (${amount.toLocaleString()})`;
        
      walletOpts.push(<option key={mint} value={mint}>{label}</option>);
    });

    if (walletOpts.length > 0) {
      opts.push(<optgroup key="wallet" label="YOUR WALLET">{walletOpts}</optgroup>);
    }

    // 3. Group: Custom / Hasil Paste CA (Tanpa Saldo)
    const customOpts = [];
    Object.values(tokenMap).forEach((t: any) => {
      if (knownMints.has(t.mint) || (balances[t.mint] && balances[t.mint] > 0)) return;
      const label = (t.symbol && t.symbol !== "UNKN") ? `${t.symbol} · ${shortMint(t.mint)}` : shortMint(t.mint);
      customOpts.push(<option key={t.mint} value={t.mint}>{label}</option>);
    });

    if (customOpts.length > 0) {
      opts.push(<optgroup key="custom" label="RECENT / CUSTOM">{customOpts}</optgroup>);
    }

    return opts;
  };

  const outDisplay = quote && toInfo ? formatOut(quote.outAmount, toInfo.decimals) : "—";
  const impactPct = quote ? Number(quote.priceImpactPct) * 100 : null;

  return (
    <div className={css.panelContainer}>
      <div className={css.modalInsidePanel}>
        <div className={css.header}>
          <div>
            <span className={css.title}>SWAP</span>
            <span className={css.sub}>via Onyx Proxy · Secure Routing</span>
          </div>
          {quote && !swapping && (
            <div className={css.refreshIndicator}>
              <span className={css.refreshDot} />
              <span className={css.refreshText}>
                {quoteLoading ? "UPDATING..." : `REFRESH IN ${timeLeft}S`}
              </span>
            </div>
          )}
          <button className={css.close} onClick={close} title="Close (Esc)">×</button>
        </div>

        <div className={css.body}>
          {/* Wallet status */}
          <div className={css.walletStatus}>
            {publicKey ? (
              <div className={css.walletInfo}>
                <span className={css.walletOk}>🟢 {shortMint(publicKey.toBase58())} ({wallet?.adapter.name})</span>
                <button onClick={() => disconnect()} className={css.disconnectBtn}>Disconnect</button>
              </div>
            ) : showMenu ? (
              <div className={css.walletInfo} style={{ gap: '4px', flexWrap: 'wrap' }}>
                {wallets.map(w => (
                  <button 
                    key={w.adapter.name} 
                    onClick={() => connectTo(w)} 
                    className={css.disconnectBtn} 
                    style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                  >
                    {w.adapter.name}
                  </button>
                ))}
                <button onClick={() => setShowMenu(false)} className={css.disconnectBtn}>×</button>
              </div>
            ) : (
              <button onClick={handleConnectClick} className={`${css.btn} ${css.ghost}`}>
                Connect Wallet
              </button>
            )}
          </div>

          {/* FROM */}
          <div className={css.slot}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span className={css.slotLabel}>From {getTokenLabel(fromInfo)}</span>
              {publicKey && balances[fromMint] !== undefined && (
                <span 
                  className={css.metaValue} 
                  style={{ cursor: 'pointer', fontSize: '10px', color: 'var(--accent)', opacity: 0.8 }}
                  onClick={() => {
                    const bal = balances[fromMint];
                    // 🔥 FIX: Jika SOL, kita WAJIB sisakan sedikit (0.005) buat gas fee.
                    // Tanpa ini, transaksi 'Max' SOL pasti gagal simulation (error 0x177e).
                    const safeAmt = fromMint === KNOWN_TOKENS.SOL.mint 
                      ? Math.max(0, bal - 0.005) 
                      : bal;
                    setAmount(String(safeAmt));
                  }}
                >
                  Wallet: {balances[fromMint].toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>
              )}
            </div>
            <div className={css.slotRow}>
              <select className={css.tokenSelect} value={fromMint} onChange={(e) => {
                setFromMint(e.target.value);
              }}>
                {renderTokenOptions()}
              </select>
              <input className={css.amountInput} type="number" step="any" min="0" placeholder="0.0"
                value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>

          <button className={css.flipBtn} onClick={flip} title="Flip direction">⇅</button>

          {/* TO */}
          <div className={css.slot}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span className={css.slotLabel}>To {quoteLoading && "(quoting…)"} {getTokenLabel(toInfo)}</span>
              {publicKey && balances[toMint] !== undefined && (
                <span className={css.metaValue} style={{ fontSize: '10px', opacity: 0.5 }}>
                  Wallet: {balances[toMint].toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>
              )}
            </div>
            <div className={css.slotRow}>
              <select className={css.tokenSelect} value={toMint} onChange={(e) => {
                setToMint(e.target.value);
              }}>
                {renderTokenOptions()}
              </select>
              <span className={css.amountReadonly}>{outDisplay}</span>
            </div>
          </div>

          {/* Paste CA */}
          <div className={css.caRow}>
            <select className={css.caTarget} value={pasteTarget} onChange={(e) => setPasteTarget(e.target.value)}>
              <option value="to">→ TO</option>
              <option value="from">→ FROM</option>
            </select>
            <input className={css.caInput} type="text" placeholder="Paste Solana CA (mint address)…"
              value={pasteCa} onChange={(e) => setPasteCa(e.target.value)} onKeyDown={onPasteKey}
              spellCheck={false} autoComplete="off" />
            <button className={css.caBtn} onClick={tryUseCa} disabled={!pasteCa.trim()}>Use</button>
          </div>
          {pasteErr && <div className={css.error}>{pasteErr}</div>}
          {quoteError && <div className={css.error}>{quoteError}</div>}

          {/* Slippage Control - Selalu muncul agar user bisa set 'auto' saat quote gagal */}
          <div className={css.settingsRow}>
            <span className={css.metaLabel}>Slippage Config</span>
            <div className={css.slippageContainer}>
              <div className={css.slippagePresets}>
                {['0.5', '1.0', 'auto'].map((val) => (
                  <button 
                    key={val} 
                    className={`${css.disconnectBtn} ${slippage === val ? css.activePreset : ""}`}
                    style={{ padding: '3px 8px', fontSize: '10px', textTransform: 'uppercase' }}
                    onClick={() => setSlippage(val)}
                  >
                    {val === 'auto' ? 'Auto' : `${val}%`}
                  </button>
                ))}
              </div>
              <input 
                className={css.slippageInput} 
                type="text" 
                value={slippage} 
                onChange={(e) => setSlippage(e.target.value)} 
              />
            </div>
          </div>

          {swapError && <div className={css.error}>{swapError}</div>}
          {swapSuccess && (
            <div className={css.success}>
              <div>SWAP BERHASIL!</div>
              <a 
                href={`https://solscan.io/tx/${swapSuccess}`} 
                target="_blank" 
                rel="noreferrer"
                className={css.successLink}
              >
                Lihat di Solscan: {shortMint(swapSuccess)}
              </a>
            </div>
          )}

          {/* Quote metadata */}
          {quote && (
            <div className={css.meta}>
              <span className={css.metaLabel}>Rate</span>
              <span className={css.metaValue}>
                {quote && toInfo && fromInfo
                  ? `1 ${fromInfo.symbol === "UNKN" ? shortMint(fromInfo.mint) : fromInfo.symbol} ≈ ${formatOut(
                      String(Math.round((Number(quote.outAmount) / Math.max(1, Number(quote.inAmount))) * Math.pow(10, fromInfo.decimals))),
                      toInfo.decimals,
                    )} ${toInfo.symbol === "UNKN" ? shortMint(toInfo.mint) : toInfo.symbol}`
                  : "—"}
              </span>

              {/* Info Status untuk Token Baru/Unlisted */}
              {(() => {
                const isToKnown = KNOWN_LIST.some(t => t.mint === toMint);
                // Cek secara real-time apakah Jupiter merutekan transaksi ini via Pump.fun AMM
                const hasPumpRoute = quote?.routePlan?.some(step => 
                  step.swapInfo.label.toLowerCase().includes("pump")
                );

                let statusLabel = "COMMUNITY VERIFIED (SAFE)";
                let statusColor = "#2ecc71"; // Hijau untuk rute umum (Raydium, Meteora, Orca)
                let statusClass = css.metaValue;

                if (hasPumpRoute) {
                  statusLabel = "PUMP.FUN DEGEN";
                  statusColor = "#f39c12"; // Oranye untuk rute berisiko tinggi
                  statusClass = `${css.metaValue} ${css.warn}`;
                } else if (isToKnown) {
                  statusLabel = "VERIFIED BLUECHIP";
                  statusColor = "#3b82f6"; // Biru untuk Big Caps (SOL, USDC, BONK, dll)
                }

                return (
                  <>
                    <span className={css.metaLabel}>Token Status</span>
                    <span className={statusClass} style={{ color: statusColor, fontWeight: '800' }}>
                      {statusLabel}
                    </span>
                  </>
                );
              })()}

              <span className={css.metaLabel}>Price impact</span>
              <span className={
                impactPct == null ? css.metaValue :
                impactPct >= 5 ? `${css.metaValue} ${css.bad}` :
                impactPct >= 1 ? `${css.metaValue} ${css.warn}` : css.metaValue
              }>
                {impactPct == null ? "—" : impactPct.toFixed(3) + "%"}
              </span>
              <span className={css.metaLabel}>Route hops</span>
              <span className={css.metaValue}>{quote.routePlan?.length ?? "—"}</span>
              <span className={css.metaLabel}>Slippage</span>
              <div className={css.metaValue} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div className={css.slippagePresets}>
                  {['0.5', '1.0', 'auto'].map((val) => (
                    <button 
                      key={val} 
                      className={`${css.disconnectBtn} ${slippage === val ? css.activePreset : ""}`}
                      style={{ padding: '2px 6px', fontSize: '9px', textTransform: 'uppercase' }}
                      onClick={() => setSlippage(val)}
                    >
                      {val === 'auto' ? 'Auto' : `${val}%`}
                    </button>
                  ))}
                </div>
                <input 
                  className={css.slippageInput} 
                  type="text" 
                  value={slippage} 
                  onChange={(e) => setSlippage(e.target.value)} 
                />
              </div>
            </div>
          )}

          {/* Visual Route Plan */}
          {quote && quote.routePlan && (
            <div className={css.routeContainer}>
              <span className={css.routeTitle}>Execution Route</span>
              <div className={css.routeFlow}>
                <span className={css.routeStep}>{fromInfo?.symbol || "IN"}</span>
                {quote.routePlan.map((step: any, idx: number) => (
                  <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className={css.routeArrow}>→</span>
                    <span className={css.routeStep} title={`${step.percent}% volume`}>{step.swapInfo.label}</span>
                  </span>
                ))}
                <span className={css.routeArrow}>→</span>
                <span className={css.routeStep}>{toInfo?.symbol || "OUT"}</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className={css.actions}>
            <button className={`${css.btn} ${css.ghost}`} onClick={close}>Cancel</button>
            <button className={css.btn} disabled={swapping || !quote || !publicKey} onClick={executeSwap}>
              {swapping ? "Swapping…" : "Swap Now"}
            </button>
          </div>

          <div className={css.hint}>
            {publicKey ? "Konfirmasi transaksi di wallet Anda. Rute dioptimalkan otomatis untuk eksekusi terbaik." : "Connect Wallet untuk memulai swap."}
          </div>
        </div>

        <div className={css.footer}>
          <span>SWAP MODULE v2 · Custom + Fee Account</span>
          <span>Proxy · {shortMint(PROXY_BASE)}</span>
        </div>
      </div>
    </div>
  );
}