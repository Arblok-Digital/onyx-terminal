/**
 * @file ui.store.ts
 * @layer store
 * @desc Theme, modal state, command palette state, active chain selector.
 * @exposes useUIStore
 * @deps zustand
 */
import { create } from "zustand";
import type { ChainId } from "./price.store";

type State = {
  /** Currently active token in chart panel. */
  activeToken: { address: string; chain: ChainId; symbol?: string } | null;
  /** Active chain filter for global views. */
  activeChain: ChainId;
  /** Cmd+K palette open state. */
  paletteOpen: boolean;
  /** Latency in ms reported by last DexScreener fetch. */
  latencyMs: number;
};

type Actions = {
  setActiveToken: (t: State["activeToken"]) => void;
  setActiveChain: (c: ChainId) => void;
  togglePalette: (open?: boolean) => void;
  setLatency: (ms: number) => void;
};

export const useUIStore = create<State & Actions>((set, get) => ({
  activeToken: null,
  activeChain: "solana",
  paletteOpen: false,
  latencyMs: 0,

  setActiveToken: (t) => set({ activeToken: t }),
  setActiveChain: (c) => set({ activeChain: c }),
  togglePalette: (open) =>
    set({ paletteOpen: open ?? !get().paletteOpen }),
  setLatency: (ms) => set({ latencyMs: ms }),
}));
