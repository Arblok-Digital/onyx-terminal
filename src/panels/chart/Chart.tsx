/**
 * @file Chart.tsx
 * @layer panel
 * @desc Chart panel — header (token info, % changes), resolution switcher,
 *       and a GeckoTerminal pool embed iframe. Driven by useUIStore.activeToken.
 * @exposes default Chart
 * @deps ui/Panel, hooks/usePrice, panels/chart/ChartEmbed, core/event-bus
 */
import { useEffect, useState } from "react";
import Panel from "@/ui/Panel";
import { useUIStore } from "@/core/store/ui.store";
import { usePriceFor } from "@/hooks/usePrice";
import { bus } from "@/core/event-bus";
import ChartEmbed from "./ChartEmbed";
import { DEFAULT_CHART_OPTIONS, RESOLUTIONS } from "./chart.config";
import { formatPrice, formatPercent, formatCompact } from "@/utils/format";
import { analyzeToken } from "@amd_integration";
import IntelligenceReportView from "./IntelligenceReportView";
import styles from "./Chart.module.css";
import type { ChartEmbedOptions } from "@/feeds/geckoterminal";

export default function Chart() {
  const activeToken = useUIStore((s) => s.activeToken);
  const setActiveToken = useUIStore((s) => s.setActiveToken);
  const snap = usePriceFor(activeToken?.address);
  const [resolution, setResolution] = useState<ChartEmbedOptions["resolution"]>(
    DEFAULT_CHART_OPTIONS.resolution,
  );
  const [activeTab, setActiveTab] = useState<"chart" | "intelligence">("chart");
  const [intelligenceReport, setIntelligenceReport] = useState<any | null>(null);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (
      payload: { address: string; chain: string; symbol?: string },
    ) => {
      setActiveToken({
        address: payload.address,
        chainId: payload.chain as never,
        symbol: payload.symbol,
      });
      // Reset to chart tab when token changes
      setActiveTab("chart");
    };
    bus.on("token:select", handler);
    return () => bus.off("token:select", handler);
  }, [setActiveToken]);

  // Fetch intelligence report when active token changes
  useEffect(() => {
    if (!activeToken?.address) {
      setIntelligenceReport(null);
      return;
    }

    let isMounted = true;
    const fetchIntelligence = async () => {
      setIsLoadingIntelligence(true);
      setIntelligenceError(null);
      try {
        console.log("[Chart] Fetching intelligence report for:", activeToken.address);
        const report = await analyzeToken(activeToken.address);
        console.log("[Chart] Received intelligence report:", report);
        if (isMounted) {
          setIntelligenceReport(report);
        }
      } catch (error) {
        if (isMounted) {
          setIntelligenceError("Failed to load intelligence report");
          console.error("Intelligence analysis error:", error);
        }
      } finally {
        if (isMounted) {
          setIsLoadingIntelligence(false);
        }
      }
    };

    fetchIntelligence();

    return () => {
      isMounted = false;
    };
  }, [activeToken]);

  const ch1 = snap?.priceChange1h;
  const ch24 = snap?.priceChange24h;
  const ch1Class =
    ch1 == null ? styles.muted : ch1 >= 0 ? styles.up : styles.down;
  const ch24Class =
    ch24 == null ? styles.muted : ch24 >= 0 ? styles.up : styles.down;

  const hasChart = Boolean(activeToken && snap?.pairAddress);

  return (
    <Panel
      id="chart"
      title={
        snap
          ? `${snap.symbol} · ${snap.name}`
          : activeToken
            ? "Loading…"
            : "Chart"
      }
    >
      <div className={styles.body}>
        <div className={styles.infoBar}>
          {snap ? (
            <>
              <div className={styles.tokenName}>
                {snap.iconUrl && (
                  <img
                    className={styles.icon}
                    src={snap.iconUrl}
                    alt={snap.symbol}
                  />
                )}
                {snap.symbol}
              </div>
              <div className={styles.price}>{formatPrice(snap.priceUsd)}</div>
              <div className={styles.changes}>
                <span>
                  <span className={styles.changeLabel}>1H</span>
                  <span className={ch1Class}>
                    {ch1 !== undefined ? formatPercent(ch1) : "—"}
                  </span>
                </span>
                <span>
                  <span className={styles.changeLabel}>24H</span>
                  <span className={ch24Class}>
                    {ch24 !== undefined ? formatPercent(ch24) : "—"}
                  </span>
                </span>
                <span>
                  <span className={styles.changeLabel}>VOL</span>
                  <span className={styles.muted}>
                    {snap.volume24h !== undefined
                      ? formatCompact(snap.volume24h)
                      : "—"}
                  </span>
                </span>
                <span>
                  <span className={styles.changeLabel}>LIQ</span>
                  <span className={styles.muted}>
                    {snap.liquidity !== undefined
                      ? formatCompact(snap.liquidity)
                      : "—"}
                  </span>
                </span>
              </div>
            </>
          ) : (
            <div className={styles.muted} style={{ fontSize: 12 }}>
              Pilih token dari watchlist —&gt;
            </div>
          )}

          <div className={styles.spacer} />

          <div className={styles.resBar}>
            <button
              className={[
                styles.resBtn,
                activeTab === "chart" ? styles.resBtnActive : "",
              ].join(" ")}
              onClick={() => setActiveTab("chart")}
            >
              CHART
            </button>
            <button
              className={[
                styles.resBtn,
                activeTab === "intelligence" ? styles.resBtnActive : "",
              ].join(" ")}
              onClick={() => setActiveTab("intelligence")}
              disabled={false}
            >
              {isLoadingIntelligence ? "ANALYZING..." : "INTELLIGENCE"}
            </button>
            {activeTab === "chart" && (
              <>
                {RESOLUTIONS.map((r) => (
                  <button
                    key={r.id}
                    className={[
                      styles.resBtn,
                      resolution === r.id ? styles.resBtnActive : "",
                    ].join(" ")}
                    onClick={() => setResolution(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {hasChart && snap?.pairAddress ? (
          activeTab === "chart" ? (
            <ChartEmbed
              chain={snap.chain}
              poolAddress={snap.pairAddress}
              options={{ ...DEFAULT_CHART_OPTIONS, resolution }}
            />
          ) : (
            <div className={styles.intelligenceContainer}>
              {isLoadingIntelligence ? (
                <div className={styles.loadingIntelligence}>
                  <div className={styles.loader}></div>
                  <div>Analyzing token with AMD Intelligence...</div>
                </div>
              ) : intelligenceError ? (
                <div className={styles.intelligenceError}>
                  {intelligenceError}
                </div>
              ) : intelligenceReport ? (
                <IntelligenceReportView report={intelligenceReport} />
              ) : (
                <div className={styles.emptyIntelligence}>
                  No intelligence data available
                </div>
              )}
            </div>
          )
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>◇</div>
            <div className={styles.emptyTitle}>No token selected</div>
            <div className={styles.emptyHint}>
              Click a row in the watchlist to load its chart.
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
