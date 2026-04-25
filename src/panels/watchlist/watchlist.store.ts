/**
 * @file watchlist.store.ts
 * @layer store
 * @desc List of token addresses user follows. Persisted to localStorage.
 *       Seeded with top Solana tokens on first run.
 * @exposes useWatchlistStore, type WatchEntry
 * @deps zustand, utils/storage
 */
import { create } from "zustand";
import { storage } from "@/utils/storage";
import type { ChainId } from "@/core/store/price.store";

export type WatchEntry = {
  address: string;
  chain: ChainId;
};

const STORAGE_KEY = "onyx.watchlist.v1";

const SEED: WatchEntry[] = [
  { address: "So11111111111111111111111111111111111111112", chain: "solana" }, // SOL
  { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana" }, // USDC
  { address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", chain: "solana" }, // BONK
  { address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", chain: "solana" }, // WIF
  { address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", chain: "solana" }, // JUP
  { address: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3", chain: "solana" }, // PYTH
];

type State = {
  entries: WatchEntry[];
  /** Sort field. */
  sortBy: "default" | "change1h" | "change24h" | "volume" | "price";
  /** asc | desc */
  sortDir: "asc" | "desc";
};

type Actions = {
  add: (entry: WatchEntry) => void;
  remove: (address: string) => void;
  has: (address: string) => boolean;
  setSort: (field: State["sortBy"], dir?: State["sortDir"]) => void;
};

function loadInitial(): WatchEntry[] {
  const raw = storage.get<WatchEntry[]>(STORAGE_KEY);
  if (!raw || !Array.isArray(raw) || raw.length === 0) return SEED;
  return raw;
}

function persist(entries: WatchEntry[]) {
  storage.set(STORAGE_KEY, entries);
}

export const useWatchlistStore = create<State & Actions>((set, get) => ({
  entries: loadInitial(),
  sortBy: "default",
  sortDir: "desc",

  add: (entry) => {
    const exists = get().entries.some(
      (e) => e.address.toLowerCase() === entry.address.toLowerCase(),
    );
    if (exists) return;
    const next = [...get().entries, entry];
    set({ entries: next });
    persist(next);
  },

  remove: (address) => {
    const next = get().entries.filter(
      (e) => e.address.toLowerCase() !== address.toLowerCase(),
    );
    set({ entries: next });
    persist(next);
  },

  has: (address) =>
    get().entries.some(
      (e) => e.address.toLowerCase() === address.toLowerCase(),
    ),

  setSort: (field, dir) => {
    const cur = get();
    const nextDir =
      dir ?? (cur.sortBy === field && cur.sortDir === "desc" ? "asc" : "desc");
    set({ sortBy: field, sortDir: nextDir });
  },
}));
