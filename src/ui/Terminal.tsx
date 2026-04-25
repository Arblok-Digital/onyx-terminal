/**
 * @file Terminal.tsx
 * @layer ui
 * @desc Root layout: Ticker (top) + react-grid-layout (middle) + StatusBar (bottom).
 *       Bootstraps DexScreener subscription on mount. Sets initial active token.
 * @exposes default Terminal
 * @deps ui/Ticker, ui/StatusBar, panels/*, hooks/useLayout, feeds/dexscreener
 */
import { useEffect, useMemo, useRef, useState } from "react";
import GridLayout, { WidthProvider } from "react-grid-layout/legacy";
import type { LayoutItem } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";

import Ticker from "./Ticker";
import StatusBar from "./StatusBar";
import Watchlist from "@/panels/watchlist/Watchlist";
import Chart from "@/panels/chart/Chart";
import Info from "@/panels/info/Info";
import Swap from "@/panels/swap/Swap";
import Discover from "@/panels/discover/Discover";

import { useLayout } from "@/hooks/useLayout";
import { useWatchlistStore } from "@/panels/watchlist/watchlist.store";
import { useUIStore } from "@/core/store/ui.store";
import { usePriceStore } from "@/core/store/price.store";
import { subscribePrices } from "@/feeds/dexscreener";
import styles from "./Terminal.module.css";

const ResponsiveGrid = WidthProvider(GridLayout);
const COLS = 12;
const ROWS = 12;
const MARGIN = 6;

export default function Terminal() {
  const { layouts, onLayoutChange } = useLayout();
  const setActiveToken = useUIStore((s) => s.setActiveToken);
  const activeToken = useUIStore((s) => s.activeToken);

  // Dynamic row height — fit ROWS into the available container height.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [rowHeight, setRowHeight] = useState(48);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const recalc = () => {
      const h = el.clientHeight;
      // total = ROWS * rowHeight + (ROWS - 1) * MARGIN
      const rh = Math.max(24, Math.floor((h - (ROWS - 1) * MARGIN) / ROWS));
      setRowHeight(rh);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Stable getter so the polling loop always sees the latest watchlist
  const entriesRef = useRef(useWatchlistStore.getState().entries);
  useEffect(() => {
    return useWatchlistStore.subscribe((s) => {
      entriesRef.current = s.entries;
    });
  }, []);

  // Subscribe to price feed
  useEffect(() => {
    const unsub = subscribePrices(() =>
      entriesRef.current.map((e) => e.address),
    );
    return unsub;
  }, []);

  // Auto-select first watchlist token once prices land
  useEffect(() => {
    if (activeToken) return;
    const unsub = usePriceStore.subscribe((s) => {
      if (useUIStore.getState().activeToken) return;
      const entries = entriesRef.current;
      for (const e of entries) {
        const snap = s.tokens[e.address.toLowerCase()];
        if (snap?.pairAddress) {
          setActiveToken({
            address: e.address,
            chain: e.chain,
            symbol: snap.symbol,
          });
          break;
        }
      }
    });
    return unsub;
  }, [activeToken, setActiveToken]);

  const layoutForGrid = useMemo<LayoutItem[]>(
    () => layouts.map((l) => ({ ...l })),
    [layouts],
  );

  return (
    <div className={styles.root}>
      <Ticker />

      <div className={styles.gridWrap} ref={wrapRef}>
        <div className={styles.gridInner}>
          <ResponsiveGrid
            className="layout"
            layout={layoutForGrid}
            cols={COLS}
            rowHeight={rowHeight}
            margin={[MARGIN, MARGIN]}
            containerPadding={[0, 0]}
            draggableHandle=".drag-handle"
            isBounded={false}
            compactType="vertical"
            preventCollision={false}
            onLayoutChange={(next: readonly LayoutItem[]) =>
              onLayoutChange(
                next.map((l) => ({
                  i: l.i,
                  x: l.x,
                  y: l.y,
                  w: l.w,
                  h: l.h,
                  minW: l.minW,
                  minH: l.minH,
                })),
              )
            }
          >
            <div key="watchlist">
              <Watchlist />
            </div>
            <div key="chart">
              <Chart />
            </div>
            <div key="info">
              <Info />
            </div>
            <div key="swap">
              <Swap />
            </div>
            <div key="discover">
              <Discover />
            </div>
          </ResponsiveGrid>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
