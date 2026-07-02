/**
 * @file onyxProgram.ts
 * @layer lib
 * @desc Anchor program service — transaction builder + account deserializer for onyx-protocol.
 *       No raw RPC calls; uses @solana/web3.js + manual borsh serialization (no Anchor TS deps).
 *       Matches exactly the Rust program layout.
 * @exposes OnyxProgramClient
 * @deps @solana/web3.js, buffer
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import {
  ONYX_PROGRAM_ID,
  ONYX_INSTRUCTIONS,
  getConfigPDA,
  getAnalysisPDA,
  IX_DISCRIMINATORS,
  ACCOUNT_DISCRIMINATORS,
  type OnyxConfigAccount,
  type TokenAnalysisAccount,
  type UpdateTokenAnalysisParams,
} from './idl/onyx_protocol';

// ── Borsh serialization helpers ──

function encodeU8(value: number): Buffer {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(value, 0);
  return buf;
}

function encodeI64(value: number | bigint): Buffer {
  const bigVal = typeof value === 'bigint' ? value : BigInt(value);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(bigVal, 0);
  return buf;
}

function encodeU64(value: number | bigint): Buffer {
  const bigVal = typeof value === 'bigint' ? value : BigInt(value);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(bigVal, 0);
  return buf;
}

function encodeBool(value: boolean): Buffer {
  return Buffer.from([value ? 1 : 0]);
}

/** Encode a Pubkey as 32 bytes */
function encodePubkey(pk: PublicKey): Buffer {
  return pk.toBuffer();
}

// ── Borsh decode helpers (LE) ──

function decodeU8(buf: Buffer, offset: number): { value: number; offset: number } {
  return { value: buf.readUInt8(offset), offset: offset + 1 };
}

function decodeBool(buf: Buffer, offset: number): { value: boolean; offset: number } {
  return { value: buf.readUInt8(offset) !== 0, offset: offset + 1 };
}

function decodeU64(buf: Buffer, offset: number): { value: number; offset: number } {
  // u64 fits in JS number for practical on-chain values (< 2^53)
  const val = Number(buf.readBigUInt64LE(offset));
  return { value: val, offset: offset + 8 };
}

function decodeI64(buf: Buffer, offset: number): { value: number; offset: number } {
  const val = Number(buf.readBigInt64LE(offset));
  return { value: val, offset: offset + 8 };
}

function decodePubkey(buf: Buffer, offset: number): { value: PublicKey; offset: number } {
  return { value: new PublicKey(buf.subarray(offset, offset + 32)), offset: offset + 32 };
}

/**
 * OnyxProgramClient — sole source of truth for on-chain reads + tx building.
 *
 * Usage:
 *   const onyx = new OnyxProgramClient(connection);
 *   const config = await onyx.getConfig();
 *   const tx = await onyx.buildInitTokenAnalysisTx(wallet, mintMint, wallet);
 */
export class OnyxProgramClient {
  private readonly connection: Connection;
  public readonly programId: PublicKey;

  constructor(connection: Connection, programId: PublicKey = ONYX_PROGRAM_ID) {
    this.connection = connection;
    this.programId = programId;
  }

  // ── Instruction Builders ──

