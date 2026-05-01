/**
 * @file Swap.tsx
 * @layer panel
 * @desc Jupiter Swap panel — embeds Jupiter Plugin with our referral
 *       account + 50 bps platform fee. Header always shows the active
 *       token's contract address (CA) with copy + explorer link.
 *       Solana-only; non-Solana tokens see a friendly fallback.
 * @exposes default Swap
 * @deps ui/Panel, hooks/usePrice, core/store/ui.store, utils/format,
 *       utils/chain, panels/swap/jupiter, panels/swap/swap.config
 */
import { useEffect, useRef, useState } from "react";
import Panel from "@/ui/Panel";
import { useUIStore } from "@/core/store/ui.store";
import { usePriceFor } from "@/hooks/usePrice";
import { formatAddress } from "@/utils/format";
import { CHAIN_LABELS, getExplorerAddrUrl } from "@/utils/chain";
import { loadJupiter } from "./jupiter";
import {
  REFERRAL_ACCOUNT,
  REFERRAL_FEE_BPS,
  SOL_MINT,
  JUP_TARGET_ID,
} from "./swap.config";
import styles from "./Swap.module.css";

export default function Swap() {
  const activeToken = useUIStore((s) => s.activeToken);
  const snap = usePriceFor(activeToken?.address);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [analysis, setAnalysis] = useState<{
    routeType: "FEE_ACTIVE" | "PARTIAL" | "NO_FEE" | "UNKNOWN";
    label: string;
    hops: number;
  } | null>(null);
  const lastInitRef = useRef<string | null>(null);

  const isSolana = activeToken?.chain === "solana";
  const outputMint = isSolana ? activeToken?.address : undefined;

  // Helper function to classify route type based on keywords
  const classifyRoute = (routePlan: any[]): "FEE_ACTIVE" | "PARTIAL" | "NO_FEE" | "UNKNOWN" => {
    let hasFeeRoute = false;
    let hasPump = false;
    let hasAggregator = false;

    const feeActiveKws = ["raydium", "orca", "meteora", "whirlpool", "clmm", "cpmm", "lifinity", "openbook", "phoenix", "crema"];
    const partialKws = ["okx", "dflow", "rfq"];
    const noFeeKws = ["pump", "pumpfun", "bonding"];

    for (const hop of routePlan) {
      const label = (hop.swapInfo.label || "").toLowerCase();
      const amm = (hop.swapInfo.ammKey || "").toLowerCase();

      const text = label + " " + amm;

      if (feeActiveKws.some(kw => text.includes(kw))) {
        hasFeeRoute = true;
      }

      if (partialKws.some(kw => text.includes(kw))) {
        hasAggregator = true;
      }

      if (noFeeKws.some(kw => text.includes(kw))) {
        hasPump = true;
      }
    }

    // Prioritas: NO_FEE > PARTIAL > FEE_ACTIVE > UNKNOWN
    if (hasPump) return "NO_FEE";
    if (hasAggregator) return "PARTIAL";
    if (hasFeeRoute) return "FEE_ACTIVE";

    return "UNKNOWN";
  };

  // ── Route Analysis Pipeline ───────────────────────────────────────
  useEffect(() => {
    if (!outputMint) {
      setAnalysis(null);
      return;
    }

    const analyzeRoute = async () => {
      try {
        if (SOL_MINT === outputMint) {
          throw new Error("Invalid swap pair: same token");
        }

        const url = `https://api.jup.ag/swap/v1/quote?inputMint=${SOL_MINT}&outputMint=${outputMint}&amount=10000000&slippageBps=50`;
        console.log("Fetching Jupiter Quote:", url);

        const res = await fetch(url);
        const data = await res.json();

        if (data && data.routePlan) {
          const routePlan = data.routePlan;
          console.log("FULL ROUTE:", routePlan); // Debug detail rute mentah

          const labelsRaw: string[] = routePlan.map((r: any) => r.swapInfo.label || "Unknown");
          const hops = routePlan.length;
          const labelText = labelsRaw.join(" → ");

          // Gunakan helper classifyRoute yang sudah kita buat di atas
          const routeType = classifyRoute(routePlan);

          const result = { routeType, label: labelText, hops };
          console.log("Route Analysis:", result);
          setAnalysis(result);
        } else {
          setAnalysis({ routeType: "UNKNOWN", label: "No route", hops: 0 });
        }
      } catch (err) {
        setAnalysis({ routeType: "UNKNOWN", label: "Analysis failed", hops: 0 });
      }
    };

    void analyzeRoute();
  }, [outputMint]);

  // Init / re-init Jupiter when the active Solana token changes
  useEffect(() => {
    if (!outputMint) return;
    if (lastInitRef.current === outputMint) return;

    let cancelled = false;
    setError(null);

    loadJupiter()
      .then((Jupiter) => {
        if (cancelled) return;
        // Defer one tick so the target div is guaranteed to be mounted
        requestAnimationFrame(() => {
          if (cancelled) return;
          try {
            console.log("Jupiter Fee Config:", {
              referralAccount: REFERRAL_ACCOUNT,
              platformFeeBps: REFERRAL_FEE_BPS
            });

            Jupiter.init({
              displayMode: "integrated",
              integratedTargetId: JUP_TARGET_ID,
              formProps: {
                initialInputMint: SOL_MINT,
                initialOutputMint: outputMint,
                fixedOutputMint: false,
                swapMode: "ExactIn",
              },
              referralAccount: REFERRAL_ACCOUNT,
              platformFeeBps: REFERRAL_FEE_BPS,
            });
            lastInitRef.current = outputMint;
          } catch (e) {
            setError(e instanceof Error ? e.message : "Jupiter init failed");
          }
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load Jupiter");
      });

    return () => {
      cancelled = true;
    };
  }, [outputMint]);

  function copyCa() {
    if (!activeToken) return;
    void navigator.clipboard.writeText(activeToken.address).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <Panel id="swap" title="Swap">
      <div className={styles.body}>
        {/* CA Header — always visible when a token is active */}
        {activeToken && (
          <div className={styles.caHeader}>
            <div className={styles.caRow}>
              <span className={styles.caLabel}>CA</span>
              <a
                className={styles.caAddr}
                href={getExplorerAddrUrl(activeToken.chain, activeToken.address)}
                target="_blank"
                rel="noreferrer"
                title={activeToken.address}
              >
                {formatAddress(activeToken.address, 6, 6)}
              </a>
              <button
                className={styles.copyBtn}
                onClick={copyCa}
                title="Copy contract address"
              >
                {copied ? "✓" : "⧉"}
              </button>
            </div>
            <div className={styles.caMeta}>
              <span className={styles.metaSym}>
                {snap?.symbol ?? activeToken.symbol ?? "—"}
              </span>
              <span className={styles.dot}>·</span>
              <span>{CHAIN_LABELS[activeToken.chain]}</span>
              <span className={styles.dot}>·</span>
              <span className={styles.feeBadge}>FEE 0.50%</span>
            </div>

            {/* Route Analysis Badge */}
            {analysis && (
              <div className={styles.routeInfo}>
                <span className={
                  analysis.routeType === "FEE_ACTIVE" ? styles.badgeActive :
                  analysis.routeType === "PARTIAL" ? styles.badgePartial :
                  analysis.routeType === "NO_FEE" ? styles.badgeNone : styles.badgeUnknown
                }>
                  {analysis.routeType === "FEE_ACTIVE" && "🟣 Jupiter Route (Fee Active)"}
                  {analysis.routeType === "PARTIAL" && "🟡 Aggregator (Partial Fee)"}
                  {analysis.routeType === "NO_FEE" && "🔴 No Fee Route"}
                  {analysis.routeType === "UNKNOWN" && "⚪ Unknown Route"}
                </span>
                <span className={styles.routeLabel}>
                  {analysis.hops > 0 && `(${analysis.hops} HOP${analysis.hops > 1 ? 'S' : ''}: ${analysis.label})`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Body: Jupiter widget, fallback, or error */}
        {!activeToken && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⇋</div>
            <div className={styles.emptyHint}>
              Pick a token from the watchlist to swap.
            </div>
          </div>
        )}

        {activeToken && !isSolana && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⛔</div>
            <div className={styles.emptyHint}>
              Swap powered by Jupiter — Solana tokens only.
            </div>
          </div>
        )}

        {error && isSolana && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {isSolana && !error && (
          <div id={JUP_TARGET_ID} className={styles.jupTarget} />
        )}
      </div>
    </Panel>
  );
}
