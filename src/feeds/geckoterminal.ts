/**
 * @file geckoterminal.ts
 * @layer feeds
 * @desc Chart iframe URL builder. Returns a GeckoTerminal pool embed URL
 *       for the given chain + pool address. GeckoTerminal's `embed=1` mode
 *       is purpose-built for foreign iframes and ships TradingView-grade
 *       OHLC candles + on-chain trades.
 *
 *       Function name `buildChartUrl` is intentionally provider-agnostic
 *       so a later phase can swap in a self-hosted lightweight-charts
 *       renderer without changing call sites.
 *
 * @exposes buildChartUrl, ChartEmbedOptions
 * @deps utils/chain
 */
import { dexscreenerToGecko } from "@/utils/chain";

export type ChartEmbedOptions = {
  /** Candles vs line. */
  chartType?: "candles" | "line";
  /** Bars resolution. */
  resolution?: "1" | "5" | "15" | "60" | "240" | "1D";
  /** Show recent trades table beneath chart. */
  showTrades?: boolean;
  /** Theme — Onyx is always dark. */
  theme?: "dark" | "light";
};

export function buildChartUrl(
  chain: string,
  poolAddress: string,
  options: ChartEmbedOptions = {},
): string {
  const network = dexscreenerToGecko(chain);
  const params = new URLSearchParams({
    embed: "1",
    info: "0",
    swaps: options.showTrades ? "1" : "0",
    grayscale: "0",
    light_chart: options.theme === "light" ? "1" : "0",
  });
  return `https://www.geckoterminal.com/${network}/pools/${poolAddress}?${params.toString()}`;
}
