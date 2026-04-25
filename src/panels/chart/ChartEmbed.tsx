/**
 * @file ChartEmbed.tsx
 * @layer panel
 * @desc Thin iframe wrapper around the GeckoTerminal pool embed URL built
 *       by `feeds/geckoterminal`. Memoizes the URL on its primitive inputs
 *       so price-tick re-renders never remount the iframe.
 * @exposes default ChartEmbed
 * @deps feeds/geckoterminal
 */
import { memo, useEffect, useMemo, useState } from "react";
import { buildChartUrl } from "@/feeds/geckoterminal";
import type { ChartEmbedOptions } from "@/feeds/geckoterminal";
import styles from "./Chart.module.css";

type Props = {
  chain: string;
  poolAddress: string;
  options: ChartEmbedOptions;
};

function ChartEmbed({ chain, poolAddress, options }: Props) {
  const url = useMemo(
    () => buildChartUrl(chain, poolAddress, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      chain,
      poolAddress,
      options.resolution,
      options.theme,
      options.chartType,
      options.showTrades,
    ],
  );

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
    const t = window.setTimeout(() => setLoaded(true), 2000);
    return () => window.clearTimeout(t);
  }, [url]);

  return (
    <div className={styles.embedWrap}>
      {!loaded && <div className={styles.loading}>Loading chart…</div>}
      <iframe
        className={styles.iframe}
        src={url}
        title="Price chart"
        loading="eager"
        allow="clipboard-write"
        allowFullScreen
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

export default memo(ChartEmbed, (prev, next) => {
  return (
    prev.chain === next.chain &&
    prev.poolAddress === next.poolAddress &&
    prev.options.resolution === next.options.resolution &&
    prev.options.theme === next.options.theme &&
    prev.options.chartType === next.options.chartType &&
    prev.options.showTrades === next.options.showTrades
  );
});
