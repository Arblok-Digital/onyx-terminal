/**
 * @file Info.tsx
 * @layer panel
 * @desc Token Info panel — Bloomberg-style dense metrics for the active
 *       token. Pure read from the price store (DexScreener feed already
 *       hydrates every field). Sections: Overview, Price Change, Volume,
 *       Activity (buy/sell), Pair, Contract, Links.
 * @exposes default Info
 * @deps ui/Panel, hooks/usePrice, core/store/ui.store, utils/format,
 *       utils/chain, panels/info/info.config
 */
import { useState, useEffect } from "react";
import Panel from "@/ui/Panel";
import { useUIStore } from "@/core/store/ui.store";
import ShareButton from "@/components/ShareButton";
import { useOnyxProgram } from "@/hooks/useOnyxProgram";
import { useTokenStats } from "@/hooks/useTokenStats";
import { usePriceFor } from "@/hooks/usePrice";
import {
  formatPrice,
  formatPercent,
  formatCompact,
  formatUsd,
  formatAddress,
} from "@/utils/format";
import { CHAIN_LABELS, getExplorerAddrUrl } from "@/utils/chain";
import {
  BUCKET_LABELS,
  buyRatio,
  formatAge,
  getSocialLabel,
} from "./info.config";
import type { TokenSnapshot, TxnBucket } from "@/core/store/price.store";
import styles from "./Info.module.css";

type BucketKey = (typeof BUCKET_LABELS)[number]["id"];

function getChange(snap: TokenSnapshot, k: BucketKey): number | undefined {
  switch (k) {
    case "5m": return snap.priceChange5m;
    case "1h": return snap.priceChange1h;
    case "6h": return snap.priceChange6h;
    case "24h": return snap.priceChange24h;
  }
}

function getVolume(snap: TokenSnapshot, k: BucketKey): number | undefined {
  switch (k) {
    case "5m": return snap.volume5m;
    case "1h": return snap.volume1h;
    case "6h": return snap.volume6h;
    case "24h": return snap.volume24h;
  }
}

function getTxns(snap: TokenSnapshot, k: BucketKey): TxnBucket | undefined {
  switch (k) {
    case "5m": return snap.txns5m;
    case "1h": return snap.txns1h;
    case "6h": return snap.txns6h;
    case "24h": return snap.txns24h;
  }
}

// ============================================================================
// DEBUGGER COMPONENT
// ============================================================================
function OnyxStatusDebugger() {
  const { program, connected } = useOnyxProgram();

  useEffect(() => {
    console.log("ONYX DEBUGGER: Hook loaded.");
    console.log("ONYX DEBUGGER: Wallet connected:", connected);

    if (program && connected) {
      console.log("ONYX DEBUGGER: Program client available. Fetching config...");
      program.getConfig()
        .then(config => {
          if (config) {
            console.log("✅ ONYX DEBUGGER: Config fetched successfully!", config);
          } else {
            console.error("❌ ONYX DEBUGGER: Failed to fetch config. Account is null.");
          }
        })
        .catch(err => {
          console.error("❌ ONYX DEBUGGER: Error fetching config:", err);
        });
    } else if (!connected) {
      console.warn("ONYX DEBUGGER: Wallet not connected. Cannot fetch config.");
    }
  }, [program, connected]);

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px', fontSize: '10px', zIndex: 999 }}>
      Onyx Debugger Active
    </div>
  );
}
// ============================================================================

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={styles.copyBtn}
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
      title="Copy"
    >
      {copied ? "✓" : "⧉"}
    </button>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={[styles.rowValue, valueClass ?? ""].join(" ")}>
        {value}
      </span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>{title}</header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function changeClass(v: number | undefined) {
  if (v == null) return styles.muted;
  return v >= 0 ? styles.up : styles.down;
}

