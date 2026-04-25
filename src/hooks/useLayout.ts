/**
 * @file useLayout.ts
 * @layer hooks
 * @desc Bridge layout store ke Terminal. Stable callbacks untuk react-grid-layout.
 * @exposes useLayout
 * @deps core/store/layout.store
 */
import { useCallback } from "react";
import { useLayoutStore } from "@/core/store/layout.store";
import type { PanelLayout } from "@/core/store/layout.store";

export function useLayout() {
  const layouts = useLayoutStore((s) => s.layouts);
  const hidden = useLayoutStore((s) => s.hidden);
  const setLayouts = useLayoutStore((s) => s.setLayouts);
  const toggleHidden = useLayoutStore((s) => s.toggleHidden);
  const reset = useLayoutStore((s) => s.reset);

  const onLayoutChange = useCallback(
    (next: PanelLayout[]) => {
      setLayouts(next);
    },
    [setLayouts],
  );

  return {
    layouts,
    hidden,
    onLayoutChange,
    toggleHidden,
    reset,
    isHidden: (id: string) => hidden.has(id),
  };
}