  /**
   * Initialize the global OnyxConfig.
   * Rust: pub fn initialize(ctx, fee_wallet: Pubkey)
   *
   * @param authority - signer & payer
   * @param feeWallet - wallet that collects protocol fees
   */
  async buildInitializeTx(
    authority: PublicKey,
    feeWallet: PublicKey
  ): Promise<VersionedTransaction> {
    const { pda: configPda } = getConfigPDA(this.programId);

    // Data: [8-byte discriminator][32-byte fee_wallet]
    const data = Buffer.concat([
      IX_DISCRIMINATORS.initialize,
      encodePubkey(feeWallet),
    ]);

    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: PublicKey.default, isSigner: false, isWritable: false }, // systemProgram placeholder
      ],
      data,
    });

    return this._buildTx(authority, [ix]);
  }

  /**
   * Initialize a TokenAnalysis for a given mint.
   * Rust: pub fn handler(ctx, mint: Pubkey)
   *
   * @param authority - signer & payer
   * @param mint - token mint to analyze
   */
  async buildInitTokenAnalysisTx(
    authority: PublicKey,
    mint: PublicKey
  ): Promise<VersionedTransaction> {
    const { pda: configPda } = getConfigPDA(this.programId);
    const { pda: analysisPda } = getAnalysisPDA(mint, this.programId);

    // Data: [8-byte discriminator][32-byte mint]
    const data = Buffer.concat([
      IX_DISCRIMINATORS.initTokenAnalysis,
      encodePubkey(mint),
    ]);

    const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');
    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: analysisPda, isSigner: false, isWritable: true },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }, // systemProgram
      ],
      data,
    });

    return this._buildTx(authority, [ix]);
  }

  /**
   * Update an existing TokenAnalysis with full data payload.
   * Rust: pub fn handler(ctx, params: UpdateTokenAnalysisParams)
   *
   * @param authority - signer (must match analysis.authority)
   * @param mint - token mint
   * @param params - all update fields
   */
  async buildUpdateTokenAnalysisTx(
    authority: PublicKey,
    mint: PublicKey,
    params: UpdateTokenAnalysisParams
  ): Promise<VersionedTransaction> {
    const { pda: configPda } = getConfigPDA(this.programId);
    const { pda: analysisPda } = getAnalysisPDA(mint, this.programId);

    // Data: [8-byte discriminator][serialized UpdateTokenAnalysisParams (borsh)]
    const fields = Buffer.concat([
      // Whale Activity (3 u64)
      encodeU64(params.largeTransfers),
      encodeU64(params.whaleWallets),
      encodeU64(params.holderConcentration),
      // Holder Growth (1 u64 + 1 i64)
      encodeU64(params.newHolders),
      encodeI64(params.holderGrowthRate),
      // Developer Activity (3 u64)
      encodeU64(params.devTxCount),
      encodeU64(params.suspiciousTransfers),
      encodeU64(params.devWalletBalance),
      // Liquidity (3 u64 + 1 i64)
      encodeU64(params.liquidityDepth),
      encodeI64(params.liquidityChange24h),
      encodeU64(params.lockedLiquidity),
      encodeU64(params.liquidityConcentration),
      // RugPull Scores (4 u64)
      encodeU64(params.dumpScore),
      encodeU64(params.liquidityRemovalScore),
      encodeU64(params.devActivityScore),
      encodeU64(params.overallRugScore),
      // Risk Score (1 u64)
      encodeU64(params.riskScore),
      // Contract Info (4 bool + 1 i64)
      encodeBool(params.mintAuthority),
      encodeBool(params.freezeAuthority),
      encodeBool(params.isVerified),
      encodeBool(params.renounced),
      encodeI64(params.tokenAgeSeconds),
    ]);

    const data = Buffer.concat([IX_DISCRIMINATORS.updateTokenAnalysis, fields]);

    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: authority, isSigner: true, isWritable: false },
        { pubkey: configPda, isSigner: false, isWritable: false },
        { pubkey: analysisPda, isSigner: false, isWritable: true },
      ],
      data,
    });

    return this._buildTx(authority, [ix]);
  }

  /**
   * Close a TokenAnalysis account, reclaiming rent.
   * Rust: pub fn handler(ctx)
   */
  async buildCloseTokenAnalysisTx(
    authority: PublicKey,
    mint: PublicKey
  ): Promise<VersionedTransaction> {
    const { pda: configPda } = getConfigPDA(this.programId);
    const { pda: analysisPda } = getAnalysisPDA(mint, this.programId);

    // Data: just discriminator, no args
    const data = IX_DISCRIMINATORS.closeTokenAnalysis;

    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: false },
        { pubkey: analysisPda, isSigner: false, isWritable: true },
      ],
      data,
    });

    return this._buildTx(authority, [ix]);
  }

  // ── Account Deserializers ──

  /**
   * Fetch + deserialize OnyxConfig (singleton PDA).
   * Layout (borsh, after 8-byte discriminator):
   *   authority: Pubkey, fee_wallet: Pubkey, paused: bool, analysis_count: u64, bump: u8
   */
  async getConfig(): Promise<OnyxConfigAccount | null> {
    const { pda } = getConfigPDA(this.programId);
    const accountInfo = await this.connection.getAccountInfo(pda);
    if (!accountInfo?.data) return null;
    return this._deserializeConfig(accountInfo.data);
  }

  /**
   * Fetch + deserialize a single TokenAnalysis.
   * Layout (borsh, after 8-byte discriminator):
   *   mint: Pubkey, authority: Pubkey,
   *   large_transfers: u64, whale_wallets: u64, holder_concentration: u64,
   *   new_holders: u64, holder_growth_rate: i64,
   *   dev_tx_count: u64, suspicious_transfers: u64, dev_wallet_balance: u64,
   *   liquidity_depth: u64, liquidity_change_24h: i64, locked_liquidity: u64, liquidity_concentration: u64,
   *   dump_score: u64, liquidity_removal_score: u64, dev_activity_score: u64, overall_rug_score: u64,
   *   risk_score: u64,
   *   mint_authority: bool, freeze_authority: bool, is_verified: bool, renounced: bool, token_age_seconds: i64,
   *   analysis_timestamp: i64, bump: u8
   */
  async getTokenAnalysis(mint: PublicKey): Promise<TokenAnalysisAccount | null> {
    const { pda } = getAnalysisPDA(mint, this.programId);
    const accountInfo = await this.connection.getAccountInfo(pda);
    if (!accountInfo?.data) return null;
    return this._deserializeTokenAnalysis(accountInfo.data);
  }

  /** Batch fetch multiple TokenAnalysis accounts. */
  async getTokenAnalyses(mints: PublicKey[]): Promise<(TokenAnalysisAccount | null)[]> {
    const pdas = mints.map((m) => getAnalysisPDA(m, this.programId).pda);
    const accountInfos = await this.connection.getMultipleAccountsInfo(pdas);
    return accountInfos.map((info) => {
      if (!info?.data) return null;
      return this._deserializeTokenAnalysis(info.data);
    });
  }

  // ── Existence Checks ──

  async configExists(): Promise<boolean> {
    const { pda } = getConfigPDA(this.programId);
    const info = await this.connection.getAccountInfo(pda);
    return info !== null && info.data.length > 8;
  }

  async tokenAnalysisExists(mint: PublicKey): Promise<boolean> {
    const { pda } = getAnalysisPDA(mint, this.programId);
    const info = await this.connection.getAccountInfo(pda);
    return info !== null && info.data.length > 8;
  }

  // ── Private: Build TX ──

  private async _buildTx(
    feePayer: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<VersionedTransaction> {
    const { blockhash } = await this.connection.getLatestBlockhash();
    const message = new TransactionMessage({
      payerKey: feePayer,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();
    return new VersionedTransaction(message);
  }

  // ── Private: Deserializers ──

  private _deserializeConfig(data: Buffer): OnyxConfigAccount {
    let offset = 8; // skip Anchor discriminator

    const authority = decodePubkey(data, offset);
    offset = authority.offset;
    const feeWallet = decodePubkey(data, offset);
    offset = feeWallet.offset;
    const paused = decodeBool(data, offset);
    offset = paused.offset;
    // analysis_count is u64 in Rust
    const analysisCount = decodeU64(data, offset);
    offset = analysisCount.offset;
    const bump = decodeU8(data, offset);

    return {
      authority: authority.value,
      feeWallet: feeWallet.value,
      paused: paused.value,
      analysisCount: analysisCount.value,
      bump: bump.value,
    };
  }

  private _deserializeTokenAnalysis(data: Buffer): TokenAnalysisAccount {
    let offset = 8; // skip Anchor discriminator

    // ── Keys (2 Pubkey = 64 bytes) ──
    const mint = decodePubkey(data, offset);
    offset = mint.offset;
    const authority = decodePubkey(data, offset);
    offset = authority.offset;

    // ── Whale Activity (3 u64 = 24 bytes) ──
    const largeTransfers = decodeU64(data, offset);
    offset = largeTransfers.offset;
    const whaleWallets = decodeU64(data, offset);
    offset = whaleWallets.offset;
    const holderConcentration = decodeU64(data, offset);
    offset = holderConcentration.offset;

    // ── Holder Growth (1 u64 + 1 i64 = 16 bytes) ──
    const newHolders = decodeU64(data, offset);
    offset = newHolders.offset;
    const holderGrowthRate = decodeI64(data, offset);
    offset = holderGrowthRate.offset;

    // ── Developer Activity (3 u64 = 24 bytes) ──
    const devTxCount = decodeU64(data, offset);
    offset = devTxCount.offset;
    const suspiciousTransfers = decodeU64(data, offset);
    offset = suspiciousTransfers.offset;
    const devWalletBalance = decodeU64(data, offset);
    offset = devWalletBalance.offset;

    // ── Liquidity Analysis (3 u64 + 1 i64 = 32 bytes) ──
    const liquidityDepth = decodeU64(data, offset);
    offset = liquidityDepth.offset;
    const liquidityChange24h = decodeI64(data, offset);
    offset = liquidityChange24h.offset;
    const lockedLiquidity = decodeU64(data, offset);
    offset = lockedLiquidity.offset;
    const liquidityConcentration = decodeU64(data, offset);
    offset = liquidityConcentration.offset;

    // ── RugPull Indicators (4 u64 = 32 bytes) ──
    const dumpScore = decodeU64(data, offset);
    offset = dumpScore.offset;
    const liquidityRemovalScore = decodeU64(data, offset);
    offset = liquidityRemovalScore.offset;
    const devActivityScore = decodeU64(data, offset);
    offset = devActivityScore.offset;
    const overallRugScore = decodeU64(data, offset);
    offset = overallRugScore.offset;

    // ── Risk (1 u64 = 8 bytes) ──
    const riskScore = decodeU64(data, offset);
    offset = riskScore.offset;

    // ── Contract Analysis (4 bool + 1 i64 = 12 bytes) ──
    const mintAuthority = decodeBool(data, offset);
    offset = mintAuthority.offset;
    const freezeAuthority = decodeBool(data, offset);
    offset = freezeAuthority.offset;
    const isVerified = decodeBool(data, offset);
    offset = isVerified.offset;
    const renounced = decodeBool(data, offset);
    offset = renounced.offset;
    const tokenAgeSeconds = decodeI64(data, offset);
    offset = tokenAgeSeconds.offset;

    // ── Metadata (1 i64 + 1 u8 = 9 bytes) ──
    const analysisTimestamp = decodeI64(data, offset);
    offset = analysisTimestamp.offset;
    const bump = decodeU8(data, offset);

    return {
      mint: mint.value,
      authority: authority.value,

      // Whale Activity
      largeTransfers: largeTransfers.value,
      whaleWallets: whaleWallets.value,
      holderConcentration: holderConcentration.value,

      // Holder Growth
      newHolders: newHolders.value,
      holderGrowthRate: holderGrowthRate.value,

      // Developer Activity
      devTxCount: devTxCount.value,
      suspiciousTransfers: suspiciousTransfers.value,
      devWalletBalance: devWalletBalance.value,

      // Liquidity
      liquidityDepth: liquidityDepth.value,
      liquidityChange24h: liquidityChange24h.value,
      lockedLiquidity: lockedLiquidity.value,
      liquidityConcentration: liquidityConcentration.value,

      // RugPull Scores
      dumpScore: dumpScore.value,
      liquidityRemovalScore: liquidityRemovalScore.value,
      devActivityScore: devActivityScore.value,
      overallRugScore: overallRugScore.value,

      // Risk
      riskScore: riskScore.value,

      // Contract
      mintAuthority: mintAuthority.value,
      freezeAuthority: freezeAuthority.value,
      isVerified: isVerified.value,
      renounced: renounced.value,
      tokenAgeSeconds: tokenAgeSeconds.value,

      // Metadata
      analysisTimestamp: analysisTimestamp.value,
      bump: bump.value,
    };
  }
}