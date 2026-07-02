/**
 * @file onyx_protocol.ts
 * @layer lib/idl
 * @desc Anchor IDL types for onyx-protocol — matches Rust program exactly.
 *       Seeds mirror Rust constants: b"onyx_config", b"token_analysis".
 * @deps @solana/web3.js
 */

import { PublicKey } from '@solana/web3.js';

// ── Program Constants ──
export const ONYX_PROGRAM_ID = new PublicKey('FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG');

// MUST match Rust: pub const ONYX_CONFIG_SEED: &[u8] = b"onyx_config";
export const ONYX_CONFIG_SEED = Buffer.from('onyx_config');
// MUST match Rust: pub const TOKEN_ANALYSIS_SEED: &[u8] = b"token_analysis";
export const TOKEN_ANALYSIS_SEED = Buffer.from('token_analysis');

// ── PDA Seeds ──
export function getConfigPDA(programId: PublicKey = ONYX_PROGRAM_ID): {
  pda: PublicKey;
  bump: number;
} {
  const [pda, bump] = PublicKey.findProgramAddressSync([ONYX_CONFIG_SEED], programId);
  return { pda, bump };
}

export function getAnalysisPDA(
  mint: PublicKey,
  programId: PublicKey = ONYX_PROGRAM_ID
): { pda: PublicKey; bump: number } {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [TOKEN_ANALYSIS_SEED, mint.toBuffer()],
    programId
  );
  return { pda, bump };
}

// ── On-Chain Account Layouts ──

/** OnyxConfig — global protocol config (singleton) */
export interface OnyxConfigAccount {
  authority: PublicKey;
  feeWallet: PublicKey;
  paused: boolean;
  /** u64 in Rust — fits in JS number for practical ranges */
  analysisCount: number;
  bump: number;
}

/** TokenAnalysis — per-mint comprehensive on-chain intelligence state */
export interface TokenAnalysisAccount {
  mint: PublicKey;
  authority: PublicKey;

  // Whale Activity
  largeTransfers: number;       // u64
  whaleWallets: number;         // u64
  holderConcentration: number;  // u64 (basis points)

  // Holder Growth
  newHolders: number;           // u64
  holderGrowthRate: number;     // i64 (basis points, can be negative)

  // Developer Activity
  devTxCount: number;           // u64
  suspiciousTransfers: number;  // u64
  devWalletBalance: number;     // u64 (lamports)

  // Liquidity Analysis
  liquidityDepth: number;       // u64 (USD cents)
  liquidityChange24h: number;   // i64 (basis points)
  lockedLiquidity: number;      // u64 (USD cents)
  liquidityConcentration: number; // u64 (basis points)

  // RugPull Indicators (0-10000)
  dumpScore: number;            // u64
  liquidityRemovalScore: number; // u64
  devActivityScore: number;     // u64
  overallRugScore: number;      // u64

  // Risk (0-10000)
  riskScore: number;            // u64

  // Contract Analysis
  mintAuthority: boolean;
  freezeAuthority: boolean;
  isVerified: boolean;
  renounced: boolean;
  tokenAgeSeconds: number;      // i64

  // Metadata
  analysisTimestamp: number;    // i64 (unix seconds)
  bump: number;
}

/** UpdateTokenAnalysisParams — matches Rust struct exactly */
export interface UpdateTokenAnalysisParams {
  // Whale Activity
  largeTransfers: number;
  whaleWallets: number;
  holderConcentration: number;

  // Holder Growth
  newHolders: number;
  holderGrowthRate: number;

  // Developer Activity
  devTxCount: number;
  suspiciousTransfers: number;
  devWalletBalance: number;

  // Liquidity
  liquidityDepth: number;
  liquidityChange24h: number;
  lockedLiquidity: number;
  liquidityConcentration: number;

  // RugPull Scores (0-10000)
  dumpScore: number;
  liquidityRemovalScore: number;
  devActivityScore: number;
  overallRugScore: number;

  // Risk Score (0-10000)
  riskScore: number;

  // Contract Info
  mintAuthority: boolean;
  freezeAuthority: boolean;
  isVerified: boolean;
  renounced: boolean;
  tokenAgeSeconds: number;
}

// ── Instruction Discriminators (Anchor 0.30 sighash(sha256("global:<name>"))[..8]) ──
// Computed via: crypto.createHash('sha256').update('global:initialize').digest().slice(0,8)
export const IX_DISCRIMINATORS = {
  initialize: Buffer.from([0xaf, 0xaf, 0x6d, 0x1f, 0x0d, 0x98, 0x9b, 0xed]),
  initTokenAnalysis: Buffer.from([0x68, 0xe1, 0xe5, 0xab, 0x53, 0x47, 0x1d, 0xbb]),
  updateTokenAnalysis: Buffer.from([0x0b, 0xf6, 0x80, 0xc6, 0xf3, 0xcb, 0x11, 0xcd]),
  closeTokenAnalysis: Buffer.from([0xba, 0xd3, 0xda, 0x4d, 0x29, 0xa6, 0xa2, 0x48]),
} as const;

// ── Account Discriminators (Anchor 0.30 sighash(sha256("account:<AccountName>"))[..8]) ──
export const ACCOUNT_DISCRIMINATORS = {
  ONYX_CONFIG: Buffer.from([0x96, 0xbe, 0x82, 0x26, 0xe6, 0x25, 0x3f, 0xd1]),
  TOKEN_ANALYSIS: Buffer.from([0x05, 0xe2, 0x81, 0xc3, 0xb1, 0xf1, 0xcd, 0x3b]),
} as const;

// ── Instruction Account Lists ──
export const ONYX_INSTRUCTIONS = {
  INITIALIZE: { name: 'initialize', accounts: ['authority', 'config', 'systemProgram'] },
  INIT_TOKEN_ANALYSIS: { name: 'initTokenAnalysis', accounts: ['authority', 'config', 'analysis', 'mint', 'systemProgram'] },
  UPDATE_TOKEN_ANALYSIS: { name: 'updateTokenAnalysis', accounts: ['authority', 'config', 'analysis'] },
  CLOSE_TOKEN_ANALYSIS: { name: 'closeTokenAnalysis', accounts: ['authority', 'config', 'analysis'] },
} as const;