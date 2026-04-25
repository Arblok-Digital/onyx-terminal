/**
 * @file format.ts
 * @layer utils
 * @desc Number formatters: USD, percent, large-number compactor (1.2M, 4.5K).
 *       Pure functions, ZERO side effects.
 * @exposes formatUsd, formatCompact, formatPercent, formatPrice, formatAddress
 * @deps -
 */

const usdLargeFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

const usdSmallFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

/** Compact USD ($1.2M, $4.5K, $19.99). */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  if (value === 0) return "$0";
  if (Math.abs(value) >= 1_000) return usdLargeFmt.format(value);
  if (Math.abs(value) >= 0.01) return usdSmallFmt.format(value);
  // For very small token prices, show significant figures
  return `$${value.toPrecision(4)}`;
}

/** Compact number ("1.2M", "4.5K", "320"). */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return compactFmt.format(value);
}

/** Signed percent ("+4.20%", "-1.00%"). */
export function formatPercent(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** Token price — adapts decimals to magnitude. */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  if (value >= 1) {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`;
  }
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toPrecision(3)}`;
}

/** Truncate address: "EPjF...Dt1v" */
export function formatAddress(addr: string, head = 4, tail = 4): string {
  if (!addr || addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
