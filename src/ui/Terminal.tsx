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
import { RotateCcw, BarChart3, Repeat, Activity, Globe } from "lucide-react";
import "react-grid-layout/css/styles.css";

import Ticker from "./Ticker";
import StatusBar from "./StatusBar";
import Watchlist from "@/panels/watchlist/Watchlist";
import Chart from "@/panels/chart/Chart";
import Info from "@/panels/info/Info";
import Swap from "@/panels/swap/Swap";
import Discover from "@/panels/discover/Discover";
import FlowMonitor from "@/panels/flow-monitor/FlowMonitor";

import { useLayout } from "@/hooks/useLayout";
import { useLayoutStore } from "@/core/store/layout.store";
import { useWatchlistStore } from "@/panels/watchlist/watchlist.store";
import { bus } from "@/core/event-bus";
import { useUIStore } from "@/core/store/ui.store";
import { usePriceStore } from "@/core/store/price.store";
import { subscribePrices, getLatestProfiles } from "@/feeds/dexscreener";
import styles from "./Terminal.module.css";

const ResponsiveGrid = WidthProvider(GridLayout);
const COLS = 12;
const ROWS = 12;
const MARGIN = 6;

export default function Terminal() {
  const { layouts, onLayoutChange, reset } = useLayout();
  const setActiveToken = useUIStore((s) => s.setActiveToken);
  const activeToken = useUIStore((s) => s.activeToken);
  const mobileTab = useLayoutStore((s) => s.mobileTab);
  const setMobileTab = useLayoutStore((s) => s.setMobileTab);

  // State untuk menyimpan daftar koin "Mecin" trending sebagai indikator market
  const [marketIndexMints, setMarketIndexMints] = useState<string[]>([]);

  useEffect(() => {
    // Ambil 10 koin terbaru/trending di Solana untuk indikator Bull/Bear
    getLatestProfiles().then(profiles => {
      const solMints = profiles.filter(p => p.chainId === 'solana').slice(0, 10).map(p => p.tokenAddress);
      setMarketIndexMints(solMints);
      console.log("Onyx Index Mints Loaded:", solMints.length);
    });
  }, []);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // Local state untuk handle layout trade di mobile agar bisa di-resize dengan lancar
  const [mobileTradeLayout, setMobileTradeLayout] = useState<LayoutItem[]>([
    { i: "chart", x: 0, y: 0, w: 1, h: 10, minH: 5 },
    { i: "swap", x: 0, y: 10, w: 1, h: 8, minH: 5 }
  ]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // Centralized "One-Click" Pipeline: Listen to token selection and switch tab on mobile
  useEffect(() => {
    const handleTokenSelect = (token: any) => {
      setActiveToken(token);
      // Jika di mobile/PWA, otomatis pindah ke tab TRADE supaya Swap panel kelihatan
      if (window.innerWidth < 768) {
        setMobileTab("trade");
      }
    };

    bus.on("token:select", handleTokenSelect);
    return () => {
      bus.off("token:select", handleTokenSelect);
    };
  }, [setActiveToken, setMobileTab]);

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
      Array.from(new Set([...entriesRef.current.map((e) => e.address), ...marketIndexMints]))
    );
    return unsub;
  }, [marketIndexMints]);

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

  if (isMobile) {
    return (
      <div className={styles.root} style={{ display: 'flex', flexDirection: 'column' }}>
        <Ticker />
        
        {/* Mobile Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px', paddingBottom: '100px' }}>
          {mobileTab === 'market' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Info />
              <Watchlist />
            </div>
          )}
          {mobileTab === 'trade' && (
            <ResponsiveGrid
              className="layout"
              cols={1}
              rowHeight={42} // Gunakan fixed height yang lebih pas untuk touch target di mobile
              margin={[0, 8]}
              isDraggable={false} // Di mobile fokus ke resize saja biar gak geser-geser gak sengaja
              isResizable={true}
              draggableHandle=".drag-handle"
              layout={mobileTradeLayout}
              onLayoutChange={(current) => setMobileTradeLayout(current as LayoutItem[])}
              compactType="vertical"
            >
              <div key="chart">
                <Chart />
              </div>
              <div key="swap">
                <Swap />
              </div>
            </ResponsiveGrid>
          )}
          {mobileTab === 'flow' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <FlowMonitor />
              <Discover />
            </div>
          )}
        </div>

        {/* Floating Reset Button for Mobile */}
        <button
          onClick={() => {
            if (confirm("Reset layout to default Bloomberg view?")) {
              reset();
              window.location.reload();
            }
          }}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '12px',
            zIndex: 3000,
            background: 'rgba(17, 24, 39, 0.9)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            color: '#3b82f6',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
          }}
          title="Reset Layout"
        >
          <RotateCcw size={18} />
        </button>

        {/* Bottom Navigation Bar */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '65px',
          background: 'rgba(10, 10, 11, 0.8)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 2000,
          paddingBottom: 'env(safe-area-inset-bottom)', // Support untuk notch iPhone
        }}>
          <button 
            onClick={() => setMobileTab('market')}
            style={{ background: 'none', border: 'none', color: mobileTab === 'market' ? '#3b82f6' : '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px' }}
          >
            <Globe size={20} />
            <span>MARKET</span>
          </button>
          <button 
            onClick={() => setMobileTab('trade')}
            style={{ 
              background: mobileTab === 'trade' ? '#3b82f6' : '#1f2937', 
              border: 'none', 
              color: mobileTab === 'trade' ? '#fff' : '#9ca3af', 
              width: '50px', height: '50px', borderRadius: '50%', marginTop: '-30px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '9px' 
            }}
          >
            <Repeat size={20} />
            <span>TRADE</span>
          </button>
          <button 
            onClick={() => setMobileTab('flow')}
            style={{ background: 'none', border: 'none', color: mobileTab === 'flow' ? '#3b82f6' : '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px' }}
          >
            <Activity size={20} />
            <span>FLOW</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Ticker />

      {/* Floating Layout Reset Control */}
      <div style={{
        position: 'absolute',
        top: '36px',
        right: '12px',
        zIndex: 1000,
      }}>
        <button
          onClick={() => {
            if (confirm("Reset layout to default Bloomberg view?")) {
              reset();
              // Force hard reload to ensure React Grid Layout internal state is cleared
              window.location.reload();
            }
          }}
          style={{
            background: '#111827',
            border: '1px solid #374151',
            color: '#9ca3af',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <RotateCcw size={10} />
          RESET LAYOUT
        </button>
      </div>

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
            <div key="flow-monitor">
              <FlowMonitor />
            </div>
          </ResponsiveGrid>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
