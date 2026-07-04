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
import styles from "./Chart.module.css";
import type { ChartEmbedOptions } from "@/feeds/geckoterminal";

export default function Chart() {
  const activeToken = useUIStore((s) => s.activeToken);
  const setActiveToken = useUIStore((s) => s.setActiveToken);
  const snap = usePriceFor(activeToken?.address);
  const [resolution, setResolution] = useState<ChartEmbedOptions["resolution"]>(
    DEFAULT_CHART_OPTIONS.resolution,
  );

  useEffect(() => {
    const handler = (
      payload: { address: string; chain: string; symbol?: string },
    ) => {
      setActiveToken({
        address: payload.address,
        chainId: payload.chain as never,
        symbol: payload.symbol,
      });
    };
    bus.on("token:select", handler);
    return () => bus.off("token:select", handler);
  }, [setActiveToken]);

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
              Pilih token dari watchlist &rarr;
            </div>
          )}

          <div className={styles.spacer} />

          <div className={styles.resBar}>
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
          </div>
        </div>

        {hasChart && snap?.pairAddress ? (
          <ChartEmbed
            chain={snap.chain}
            poolAddress={snap.pairAddress}
            options={{ ...DEFAULT_CHART_OPTIONS, resolution }}
          />
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