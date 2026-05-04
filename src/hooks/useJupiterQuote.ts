/**
 * @file useJupiterQuote.ts
 * @desc Minimal Jupiter token info & validation helpers (TypeScript).
 *       Dipakai oleh Swap.tsx custom.
 */

import { useState, useEffect } from "react";

export interface TokenInfo {
  mint: string;
  symbol: string;
  decimals: number;
}

export const KNOWN_TOKENS: Record<string, TokenInfo> = {
  SOL: { mint: "So11111111111111111111111111111111111111112", symbol: "SOL", decimals: 9 },
  USDC: { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC", decimals: 6 },
  USDT: { mint: "Es9vMFrzaCER4m5FRFtp1pRMgZE4TvstZ9FYmSas2HnZ", symbol: "USDT", decimals: 6 },
  BONK: { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", decimals: 5 },
  WIF: { mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", decimals: 6 },
  JUP: { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", symbol: "JUP", decimals: 6 },
};

/**
 * Hook untuk mendapatkan info token secara dynamic (on-chain/API).
 */
export function useJupiterTokenInfo(mint: string): TokenInfo | null {
  const [info, setInfo] = useState<TokenInfo | null>(null);

  useEffect(() => {
    if (!mint) {
      setInfo(null);
      return;
    }

    // 1. Cek di daftar koin populer dulu (Instant)
    const known = Object.values(KNOWN_TOKENS).find((t) => t.mint === mint);
    if (known) {
      setInfo(known);
      return;
    }

    // 2. Jika tidak ada, fetch ke Jupiter Token API
    fetch(`https://tokens.jup.ag/token/${mint}`)
      .then((res) => res.json())
      .then((data) => {
        if (data) setInfo({ mint: data.address, symbol: data.symbol, decimals: data.decimals });
        else setInfo({ mint, symbol: "UNKN", decimals: 6 });
      })
      .catch(() => setInfo({ mint, symbol: "UNKN", decimals: 6 }));
  }, [mint]);

  return info;
}

/**
 * Validasi format address Solana (base58, 32-44 karakter).
 */
export function isValidSolanaMint(addr: string): boolean {
  if (!addr || typeof addr !== "string") return false;
  const base58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58.test(addr.trim());
}