/**
 * @file validation.ts
 * @layer lib
 * @desc Zod schemas for external API responses (DexScreener, Jupiter, Supabase, AI).
 *       Guards against malformed data crashing the frontend.
 * @exposes validateResponse, schemas
 * @deps zod
 */
import { z } from 'zod';

// ── DexScreener Pair Schema ──
const DexScreenerTxnsSchema = z.object({
  m5: z.object({ buys: z.number(), sells: z.number() }).optional().default({ buys: 0, sells: 0 }),
  h1: z.object({ buys: z.number(), sells: z.number() }).optional().default({ buys: 0, sells: 0 }),
  h6: z.object({ buys: z.number(), sells: z.number() }).optional().default({ buys: 0, sells: 0 }),
  h24: z.object({ buys: z.number(), sells: z.number() }).optional().default({ buys: 0, sells: 0 }),
});

const DexScreenerVolumeSchema = z.object({
  m5: z.number().optional(),
  h1: z.number().optional(),
  h6: z.number().optional(),
  h24: z.number().optional(),
});

const DexScreenerPriceChangeSchema = z.object({
  m5: z.number().optional(),
  h1: z.number().optional(),
  h6: z.number().optional(),
  h24: z.number().optional(),
});

export const DexScreenerPairSchema = z.object({
  chainId: z.string(),
  dexId: z.string(),
  url: z.string().optional(),
  pairAddress: z.string().optional(),
  baseToken: z.object({
    address: z.string(),
    name: z.string(),
    symbol: z.string(),
  }),
  quoteToken: z.object({
    address: z.string(),
    name: z.string(),
    symbol: z.string(),
  }),
  priceNative: z.string().optional(),
  priceUsd: z.string().optional(),
  txns: DexScreenerTxnsSchema.optional(),
  volume: DexScreenerVolumeSchema.optional(),
  priceChange: DexScreenerPriceChangeSchema.optional(),
  liquidity: z.object({
    usd: z.number().optional(),
    base: z.number().optional(),
    quote: z.number().optional(),
  }).optional(),
  fdv: z.number().optional(),
  marketCap: z.number().optional(),
  pairCreatedAt: z.number().optional(),
  info: z.object({
    imageUrl: z.string().optional(),
    header: z.string().optional(),
    openGraph: z.string().optional(),
    websites: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
    socials: z.array(z.object({ type: z.string(), url: z.string() })).optional(),
  }).optional(),
}).passthrough();

export const DexScreenerResponseSchema = z.object({
  schemaVersion: z.string().optional(),
  pairs: z.array(DexScreenerPairSchema).optional().default([]),
});

// ── Jupiter Quote Schema ──
export const JupiterQuoteSchema = z.object({
  inputMint: z.string(),
  inAmount: z.string(),
  outputMint: z.string(),
  outAmount: z.string(),
  otherAmountThreshold: z.string(),
  swapMode: z.enum(['ExactIn', 'ExactOut']).optional(),
  slippageBps: z.number().optional(),
  platformFee: z.object({ amount: z.string(), feeBps: z.number() }).optional().nullable(),
  priceImpactPct: z.string().optional(),
  routePlan: z.array(z.object({
    swapInfo: z.object({
      ammKey: z.string(),
      label: z.string().optional(),
      inputMint: z.string(),
      outputMint: z.string(),
      inAmount: z.string(),
      outAmount: z.string(),
      feeAmount: z.string(),
      feeMint: z.string(),
    }),
    percent: z.number(),
  })).optional().default([]),
  contextSlot: z.number().optional().nullable(),
  timeTaken: z.number().optional(),
}).passthrough();

// ── Supabase Response Schema ──
export const SupabaseResponseSchema = z.object({
  data: z.unknown().nullable(),
  error: z.object({
    message: z.string(),
    details: z.string().optional(),
    hint: z.string().optional(),
    code: z.string().optional(),
  }).nullable(),
  count: z.number().optional().nullable(),
  status: z.number().optional(),
  statusText: z.string().optional(),
}).passthrough();

// ── AI / Intelligence Report Schema ──
export const IntelligenceReportSchema = z.object({
  executiveSummary: z.string().optional().default(''),
  recommendation: z.string().optional().default('hold'),
  confidenceScore: z.number().min(0).max(1).optional().default(0),
  keyInsights: z.array(z.object({
    category: z.string().optional(),
    insight: z.string(),
    confidence: z.number().min(0).max(1),
  })).optional().default([]),
  intelligenceRanking: z.object({
    rating: z.enum(['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'AVOID']).optional(),
    opportunityScore: z.number().min(0).max(1).optional().default(0),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  }).optional(),
  smartMoneyAnalysis: z.unknown().optional(),
  narrativeAnalysis: z.unknown().optional(),
  rugPullAnalysis: z.unknown().optional(),
  timestamp: z.number().optional(),
}).passthrough();

// ── Telegram / Chat Message Schema ──
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message content cannot be empty'),
  timestamp: z.number().optional(),
  tokenAddress: z.string().optional(),
});

// ── Generic Validators ──

/**
 * Safely parse and validate an unknown value against a Zod schema.
 * Returns { success, data, error }.
 */
export function validateResponse<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.issues.map(
    (issue) => `[${issue.path.join('.')}] ${issue.message}`
  );
  return { success: false, error: issues.join('; ') };
}

/**
 * Parse with defaults when validation fails — never throws.
 */
export function safeParse<T>(schema: z.ZodSchema<T>, value: unknown, fallback: T): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  console.warn('[Validation] Schema validation failed, using fallback:', result.error.issues);
  return fallback;
}

// ── Reusable type helpers ──
export type DexScreenerPair = z.infer<typeof DexScreenerPairSchema>;
export type JupiterQuote = z.infer<typeof JupiterQuoteSchema>;
export type IntelligenceReportValidated = z.infer<typeof IntelligenceReportSchema>;