export default function Info() {
  const activeToken = useUIStore((s) => s.activeToken);
  const snap = usePriceFor(activeToken?.address);
  const stats = useTokenStats(activeToken?.address);

  if (!activeToken) {
    return (
      <Panel id="info" title="Info">
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>◎</div>
          <div className={styles.emptyTitle}>No token selected</div>
          <div className={styles.emptyHint}>
            Click a row in the watchlist.
          </div>
        </div>
      </Panel>
    );
  }

  if (!snap) {
    return (
      <Panel id="info" title="Info">
        <div className={styles.empty}>
          <div className={styles.emptyHint}>Loading…</div>
        </div>
      </Panel>
    );
  }

  const shareText = `📊 ${snap.symbol}\n` +
    `💵 Price: ${formatPrice(snap.priceUsd)}\n` +
    `📈 24h: ${snap.priceChange24h !== undefined ? formatPercent(snap.priceChange24h) : "—"}\n` +
    `💰 Vol: ${snap.volume24h !== undefined ? formatUsd(snap.volume24h) : "—"}\n` +
    `💧 Liq: ${snap.liquidity !== undefined ? formatUsd(snap.liquidity) : "—"}\n\n` +
    `Tracked on Onyx Terminal 👁\n` +
    `#OnyxTerminal #Solana #CryptoTrading`;

  const shareUrl = "https://onyx-terminal-v1.vercel.app";

  return (
    <Panel id="info" title={`${snap.symbol} · INFO`}>
      <div className={styles.body}>
        <OnyxStatusDebugger />
        {/* OVERVIEW */}
        <Section title="Overview">
          <div className={styles.heroBox}>
            {snap.iconUrl && (
              <img className={styles.heroIcon} src={snap.iconUrl} alt={snap.symbol} />
            )}
            <div className={styles.heroText}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className={styles.heroName}>{snap.name}</div>
                <ShareButton text={shareText} url={shareUrl} />
              </div>
              <div className={styles.heroSym}>{snap.symbol}</div>
            </div>
            <div className={styles.heroPrice}>{formatPrice(snap.priceUsd)}</div>
          </div>
          <Row
            label="Market Cap"
            value={snap.marketCap !== undefined ? formatUsd(snap.marketCap) : "—"}
          />
          <Row
            label="FDV"
            value={snap.fdv !== undefined ? formatUsd(snap.fdv) : "—"}
          />
          <Row
            label="Liquidity"
            value={snap.liquidity !== undefined ? formatUsd(snap.liquidity) : "—"}
          />
          <Row label="Chain" value={CHAIN_LABELS[snap.chain]} />
        <Row
          label="Top 10 Distribution"
          value={stats ? `${stats.distributionRatio.toFixed(1)}%` : "—"}
          valueClass={stats && stats.distributionRatio > 50 ? styles.down : ""}
        />
        <Row
          label="Total Holders"
          value={stats ? stats.holders : "—"}
        />
        </Section>

        {/* PRICE CHANGE */}
        <Section title="Price Change">
          <div className={styles.bucketGrid}>
            {BUCKET_LABELS.map((b) => {
              const v = getChange(snap, b.id);
              return (
                <div key={b.id} className={styles.bucketCell}>
                  <div className={styles.bucketLabel}>{b.label}</div>
                  <div className={[styles.bucketValue, changeClass(v)].join(" ")}>
                    {v !== undefined ? formatPercent(v) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* VOLUME */}
        <Section title="Volume">
          <div className={styles.bucketGrid}>
            {BUCKET_LABELS.map((b) => {
              const v = getVolume(snap, b.id);
              return (
                <div key={b.id} className={styles.bucketCell}>
                  <div className={styles.bucketLabel}>{b.label}</div>
                  <div className={styles.bucketValue}>
                    {v !== undefined ? formatUsd(v) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ACTIVITY */}
        <Section title="Activity (24H)">
          {(() => {
            const t = getTxns(snap, "24h");
            const r = buyRatio(t?.buys, t?.sells);
            const total = (t?.buys ?? 0) + (t?.sells ?? 0);
            return (
              <>
                <Row
                  label="Buys"
                  value={t?.buys !== undefined ? formatCompact(t.buys) : "—"}
                  valueClass={styles.up}
                />
                <Row
                  label="Sells"
                  value={t?.sells !== undefined ? formatCompact(t.sells) : "—"}
                  valueClass={styles.down}
                />
                <Row
                  label="Total Txns"
                  value={total > 0 ? formatCompact(total) : "—"}
                />
                {r !== null && (
                  <div className={styles.ratioBar} title="Buys vs Sells">
                    <div
                      className={styles.ratioBuy}
                      style={{ width: `${(r * 100).toFixed(1)}%` }}
                    />
                  </div>
                )}
              </>
            );
          })()}
        </Section>

        {/* PAIR */}
        <Section title="Pair">
          <Row
            label="DEX"
            value={snap.dexId ? snap.dexId.toUpperCase() : "—"}
          />
          <Row
            label="Quote"
            value={snap.quoteSymbol ?? "—"}
          />
          <Row label="Age" value={formatAge(snap.pairCreatedAt)} />
        </Section>

        {/* CONTRACT */}
        <Section title="Contract">
          <div className={styles.addrRow}>
            <span className={styles.rowLabel}>Token</span>
            <a
              className={styles.addrLink}
              href={getExplorerAddrUrl(snap.chain, snap.address)}
              target="_blank"
              rel="noreferrer"
              title={snap.address}
            >
              {formatAddress(snap.address, 6, 6)}
            </a>
            <CopyBtn text={snap.address} />
          </div>
          {snap.pairAddress && (
            <div className={styles.addrRow}>
              <span className={styles.rowLabel}>Pair</span>
              <a
                className={styles.addrLink}
                href={getExplorerAddrUrl(snap.chain, snap.pairAddress)}
                target="_blank"
                rel="noreferrer"
                title={snap.pairAddress}
              >
                {formatAddress(snap.pairAddress, 6, 6)}
              </a>
              <CopyBtn text={snap.pairAddress} />
            </div>
          )}
        </Section>

        {/* LINKS */}
        {snap.links && snap.links.length > 0 && (
          <Section title="Links">
            <div className={styles.linkRow}>
              {snap.links.map((l, i) => (
                <a
                  key={`${l.type}-${i}`}
                  className={styles.linkChip}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  title={l.url}
                >
                  {getSocialLabel(l.type)}
                </a>
              ))}
            </div>
          </Section>
        )}
      </div>
    </Panel>
  );
}
