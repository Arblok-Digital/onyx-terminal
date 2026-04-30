/**
 * @file Watchlist.tsx
 * @layer panel
 * @desc Watchlist panel: add/remove tokens, sort, click row to open chart.
 * @exposes default Watchlist
 * @deps panels/watchlist/watchlist.store, hooks/usePrice, ui/Panel, core/event-bus
 */
import { useMemo, useState } from "react";
import Panel from "@/ui/Panel";
import { useWatchlistStore } from "./watchlist.store";
import { usePriceStore } from "@/core/store/price.store";
import { useUIStore } from "@/core/store/ui.store";
import { bus } from "@/core/event-bus";
import WatchlistRow from "./WatchlistRow";
import styles from "./Watchlist.module.css";
import type { TokenSnapshot, ChainId } from "@/core/store/price.store";

type SortField = "default" | "price" | "change1h" | "change24h" | "volume";

const COLUMNS: { id: SortField; label: string; numeric?: boolean; essential?: boolean }[] = [
  { id: "default", label: "Token", essential: true },
  { id: "price", label: "Price", numeric: true, essential: true },
  { id: "change1h", label: "1H %", numeric: true },
  { id: "change24h", label: "24H %", numeric: true },
  { id: "volume", label: "Vol 24H", numeric: true },
];

function sortEntries(
  entries: { address: string; chain: ChainId }[],
  tokens: Record<string, TokenSnapshot>,
  field: SortField,
  dir: "asc" | "desc",
) {
  if (field === "default") return entries;
  const sign = dir === "asc" ? 1 : -1;
  return [...entries].sort((a, b) => {
    const ta = tokens[a.address.toLowerCase()];
    const tb = tokens[b.address.toLowerCase()];
    const va =
      field === "change1h"
        ? (ta?.priceChange1h ?? -Infinity)
        : field === "change24h"
          ? (ta?.priceChange24h ?? -Infinity)
          : field === "volume"
            ? (ta?.volume24h ?? -Infinity)
            : (ta?.priceUsd ?? -Infinity);
    const vb =
      field === "change1h"
        ? (tb?.priceChange1h ?? -Infinity)
        : field === "change24h"
          ? (tb?.priceChange24h ?? -Infinity)
          : field === "volume"
            ? (tb?.volume24h ?? -Infinity)
            : (tb?.priceUsd ?? -Infinity);
    return (va - vb) * sign;
  });
}

export default function Watchlist() {
  const entries = useWatchlistStore((s) => s.entries);
  const sortBy = useWatchlistStore((s) => s.sortBy);
  const sortDir = useWatchlistStore((s) => s.sortDir);
  const setSort = useWatchlistStore((s) => s.setSort);
  const add = useWatchlistStore((s) => s.add);
  const remove = useWatchlistStore((s) => s.remove);

  const tokens = usePriceStore((s) => s.tokens);
  const activeAddr =
    useUIStore((s) => s.activeToken?.address)?.toLowerCase() ?? null;

  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");

  const sorted = useMemo(
    () => sortEntries(entries, tokens, sortBy, sortDir),
    [entries, tokens, sortBy, sortDir],
  );

  function handleAdd() {
    const addr = input.trim();
    if (addr.length < 10) return;
    add({ address: addr, chain: "solana" });
    setInput("");
    setAdding(false);
    bus.emit("notify", {
      kind: "info",
      message: `Added ${addr.slice(0, 6)}…`,
    });
  }

  function handleSelect(entry: { address: string; chain: ChainId }) {
    const snap = tokens[entry.address.toLowerCase()];
    bus.emit("token:select", {
      address: entry.address,
      chain: entry.chain,
      symbol: snap?.symbol,
    });
  }

  return (
    <Panel id="watchlist" title="Watchlist" badge={String(entries.length)}>
      <div className={styles.body}>
        <div className={styles.toolbar}>
          {adding ? (
            <>
              <input
                autoFocus
                placeholder="Paste token mint address (Solana)…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setInput("");
                  }
                }}
              />
              <button
                className={styles.addBtn}
                onClick={handleAdd}
                title="Confirm"
              >
                ✓
              </button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, color: "var(--text-muted)", fontSize: 11 }}>
                {entries.length} tokens · live
              </span>
              <button
                className={styles.addBtn}
                onClick={() => setAdding(true)}
                title="Add token"
                aria-label="Add token"
              >
                +
              </button>
            </>
          )}
        </div>

        <div className={styles.rows}>
          {/* Header dipindahkan ke sini agar sejajar dengan scrollbar rows */}
          <div className={styles.thead}>
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className={[
                  styles.th,
                  col.numeric ? styles.thNumeric : "",
                  sortBy === col.id ? styles.thActive : "",
                  !col.essential ? styles.hideMobile : ""
                ].join(" ")}
                onClick={() => setSort(col.id)}
              >
                <span>{col.label}</span>
                {sortBy === col.id && (
                  <span>{sortDir === "desc" ? "▼" : "▲"}</span>
                )}
              </div>
            ))}
            <div />
          </div>

          {sorted.length === 0 ? (
            <div className={styles.empty}>
              Watchlist kosong. Tekan + buat tambah token.
            </div>
          ) : (
            sorted.map((e) => (
              <WatchlistRow
                key={e.address}
                address={e.address}
                chain={e.chain}
                snap={tokens[e.address.toLowerCase()]}
                active={activeAddr === e.address.toLowerCase()}
                onSelect={() => handleSelect(e)}
                onRemove={() => remove(e.address)}
              />
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
