import { useState, useEffect } from 'react';
import { CONFIG } from '@/core/config';

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
        // 1. Fetch Real Transaction Data dari DexScreener
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        const dexData = await dexRes.json();
        const pair = dexData.pairs?.[0];

        if (pair) {
          const txns = pair.txns?.h24 || { buys: 0, sells: 0 };
          const volume = pair.volume?.h24 || 0;

          // 2. Fetch On-chain Data dari Helius
          const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${CONFIG.HELIUS_API_KEY}`;
          
          const [supplyRes, largestAccRes] = await Promise.all([
            fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenSupply', params: [address] })
            }),
            fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'getTokenLargestAccounts', params: [address] })
            })
          ]);

          const supplyData = await supplyRes.json();
          const holdersData = await largestAccRes.json();

          const totalSupply = parseFloat(supplyData.result?.value?.amount || "0");
          const largestAccounts = holdersData.result?.value || [];
          
          // Hitung distribusi Top 10 secara on-chain
          const top10Supply = largestAccounts
            .slice(0, 10)
            .reduce((sum: number, acc: any) => sum + parseFloat(acc.amount), 0);

          const distributionRatio = totalSupply > 0 ? (top10Supply / totalSupply) * 100 : 0;

          // 3. Gabungkan data
          setStats({
            // Fallback: Jika DexScreener belum index holder, tulis N/A (Data On-chain di Solana butuh Indexer khusus untuk jumlah total)
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