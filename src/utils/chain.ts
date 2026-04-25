/**
 * @file chain.ts
 * @layer utils
 * @desc Chain ID mapping antar provider (DexScreener vs GeckoTerminal vs Solscan)
 *       + explorer URL builders.
 * @exposes CHAIN_LABELS, dexscreenerToGecko, getExplorerTxUrl, getExplorerAddrUrl
 * @deps core/store/price.store (type only)
 */
import type { ChainId } from "@/core/store/price.store";

export const CHAIN_LABELS: Record<ChainId, string> = {
  solana: "SOL",
  ethereum: "ETH",
  base: "BASE",
  arbitrum: "ARB",
  bsc: "BSC",
  polygon: "POLY",
};

/** DexScreener uses "ethereum" while GeckoTerminal uses "eth". */
const DEX_TO_GECKO: Record<string, string> = {
  solana: "solana",
  ethereum: "eth",
  base: "base",
  arbitrum: "arbitrum",
  bsc: "bsc",
  polygon: "polygon_pos",
  polygon_pos: "polygon_pos",
};

export function dexscreenerToGecko(chain: string): string {
  return DEX_TO_GECKO[chain.toLowerCase()] ?? chain.toLowerCase();
}

/** Normalize a DexScreener chainId to our ChainId enum where possible. */
export function normalizeChain(chain: string): ChainId {
  const c = chain.toLowerCase();
  if (c === "solana") return "solana";
  if (c === "ethereum" || c === "eth") return "ethereum";
  if (c === "base") return "base";
  if (c === "arbitrum") return "arbitrum";
  if (c === "bsc") return "bsc";
  if (c === "polygon" || c === "polygon_pos") return "polygon";
  return "solana";
}

const TX_BUILDERS: Record<ChainId, (hash: string) => string> = {
  solana: (h) => `https://solscan.io/tx/${h}`,
  ethereum: (h) => `https://etherscan.io/tx/${h}`,
  base: (h) => `https://basescan.org/tx/${h}`,
  arbitrum: (h) => `https://arbiscan.io/tx/${h}`,
  bsc: (h) => `https://bscscan.com/tx/${h}`,
  polygon: (h) => `https://polygonscan.com/tx/${h}`,
};

const ADDR_BUILDERS: Record<ChainId, (addr: string) => string> = {
  solana: (a) => `https://solscan.io/account/${a}`,
  ethereum: (a) => `https://etherscan.io/address/${a}`,
  base: (a) => `https://basescan.org/address/${a}`,
  arbitrum: (a) => `https://arbiscan.io/address/${a}`,
  bsc: (a) => `https://bscscan.com/address/${a}`,
  polygon: (a) => `https://polygonscan.com/address/${a}`,
};

export function getExplorerTxUrl(chain: ChainId, hash: string): string {
  return TX_BUILDERS[chain](hash);
}

export function getExplorerAddrUrl(chain: ChainId, addr: string): string {
  return ADDR_BUILDERS[chain](addr);
}
