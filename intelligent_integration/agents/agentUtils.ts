/**
 * Shared utilities for all agents
 */
import { Connection, PublicKey } from '@solana/web3.js';
import { RPC_ENDPOINT } from '../config/rpcConfig';
import { tokenCache } from '../services/tokenCache';
import { stats } from '../services/agentStats';
import Decimal from 'decimal.js';
import type { OnchainData, SocialData } from './onchainAgent';

// ──────────────────────────────────────
// Decimal.js helpers (overflow-safe)
// ──────────────────────────────────────

/** Convert any value to Decimal safely */
export function toDecimal(val: any): Decimal {
    if (val === null || val === undefined || val === '' || (typeof val === 'number' && !isFinite(val))) {
        return new Decimal(0);
    }
    try {
        const n = typeof val === 'string' ? val.replace(/[^0-9.\-eE+]/g, '') : val;
        const d = new Decimal(n);
        return d.isFinite() ? d : new Decimal(0);
    } catch {
        return new Decimal(0);
    }
}

/** Safe multiply */
export function dMul(a: any, b: any): Decimal {
    return toDecimal(a).mul(toDecimal(b));
}

/** Safe divide (returns fallback on /0) */
export function dDiv(a: any, b: any, fallback: string | number = 0): Decimal {
    const divisor = toDecimal(b);
    if (divisor.isZero()) return toDecimal(fallback);
    return toDecimal(a).div(divisor);
}

/** Safe add */
export function dAdd(...vals: any[]): Decimal {
    return vals.reduce<Decimal>((sum, v) => sum.add(toDecimal(v)), new Decimal(0));
}

/** Decimal → number */
export function dNum(d: Decimal): number {
    return d.toNumber();
}

// ──────────────────────────────────────
// Number helpers
// ──────────────────────────────────────

/** Safe number conversion */
export function safeNumber(val: any, fallback = 0): number {
    if (val === null || val === undefined) return fallback;
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
}

/** Safe percentage */
export function safePercent(val: any, fallback = 0): number {
    return Math.min(Math.max(safeNumber(val, fallback), -10000), 10000);
}

// ──────────────────────────────────────
// Token Metadata (with cache)
// ──────────────────────────────────────

export async function fetchTokenMetadata(mint: string): Promise<OnchainData> {
    const cached = tokenCache.get(mint);
    if (cached) {
        stats.cacheHits++;
        return cached.onchain;
    }

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const pubkey = new PublicKey(mint);
    const start = Date.now();

    const [supplyInfo, largestHolders, tokenLargestAccounts] = await Promise.all([
        connection.getTokenSupply(pubkey).catch(() => null),
        connection.getTokenLargestAccounts(pubkey).catch(() => ({ value: [] })),
        connection.getParsedAccountInfo(pubkey).catch(() => null),
    ]);

    stats.recordRpcCall(Date.now() - start);

    const totalSupply = supplyInfo?.value?.uiAmount ?? 0;
    const holderCount = largestHolders?.value?.length ?? 0;
    const decimals = supplyInfo?.value?.decimals ?? 9;

    // Whale concentration
    const topHolderPct = largestHolders?.value?.slice(0, 5).reduce((acc, h) => {
        const amount = safeNumber(h.uiAmount, 0);
        return acc + (totalSupply > 0 ? (amount / totalSupply) * 100 : 0);
    }, 0) ?? 0;

    // LP info from token account
    const accountData = tokenLargestAccounts?.value?.data?.parsed?.info;
    const isLP = accountData?.owner === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' ||
        accountData?.owner === 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc';

    const onchain: OnchainData = {
        totalSupply,
        holderCount,
        topHolderPct,
        decimals,
        creator: accountData?.owner ?? '',
        isLP,
        lpLockedPct: 0,
        tokenAge: 0,
    };

    tokenCache.set(mint, { onchain, social: {} as SocialData, cachedAt: Date.now() });
    return onchain;
}