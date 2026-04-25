/**
 * @file info.config.ts
 * @layer panel
 * @desc Pure formatters and lookup tables for the Token Info panel: link
 *       icon glyphs, social-type → label, time-bucket labels, and the
 *       "age" formatter (turns a unix-ms creation timestamp into "3d 4h").
 * @exposes BUCKET_LABELS, SOCIAL_LABELS, formatAge, formatBuyRatio, getLinkGlyph
 * @deps -
 */

export const BUCKET_LABELS: { id: "5m" | "1h" | "6h" | "24h"; label: string }[] = [
  { id: "5m", label: "5M" },
  { id: "1h", label: "1H" },
  { id: "6h", label: "6H" },
  { id: "24h", label: "24H" },
];

export const SOCIAL_LABELS: Record<string, string> = {
  website: "WEB",
  twitter: "X",
  x: "X",
  telegram: "TG",
  discord: "DC",
  github: "GH",
  medium: "MD",
  reddit: "RD",
  youtube: "YT",
  facebook: "FB",
  instagram: "IG",
  tiktok: "TT",
};

export function getSocialLabel(type: string): string {
  return SOCIAL_LABELS[type.toLowerCase()] ?? type.slice(0, 3).toUpperCase();
}

/** "3d 4h", "12h", "47m", "—" for invalid input. */
export function formatAge(createdAt: number | null | undefined): string {
  if (!createdAt || !Number.isFinite(createdAt)) return "—";
  const ms = Date.now() - createdAt;
  if (ms < 0) return "—";
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return "<1m";
}

/** Buys / (buys + sells) as a 0..1 ratio. Returns null when both are 0. */
export function buyRatio(
  buys: number | undefined,
  sells: number | undefined,
): number | null {
  const b = buys ?? 0;
  const s = sells ?? 0;
  const total = b + s;
  if (total === 0) return null;
  return b / total;
}
