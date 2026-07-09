import { useState, useEffect } from 'react';
import { CONFIG } from '@/core/config';
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
        // --- STEP 1: DexScreener (Transaction Volumes & Basic Holders) ---
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        const dexData = await dexRes.json();
        const pair = dexData.pairs?.[0];

        if (pair) {
          const txns = pair.txns?.h24 || { buys: 0, sells: 0 };
          const volume = pair.volume?.h24 || 0;

          // --- STEP 2: On-chain RPC (Distribution) ---
          // CONFIG.SOLANA_RPC otomatis pake Helius kalo API key tersedia
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
          const supplyAmount = parseFloat(supplyValue?.amount || "0");
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
            holders: pair.info?.holders ? pair.info.holders.toLocaleString() : "N/A", 
            txns24h: (txns.buys + txns.sells).toLocaleString(),
            buys24h: txns.buys,
            sells24h: txns.sells,
            volume24h: volume,
            distributionRatio
          });
        }
      } catch (err) {
        console.error("Failed to fetch real token stats:", err);
      }
    };

    fetchStats();
    const id = setInterval(fetchStats, 30000); // Refresh tiap 30 detik
    return () => clearInterval(id);
  }, [address]);

  return stats;
}