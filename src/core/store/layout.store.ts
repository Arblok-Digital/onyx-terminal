/**
 * @file layout.store.ts
 * @layer store
 * @desc Posisi & ukuran panel di react-grid-layout, plus visibility toggle.
 *       Persisted ke localStorage biar layout user gak ilang.
 * @exposes useLayoutStore, type PanelLayout
 * @deps zustand, utils/storage
 */
import { create } from "zustand";
import { storage } from "@/utils/storage";

export type PanelLayout = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

type State = {
  layouts: PanelLayout[];
  hidden: Set<string>;
  /** Currently focused panel (Cmd+K target) */
  focused: string | null;
};

type Actions = {
  setLayouts: (layouts: PanelLayout[]) => void;
  toggleHidden: (id: string) => void;
  setFocused: (id: string | null) => void;
  reset: () => void;
};

const STORAGE_KEY = "onyx.layout.v9"; // Naikin ke v9 untuk aktivasi tombol reset layout pro

const DEFAULT_LAYOUTS: PanelLayout[] = [
  { i: "info", x: 0, y: 0, w: 2, h: 12, minW: 2, minH: 3 },      // SOL INFO (Tinggi penuh 12)
  { i: "chart", x: 2, y: 0, w: 5, h: 7, minW: 4, minH: 4 },      // CHART (Lebih tinggi)
  { i: "swap", x: 7, y: 0, w: 3, h: 5, minW: 3, minH: 4 },       // SWAP (Kanan Tengah)
  { i: "watchlist", x: 10, y: 0, w: 2, h: 5, minW: 2, minH: 3 },  // WATCHLIST (Pojok Kanan)
  { i: "discover", x: 2, y: 7, w: 5, h: 5, minW: 4, minH: 3 },   // DISCOVER (Pas di bawah chart)
  { i: "flow-monitor", x: 7, y: 5, w: 5, h: 7, minW: 3, minH: 4 }, // FLOW MONITOR (Isi sisa area kanan bawah)
];

type Persisted = { layouts: PanelLayout[]; hidden: string[] };

function loadPersisted(): {
  layouts: PanelLayout[];
  hidden: Set<string>;
} {
  const raw = storage.get<Persisted>(STORAGE_KEY);
  if (!raw || !Array.isArray(raw.layouts)) {
    return { layouts: DEFAULT_LAYOUTS, hidden: new Set() };
  }
  return {
    layouts: raw.layouts,
    hidden: new Set(raw.hidden ?? []),
  };
}

function persist(state: { layouts: PanelLayout[]; hidden: Set<string> }) {
  storage.set<Persisted>(STORAGE_KEY, {
    layouts: state.layouts,
    hidden: [...state.hidden],
  });
}

const initial = loadPersisted();

export const useLayoutStore = create<State & Actions>((set, get) => ({
  layouts: initial.layouts,
  hidden: initial.hidden,
  focused: null,

  setLayouts: (layouts) => {
    set({ layouts });
    persist({ layouts, hidden: get().hidden });
  },

  toggleHidden: (id) => {
    const hidden = new Set(get().hidden);
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
    set({ hidden });
    persist({ layouts: get().layouts, hidden });
  },

  setFocused: (id) => set({ focused: id }),

  reset: () => {
    set({ layouts: DEFAULT_LAYOUTS, hidden: new Set() });
    persist({ layouts: DEFAULT_LAYOUTS, hidden: new Set() });
  },
}));
