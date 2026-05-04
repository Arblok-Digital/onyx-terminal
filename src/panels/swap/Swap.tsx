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
import { VersionedTransaction } from "@solana/web3.js";
import {
  useJupiterTokenInfo,
  KNOWN_TOKENS,
  isValidSolanaMint,
} from "../../hooks/useJupiterQuote";
import { useUiStore } from "../../core/store/ui.store";
import css from "./Swap.module.css";

const KNOWN_LIST = Object.values(KNOWN_TOKENS);

// Helper: Format label token agar tidak double address
function getTokenLabel(info) {
  if (!info) return "";
  if (info.symbol === "UNKN" || !info.symbol) return `· ${shortMint(info.mint)}`;
  return `· ${info.symbol} · ${shortMint(info.mint)}`;
}

// Helper: short mint address
function shortMint(m) {
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

// Proxy URL (bisa disesuaikan via .env)
const PROXY_BASE = import.meta.env.VITE_JUP_PROXY_URL || "http://localhost:3001";

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

  // Swap execution state
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState("");
  const [swapSuccess, setSwapSuccess] = useState("");

  // Wallet
  const [wallet, setWallet] = useState(null);
  const [walletReady, setWalletReady] = useState(false);

  // Resolve token info
  const toResolved = useJupiterTokenInfo(toMint);
  const fromResolved = useJupiterTokenInfo(fromMint);

  const tokenMap = useMemo(() => {
    const m = {};
    for (const t of KNOWN_LIST) m[t.mint] = t;
    if (toResolved) m[toResolved.mint] = toResolved;
    if (fromResolved) m[fromResolved.mint] = fromResolved;
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

  // Auto-refresh timer: Update quote setiap 20 detik
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      // Hanya refresh jika sedang tidak loading dan tidak sedang proses swap
      if (!quoteLoading && !swapping) setRefreshTick(t => t + 1);
    }, 20000); 
    return () => clearInterval(interval);
  }, [open, quoteLoading, swapping]);

  // Prefill TO token ketika modal dibuka dan selected token adalah Solana
  useEffect(() => {
    if (!open) return;
    setPasteErr("");
    setPasteCa("");
    if (selected && selected.chainId === "solana" && selected.address) {
      setToMint(selected.address);
    }
  }, [open, selected]);

  // Fetch quote via proxy
  useEffect(() => {
    if (!open || !fromMint || !toMint || !amountRaw) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    setQuoteLoading(true);
    setQuoteError("");

    const slippageBps = Math.floor(Number(slippage) * 100) || 50;

    const params = new URLSearchParams({
      inputMint: fromMint,
      outputMint: toMint,
      amount: String(amountRaw),
      slippageBps: String(slippageBps),
    });

    fetch(`${PROXY_BASE}/api/jup/quote?${params}`)
      .then((res) => {
        if (!res.ok) return res.json().then((err) => { throw new Error(err.error || "Quote failed"); });
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setQuote(data);
      })
      .catch((err) => {
        if (!cancelled) setQuoteError(err.message);
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, fromMint, toMint, amountRaw, slippage, refreshTick]);

  // Global Wallet Detection (Phantom, Solflare, Backpack, etc.)
  useEffect(() => {
    const checkWallet = async () => {
      const provider = window?.solana || window?.solflare || window?.backpack;
      if (provider) {
        try {
          const resp = await provider.connect({ onlyIfTrusted: true });
          setWallet(resp.publicKey.toString());
          setWalletReady(true);
        } catch {
          setWalletReady(true);
        }
      } else {
        setWalletReady(false);
      }
    };
    if (open) checkWallet();
  }, [open]);

  const connectWallet = async () => {
    const provider = window?.solana || window?.solflare || window?.backpack;
    if (!provider) {
      alert("No Solana wallet found. Please install Phantom, Solflare or Backpack.");
      return;
    }
    try {
      const resp = await provider.connect();
      setWallet(resp.publicKey.toString());
    } catch (e) {
      console.error("Connect failed:", e);
    }
  };

  const disconnectWallet = async () => {
    const provider = window?.solana || window?.solflare || window?.backpack;
    if (provider) {
      try {
        await provider.disconnect();
        setWallet(null);
      } catch (e) {
        console.error("Disconnect failed:", e);
      }
    }
  };

  // Eksekusi swap
  const executeSwap = async () => {
    if (!quote || !wallet) return;
    setSwapping(true);
    setSwapError("");
    setSwapSuccess("");

    try {
      const swapRes = await fetch(`${PROXY_BASE}/api/jup/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: wallet,
          wrapAndUnwrapSol: true,
        }),
      });

      if (!swapRes.ok) {
        const err = await swapRes.json();
        throw new Error(err.error || "Swap API error");
      }

      const { swapTransaction } = await swapRes.json();

      const provider = window?.solana || window?.solflare || window?.backpack;
      // Deserialize base64 ke VersionedTransaction agar wallet bisa mengenali datanya
      const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
      const signed = await provider.signTransaction(transaction);

      const signature = await provider.request({
        method: "sendTransaction",
        params: {
          transaction: Buffer.from(signed.serialize()).toString("base64"),
          options: { skipPreflight: false },
        },
      });

      setSwapSuccess(signature);
      setQuote(null);
    } catch (e) {
      setSwapError(e.message || "Swap gagal");
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
    setPasteCa("");
  };

  const onPasteKey = (e) => { if (e.key === "Enter") { e.preventDefault(); tryUseCa(); } };

  const renderTokenOptions = () => {
    const opts = [];
    // 1. Render KNOWN_TOKENS (SOL, USDC, etc)
    for (const t of KNOWN_LIST) {
      opts.push(<option key={t.mint} value={t.mint}>{t.symbol}</option>);
    }
    // 2. Render Custom tokens from map (CA based)
    for (const t of Object.values(tokenMap)) {
      if (KNOWN_TOKENS[t.symbol]?.mint === t.mint) continue;
      const label = (t.symbol && t.symbol !== "UNKN") ? `${t.symbol} · ${shortMint(t.mint)}` : shortMint(t.mint);
      opts.push(
        <option key={t.mint} value={t.mint}>
          {label}
        </option>
      );
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
            <span className={css.sub}>via Onyx Proxy · Fee to ATA</span>
          </div>
          <button className={css.close} onClick={close} title="Close (Esc)">×</button>
        </div>

        <div className={css.body}>
          {/* Wallet status */}
          <div className={css.walletStatus}>
            {wallet ? (
              <div className={css.walletInfo}>
                <span className={css.walletOk}>🟢 {shortMint(wallet)}</span>
                <button onClick={disconnectWallet} className={css.disconnectBtn}>Disconnect</button>
              </div>
            ) : walletReady ? (
              <button onClick={connectWallet} className={`${css.btn} ${css.ghost}`}>Connect Wallet</button>
            ) : (
              <span className={css.walletErr}>No wallet detected</span>
            )}
          </div>

          {/* FROM */}
          <div className={css.slot}>
            <span className={css.slotLabel}>From {getTokenLabel(fromInfo)}</span>
            <div className={css.slotRow}>
              <select className={css.tokenSelect} value={fromMint} onChange={(e) => setFromMint(e.target.value)}>
                {renderTokenOptions()}
              </select>
              <input className={css.amountInput} type="number" step="any" min="0" placeholder="0.0"
                value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>

          <button className={css.flipBtn} onClick={flip} title="Flip direction">⇅</button>

          {/* TO */}
          <div className={css.slot}>
            <span className={css.slotLabel}>To {quoteLoading && "(quoting…)"} {getTokenLabel(toInfo)}</span>
            <div className={css.slotRow}>
              <select className={css.tokenSelect} value={toMint} onChange={(e) => setToMint(e.target.value)}>
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
                  ? `1 ${fromInfo.symbol === "???" ? shortMint(fromInfo.mint) : fromInfo.symbol} ≈ ${formatOut(
                      String(Math.round((Number(quote.outAmount) / Math.max(1, Number(quote.inAmount))) * Math.pow(10, fromInfo.decimals))),
                      toInfo.decimals,
                    )} ${toInfo.symbol === "???" ? shortMint(toInfo.mint) : toInfo.symbol}`
                  : "—"}
              </span>

              {/* Info Keterangan Unknown Token di bawah */}
              {(fromInfo?.symbol === "???" || toInfo?.symbol === "???") && (
                <>
                  <span className={css.metaLabel}>Token Status</span>
                  <span className={`${css.metaValue} ${css.warn}`}>Unknown Token (???)</span>
                </>
              )}

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
              <div className={css.metaValue}>
                <input 
                  className={css.slippageInput} 
                  type="text" 
                  value={slippage} 
                  onChange={(e) => setSlippage(e.target.value)} 
                />
                <span style={{ marginLeft: '2px' }}>%</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className={css.actions}>
            <button className={`${css.btn} ${css.ghost}`} onClick={close}>Cancel</button>
            <button className={css.btn} disabled={swapping || !quote || !wallet} onClick={executeSwap}>
              {swapping ? "Swapping…" : "Swap Now"}
            </button>
          </div>

          <div className={css.hint}>
            {wallet ? "Sign & send via Phantom. Fee otomatis masuk ATA Onyx." : "Connect Phantom untuk swap."}
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