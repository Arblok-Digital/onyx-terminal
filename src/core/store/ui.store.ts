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
  selectedToken: { address: string; chainId: ChainId; symbol?: string } | null;
  /** Compatibility alias */
  activeToken: any | null;
  /** Active chain filter for global views. */
  activeChain: ChainId;
  /** Cmd+K palette open state. */
  paletteOpen: boolean;
  /** Latency in ms reported by last DexScreener fetch. */
  latencyMs: number;
  /** Custom Swap modal state */
  swapOpen: boolean;
};

type Actions = {
  setActiveToken: (t: State["selectedToken"]) => void;
  setActiveChain: (c: ChainId) => void;
  togglePalette: (open?: boolean) => void;
  setLatency: (ms: number) => void;
  closeSwap: () => void;
  openSwap: (token?: any) => void;
};

export const useUiStore = create<State & Actions>((set, get) => ({
  selectedToken: null,
  activeToken: null,
  activeChain: "solana",
  paletteOpen: false,
  latencyMs: 0,
  swapOpen: true,

  setActiveToken: (t) => set({ selectedToken: t, activeToken: t }),
  setActiveChain: (c) => set({ activeChain: c }),
  togglePalette: (open) =>
    set({ paletteOpen: open ?? !get().paletteOpen }),
  setLatency: (ms) => set({ latencyMs: ms }),
  closeSwap: () => set({ swapOpen: false }),
  openSwap: (token) => set({ 
    swapOpen: true, 
    selectedToken: token || get().selectedToken 
  }),
}));

/** Compatibility alias for legacy components using different casing */
export const useUIStore = useUiStore;
