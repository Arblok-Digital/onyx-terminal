/**
 * @file Discover.tsx
 * @layer panel
 * @desc Discover panel — two tabs powered by DexScreener:
 *         1. NEW LISTINGS — `/token-profiles/latest/v1` (newest ~30 tokens)
 *         2. SIGNALS — same dataset, scored by spike × buy-pressure × momentum
 *       Click any row → updates active token (parallels into Chart, Info, and
 *       Swap panel — Jupiter re-inits with the new mint).
 * @exposes default Discover
 * @deps ui/Panel, feeds/dexscreener, core/store/price.store, core/store/ui.store,
 *       core/event-bus, utils/format, utils/chain, panels/discover/discover.config
 */
import { useEffect, useMemo, useState } from "react";
import Panel from "@/ui/Panel";
import { getLatestProfiles, getTokensBatch } from "@/feeds/dexscreener";
import ShareButton from "@/components/ShareButton";
import type { TokenProfile } from "@/feeds/dexscreener";
import { usePriceStore } from "@/core/store/price.store";
import { useUIStore } from "@/core/store/ui.store";
import type { ChainId, TokenSnapshot } from "@/core/store/price.store";
import { bus } from "@/core/event-bus";
import { normalizeChain, CHAIN_LABELS } from "@/utils/chain";
import { formatPrice, formatPercent, formatUsd, formatCompact } from "@/utils/format";
import {
  CHAIN_FILTERS,
  MAX_ROWS,
  POLL_MS,
  computeSignal,
} from "./discover.config";
import styles from "./Discover.module.css";

type Tab = "listings" | "signals" | "trending";

const SHARE_URL = "https://onyx-terminal-v1.vercel.app";

async function fetchGeckoTerminalPools() {
  try {
    const response = await fetch(
      "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools"
    );
    if (!response.ok) {
      console.warn("[Discover] Gecko API Error:", response.status);
      return [];
    }
    const json = await response.json();
    console.log("[Discover] Gecko Data Fetched:", json.data?.length || 0, "pools");
    return json?.data || [];
  } catch (error) {
    console.error("GeckoTerminal fetch error:", error);
    return [];
  }
}

