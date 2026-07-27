import { useState, useEffect } from 'react';
import { CONFIG } from '@/core/config';
import { usePriceStore } from '@/core/store/price.store';
import { rpcRateLimiter } from '@/utils/rpcRateLimiter';

export interface TokenStats {
  holders: string;
  txns24h: string;
  buys24h: number;
  sells24h: number;
  volume24h: number;
  distributionRatio: number; // Persentase supply di Top 10 holders
}

export function useTokenStats(address?: string) {
  const [stats, setStats] = useState<TokenStats | null>(null);

  useEffect(() => {
    if (!address) return;

    const fetchStats = async () => {
      try {
        // --- STEP 1: Try shared price.store first ---
        // If the token is in the user's watchlist, its data is already
        // being polled by feeds/dexscreener.ts → no extra network call.
        const store = usePriceStore.getState();
        const snap = store.tokens[address.toLowerCase()];

        let buys24h = 0;
        let sells24h = 0;
        let volume24h = 0;

        if (snap) {
          buys24h = snap.txns24h?.buys ?? 0;
          sells24h = snap.txns24h?.sells ?? 0;
          volume24h = snap.volume24h ?? 0;
        } else {
          // --- Step 1b: Rate-limited fetch via feeds layer ---
          try {
            const { getTokensBatch } = await import('@/feeds/dexscreener');
            const snaps = await getTokensBatch([address]);
            if (snaps.length > 0) {
              const s = snaps[0];
              buys24h = s.txns24h?.buys ?? 0;
              sells24h = s.txns24h?.sells ?? 0;
              volume24h = s.volume24h ?? 0;
              // Also upsert into store for next consumer
              store.upsertMany(snaps);
            }
          } catch (e) {
            console.warn('[useTokenStats] feeds layer failed, using on-chain only:', e);
          }
        }

        // --- STEP 2: On-chain RPC (Distribution) ---
        const fullRpcUrl = CONFIG.SOLANA_RPC;

        const rpcFetch = (body: any) =>
          rpcRateLimiter.fetch(fullRpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

        const [supplyRes, largestAccountsRes] = await Promise.all([
          rpcFetch({ jsonrpc: '2.0', id: 1, method: 'getTokenSupply', params: [address] }),
          rpcFetch({ jsonrpc: '2.0', id: 2, method: 'getTokenLargestAccounts', params: [address] }),
        ]);

        const supplyData = await supplyRes.json();
        const holdersData = await largestAccountsRes.json();

        const supplyValue = supplyData.result?.value;
        const supplyAmount = parseFloat(supplyValue?.amount || '0');
        const decimals = supplyValue?.decimals ?? 0;
        const totalSupply = supplyAmount / Math.pow(10, decimals);
        const largestAccounts = holdersData.result?.value || [];

        // Hitung distribusi Top 10 secara on-chain
        const top10Supply = largestAccounts
          .slice(0, 10)
          .reduce((sum: number, acc: any) => {
            const accDecimals = acc.decimals ?? decimals;
            return sum + (parseFloat(acc.amount) / Math.pow(10, accDecimals));
          }, 0);

        const distributionRatio = totalSupply > 0 ? (top10Supply / totalSupply) * 100 : 0;

        // --- STEP 3: Final Aggregation ---
        setStats({
          holders: snap?.pairAddress ? 'N/A' : 'N/A', // DexScreener doesn't expose holder count per pair
          txns24h: (buys24h + sells24h).toLocaleString(),
          buys24h,
          sells24h,
          volume24h,
          distributionRatio,
        });
      } catch (err) {
        console.error('Failed to fetch real token stats:', err);
      }
    };

    fetchStats();
    const id = setInterval(fetchStats, 30000); // Refresh tiap 30 detik
    return () => clearInterval(id);
  }, [address]);

  return stats;
}
