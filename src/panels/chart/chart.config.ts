/**
 * @file chart.config.ts
 * @layer panel
 * @desc Default chart embed options + supported resolution list for the
 *       resolution switcher in the Chart panel header.
 * @exposes DEFAULT_CHART_OPTIONS, RESOLUTIONS
 * @deps feeds/geckoterminal (type only)
 */
import type { ChartEmbedOptions } from "@/feeds/geckoterminal";

export const DEFAULT_CHART_OPTIONS: ChartEmbedOptions = {
  chartType: "candles",
  resolution: "15",
  showTrades: false,
  theme: "dark",
};

export const RESOLUTIONS: { id: ChartEmbedOptions["resolution"]; label: string }[] = [
  { id: "1", label: "1m" },
  { id: "5", label: "5m" },
  { id: "15", label: "15m" },
  { id: "60", label: "1H" },
  { id: "240", label: "4H" },
  { id: "1D", label: "1D" },
];