export default function Discover() {
  const [profiles, setProfiles] = useState<TokenProfile[]>([]);
  const [trendingProfiles, setTrendingProfiles] = useState<TokenProfile[]>([]);
  const [geckoProfiles, setGeckoProfiles] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("listings");
  const [chain, setChain] = useState<(typeof CHAIN_FILTERS)[number]["id"]>("all");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const tokens = usePriceStore((s) => s.tokens);
  const setActiveToken = useUIStore((s) => s.setActiveToken);
  const activeAddr = useUIStore((s) => s.activeToken?.address)?.toLowerCase() ?? null;

  useEffect(() => {
    let stopped = false;

    async function tick() {
      try {
        let currentGeckoAddrs: string[] = [];
        
        // Aktifkan fetching Gecko untuk Signals DAN Trending
        if (tab === 'signals' || tab === 'trending') {
          const geckoData = await fetchGeckoTerminalPools();
          if (!stopped) {
            setGeckoProfiles(geckoData);
            // Bersihkan prefix 'solana_' dari base_token_id agar DexScreener kenal
            currentGeckoAddrs = geckoData.map((p: any) => {
              // Cek relationships.base_token.data.id (standar Gecko V2)
              const id = p.relationships?.base_token?.data?.id || p.attributes?.base_token_id || "";
              return id.includes('_') ? id.split('_')[1] : id;
            }).filter(Boolean);
            console.log("[Discover] Signals Enrichment List:", currentGeckoAddrs.length, "mints");
          }
        }

        const [list, trending] = await Promise.all([
          getLatestProfiles().catch(() => []),
          fetch("https://api.dexscreener.com/token-boosts/top/v1").then(res => res.json()).catch(() => [])
        ]);

        if (stopped) return;

        const trendingArr = Array.isArray(trending) ? trending : (trending?.boosts || []);
        const trimmedList = Array.isArray(list) ? list.slice(0, MAX_ROWS) : [];
        const trimmedTrending = trendingArr.slice(0, MAX_ROWS);

        setProfiles(trimmedList);
        setTrendingProfiles(trimmedTrending);

        // Gunakan currentGeckoAddrs yang baru di-fetch agar enrichment langsung jalan tanpa nunggu render cycle berikutnya
        const allProfiles = [
          ...trimmedList, 
          ...trimmedTrending, 
          ...currentGeckoAddrs.map(a => ({ tokenAddress: a }))
        ];
        
        const addrs = Array.from(new Set(
          allProfiles.map(p => (typeof p === 'string' ? p : p?.tokenAddress)).filter(Boolean)
        )).slice(0, 60); 

        if (addrs.length > 0) {
          try {
            const snaps = await getTokensBatch(addrs.slice(0, 30));
            const snaps2 = addrs.length > 30 ? await getTokensBatch(addrs.slice(30, 60)) : [];
            
            const combinedSnaps = [...snaps, ...snaps2];
            console.log("[Discover] Enrichment success:", combinedSnaps.length, "snapshots returned");
            
            if (!stopped && combinedSnaps.length > 0) {
              usePriceStore.getState().upsertMany(combinedSnaps);
            }
          } catch (e) {
            console.error("Batch fetch error:", e);
          }
        }
        setUpdatedAt(Date.now());
        setLoading(false);
      } catch (e) {
        console.error("Main tick function failed:", e);
        if (!stopped) setLoading(false);
      }
    }

    void tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [tab]); // Re-run tick when tab changes to switch pipelines

  type Row = { profile: TokenProfile; snap: TokenSnapshot | undefined };
  const rows = useMemo<Row[]>(() => {
    if (tab === "signals") {
      return geckoProfiles.map(pool => {
        // Samakan logika pengambilan alamat mint di sini
        const rawId = pool.relationships?.base_token?.data?.id || pool.attributes?.base_token_id || "";
        const address = rawId.includes('_') ? rawId.split('_')[1] : (pool.attributes?.address || "");
        
        const profile: TokenProfile = {
          tokenAddress: address,
          chainId: pool.attributes?.chain_id || "solana",
          icon: pool.attributes?.image_url || "",
          symbol: pool.attributes?.symbol || "",
          priceUsd: parseFloat(pool.attributes?.base_token_price_usd || "0"),
          volume24h: parseFloat(pool.attributes?.volume_usd || "0"),
          liquidity: parseFloat(pool.attributes?.reserve_in_usd || "0")
        };
        return { profile, snap: tokens[address?.toLowerCase()] };
      }).filter(r => {
        const isMatch = chain === "all" || normalizeChain(r.profile.chainId) === chain;
        if (!isMatch) return false;

        // Quality Filter for Signals:
        // Kita longgarkan agar UI tidak kosong. Icon tidak lagi wajib.
        const liq = r.snap?.liquidity ?? r.profile.liquidity ?? 0;

        // Minimal likuiditas diturunkan ke $5k agar koin baru yang 'hot' tetap muncul
        return liq >= 5000;
      });
    }

    // Logika Gabungan untuk Tab Trending
    if (tab === "trending") {
      const combined: Row[] = [];

      // 1. Masukkan dari DexScreener
      trendingProfiles.forEach(p => {
        combined.push({
          profile: p,
          snap: tokens[p.tokenAddress.toLowerCase()]
        });
      });

      // 2. Masukkan dari GeckoTerminal
      geckoProfiles.forEach(pool => {
        const rawId = pool.relationships?.base_token?.data?.id || pool.attributes?.base_token_id || "";
        const address = rawId.includes('_') ? rawId.split('_')[1] : (pool.attributes?.address || "");
        
        const prof: TokenProfile = {
          tokenAddress: address,
          chainId: pool.attributes?.chain_id || "solana",
          icon: "", 
          symbol: pool.attributes?.symbol || "",
          priceUsd: parseFloat(pool.attributes?.base_token_price_usd || "0"),
          volume24h: parseFloat(pool.attributes?.volume_usd || "0"),
          liquidity: parseFloat(pool.attributes?.reserve_in_usd || "0")
        };

        combined.push({
          profile: prof,
          snap: tokens[address?.toLowerCase()]
        });
      });

      // Filter hanya berdasarkan Chain, hapus filter Safety DEX agar tidak sepi
      return combined.filter(r => {
        const ch = normalizeChain(r.profile.chainId);
        return chain === "all" || ch === chain;
      });
    }

    if (!profiles || !Array.isArray(profiles)) return [];

    return profiles
      .filter((p) => {
        if (!p || !p.tokenAddress) return false;
        const ch = normalizeChain(p.chainId);
        const isMatch = chain === "all" || ch === chain;

        if (tab === "listings") return isMatch;
        return isMatch;
      })
      .map((p) => ({
        profile: p,
        snap: tokens[p.tokenAddress.toLowerCase()],
      }));
  }, [profiles, trendingProfiles, geckoProfiles, tokens, chain, tab]);

  const signalRows = useMemo(() => {
    return rows
      .map((r) => {
        // Jika snap (DexScreener) belum ada, kita buat "Gecko-Snapshot" agar Signal langsung muncul
        if (!r.snap) {
          const geckoSnap: TokenSnapshot = {
            address: r.profile.tokenAddress,
            symbol: r.profile.symbol,
            name: '',
            chain: r.profile.chainId as ChainId,
            priceUsd: r.profile.priceUsd,
            volume24h: r.profile.volume24h,
            liquidity: r.profile.liquidity,
            // Karena Gecko v2 trending pools tidak kasih vol 5m secara eksplisit, 
            // kita asumsikan koin trending pasti punya aktivitas.
            volume5m: r.profile.volume24h / 288, 
            volume1h: r.profile.volume24h / 24,
            priceChange1h: 0,
            txns5m: { buys: 5, sells: 2 } // Mock data biar score tidak 0
          };

          return {
            ...computeSignal(geckoSnap),
            profile: r.profile,
            hot: false // Belum HOT sampai data DexScreener valid masuk
          };
        }
        return { ...computeSignal(r.snap), profile: r.profile };
      })
      .sort((a, b) => b.score - a.score);
  }, [rows]);

  function handleSelect(addr: string, ch: string, sym?: string) {
    const chainId = normalizeChain(ch);
    const tokenData = { 
      address: addr, 
      chain: chainId, 
      symbol: sym
      // fromNewListing tidak lagi relevan
    };
    setActiveToken(tokenData);
    bus.emit("token:select", tokenData);
  }

  const ago = updatedAt
    ? `${Math.max(1, Math.round((Date.now() - updatedAt) / 1000))}s ago`
    : "—";

  const totalLabel =
    tab === "signals" 
      ? `${signalRows.length} scored` 
      : `${rows.length} ${tab === "trending" ? "trending" : "listings"}`;

  const panelBadge = tab === "listings" ? "NEW" : tab === "trending" ? "HOT" : "SIGNAL";

  return (
    <Panel id="discover" title="Discover" badge={panelBadge}>
      <div className={styles.body}>
        <div className={styles.toolbar}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "listings" ? styles.tabActive : ""}`}
              onClick={() => setTab("listings")}
            >
              ◉ NEW LISTINGS
            </button>
            <button
              className={`${styles.tab} ${tab === "trending" ? styles.tabActive : ""}`}
              onClick={() => setTab("trending")}
            >
              🔥 TRENDING
            </button>
            <button
              className={`${styles.tab} ${tab === "signals" ? styles.tabActive : ""}`}
              onClick={() => setTab("signals")}
            >
              ▲ SIGNALS
            </button>
          </div>
          <div className={styles.chains}>
            {CHAIN_FILTERS.map((c) => (
              <button
                key={c.id}
                className={`${styles.chip} ${chain === c.id ? styles.chipActive : ""}`}
                onClick={() => setChain(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className={styles.meta}>{totalLabel}</div>
        </div>

        <div className={styles.tableWrap}>
          {tab === "listings" || tab === "trending" ? (
            <ListingsTable 
              rows={rows} 
              onSelect={handleSelect} 
              activeAddr={activeAddr} 
              isTrending={tab === "trending"}
            />
          ) : (
            <SignalsTable
              rows={signalRows}
              onSelect={handleSelect}
              activeAddr={activeAddr}
            />
          )}
          {loading && rows.length === 0 && (
            <div className={styles.empty}>Fetching latest tokens…</div>
          )}
          {!loading && rows.length === 0 && (
            <div className={styles.empty}>
              No tokens for this chain. Try ALL.
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.dot} />
          <span>updated {ago}</span>
          <span className={styles.spacer} />
          <span className={styles.muted}>
            {tab === "signals" ? "GECKOTERMINAL TRENDING" : "DEXSCREENER PROFILES"}
          </span>
        </div>
      </div>
    </Panel>
  );
}

/* -------------------- LISTINGS TABLE -------------------- */

function ListingsTable({
  rows,
  onSelect,
  activeAddr,
  isTrending,
}: {
  rows: { profile: TokenProfile; snap: TokenSnapshot | undefined }[];
  onSelect: (addr: string, chain: string, sym?: string) => void;
  activeAddr: string | null;
  isTrending?: boolean;
}) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.thLeft}>Token</th>
          <th>Chain</th>
          <th className={styles.thRight}>Price</th>
          <th className={styles.thRight}>24H</th>
          <th className={styles.thRight}>Liquidity</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const sym = r.snap?.symbol ?? "—";
          const name = r.snap?.name ?? r.profile.tokenAddress.slice(0, 6) + "…";
          const ch = r.snap?.priceChange24h;
          const isActive = r.profile.tokenAddress.toLowerCase() === activeAddr;

          const shareText = `📊 ${sym}\n` +
            ` Price: ${r.snap?.priceUsd !== undefined ? formatPrice(r.snap.priceUsd) : "—"}\n` +
            `📈 24h: ${ch !== undefined ? formatPercent(ch) : "—"}\n` +
            `💰 Vol: ${r.snap?.volume24h !== undefined ? formatUsd(r.snap.volume24h) : "—"}\n` +
            `💧 Liq: ${r.snap?.liquidity !== undefined ? formatUsd(r.snap.liquidity) : "—"}\n\n` +
            `Tracked on Onyx Terminal 👁\n` +
            `#OnyxTerminal #NewListing #SolanaGems`;

          return (
            <tr
              key={r.profile.tokenAddress}
              className={isActive ? styles.rowActive : styles.row}
              onClick={() =>
                onSelect(r.profile.tokenAddress, r.profile.chainId, r.snap?.symbol)
              }
            >
              <td className={styles.tdToken}>
                {!isTrending && (r.profile.icon ? (
                  <img className={styles.icon} src={r.profile.icon} alt="" loading="lazy" />
                ) : (
                  <span className={styles.iconFallback} />
                ))}
                <div className={styles.tokenText}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className={styles.symbol}>{sym}</div>
                    <ShareButton text={shareText} url={SHARE_URL} />
                  </div>
                  <div className={styles.name}>{name}</div>
                </div>
              </td>
              <td>
                <span className={styles.chainBadge}>
                  {CHAIN_LABELS[normalizeChain(r.profile.chainId) as ChainId]}
                </span>
              </td>
              <td className={styles.tdRight}>
                {formatPrice(r.snap?.priceUsd ?? r.profile.priceUsd ?? 0)}
              </td>
              <td
                className={`${styles.tdRight} ${
                  ch == null ? styles.muted : ch >= 0 ? styles.up : styles.down
                }`}
              >
                {ch !== undefined ? formatPercent(ch) : "—"}
              </td>
              <td className={styles.tdRight}>
                {formatUsd(r.snap?.liquidity ?? r.profile.liquidity ?? 0)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* -------------------- SIGNALS TABLE -------------------- */

function SignalsTable({
  rows,
  onSelect,
  activeAddr,
}: {
  rows: (ReturnType<typeof computeSignal> & { profile: TokenProfile })[];
  onSelect: (addr: string, chain: string, sym?: string) => void;
  activeAddr: string | null;
}) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.thLeft}>Token</th>
          <th>Signal</th>
          <th className={styles.thRight}>Spike</th>
          <th className={styles.thRight}>Buy %</th>
          <th className={styles.thRight}>1H</th>
          <th className={styles.thRight}>Score</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const isActive = r.snap.address.toLowerCase() === activeAddr;
          const shareText = `🔥 ${r.snap.symbol}\n` +
            `🚀 Spike: ${r.spike.toFixed(1)}x\n` +
            `🎯 Signal: ${r.hot ? 'HOT' : 'STRONG'}\n` +
            `💎 Score: ${formatCompact(r.score)}\n` +
            `🟢 Buy%: ${(r.buyPct * 100).toFixed(0)}%\n\n` +
            `See everything. Miss nothing. 👁\n\n` +
            `#OnyxTerminal #SolanaSignals #AlphaCall`;

          return (
            <tr
              key={r.snap.address}
              className={isActive ? styles.rowActive : styles.row}
              onClick={() => onSelect(r.snap.address, r.snap.chain, r.snap.symbol)}
            >
              <td className={styles.tdToken}>
                {r.snap.iconUrl || r.profile.icon ? (
                  <img
                    className={styles.icon}
                    src={r.snap.iconUrl ?? r.profile.icon}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <span className={styles.iconFallback} />
                )}
                <div className={styles.tokenText}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className={styles.symbol}>{r.snap.symbol}</div>
                    <ShareButton text={shareText} url={SHARE_URL} />
                  </div>
                  <div className={styles.name}>
                    {r.snap.name} · {CHAIN_LABELS[r.snap.chain]}
                  </div>
                </div>
              </td>
              <td>
                {r.hot ? (
                  <span className={styles.badgeHot}>● HOT</span>
                ) : (
                  <span className={styles.badgeIdle}>—</span>
                )}
              </td>
              <td className={styles.tdRight}>
                {r.spike > 0 ? `${r.spike.toFixed(1)}×` : "—"}
              </td>
              <td className={`${styles.tdRight} ${styles.up}`}>
                {(r.buyPct * 100).toFixed(0)}%
              </td>
              <td
                className={`${styles.tdRight} ${
                  r.change1h >= 0 ? styles.up : styles.down
                }`}
              >
                {formatPercent(r.change1h)}
              </td>
              <td className={`${styles.tdRight} ${styles.scoreCell}`}>
                {formatCompact(r.score)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
