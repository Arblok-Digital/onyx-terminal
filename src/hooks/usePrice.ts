/**
 * @file usePrice.ts
 * @layer hooks
 * @desc Bridge price store ke komponen. Selectors yang sering dipakai panel.
 * @exposes usePriceFor, usePriceList, useTopMovers
 * @deps core/store/price.store
 */
import { useMemo } from "react";
import { usePriceStore } from "@/core/store/price.store";
import type { TokenSnapshot } from "@/core/store/price.store";

/** Single token by address. Returns undefined while loading. */
export function usePriceFor(
  address: string | null | undefined,
): TokenSnapshot | undefined {
  return usePriceStore((s) =>
    address ? s.tokens[address.toLowerCase()] : undefined,
  );
}

/** Hydrated list of TokenSnapshot in the order of `addresses`. */
export function usePriceList(addresses: string[]): TokenSnapshot[] {
  const tokens = usePriceStore((s) => s.tokens);
  return useMemo(() => {
    const out: TokenSnapshot[] = [];
    for (const a of addresses) {
      const snap = tokens[a.toLowerCase()];
      if (snap) out.push(snap);
    }
    return out;
  }, [tokens, addresses]);
}

/** Top N movers from the given address pool, sorted by abs(priceChange1h). */
export function useTopMovers(addresses: string[], limit = 5): TokenSnapshot[] {
  const list = usePriceList(addresses);
  return useMemo(() => {
    return [...list]
      .filter((t) => Number.isFinite(t.priceChange1h))
      .sort(
        (a, b) =>
          Math.abs(b.priceChange1h ?? 0) - Math.abs(a.priceChange1h ?? 0),
      )
      .slice(0, limit);
  }, [list, limit]);
}
