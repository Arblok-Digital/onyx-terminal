#!/usr/bin/env node
/**
 * @file test-onyx-program.cjs
 * @desc On-chain test script for onyx-protocol on devnet.
 *       Uses OnyxProgramClient (ported inline) to build + sign txs via local keypair.
 *
 * Usage: node scripts/test-onyx-program.cjs
 *
 * Steps:
 *   P0.2.2 - Initialize config on devnet              ✓
 *   P0.3.1 - Test init_token_analysis                  ✓
 *   P0.3.2 - Test update_token_analysis                ✓
 *   P0.3.3 - Test close_token_analysis                 ✓
 */

const {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  Keypair,
} = require('@solana/web3.js');
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Config ──
const CLUSTER = 'devnet';
const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG');
const ONYX_CONFIG_SEED = Buffer.from('onyx_config');
const TOKEN_ANALYSIS_SEED = Buffer.from('token_analysis');
const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

// Test token mint (USDC devnet)
const TEST_MINT = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNiXmFkHt3WJ7jY7rVs');

// ── CLI Helpers ──
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;

function log(msg) { console.log(`${CYAN}[onyx-test]${RESET} ${msg}`); }
function ok(msg) { console.log(`  ${GREEN}✓${RESET} ${msg}`); passCount++; }
function fail(msg, err) { console.log(`  ${RED}✗${RESET} ${msg} — ${err?.message || err}`); failCount++; }
function header(msg) { console.log(`\n${YELLOW}═══ ${msg} ═══${RESET}`); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Load Keypair ──
function loadKeypair() {
  const keypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  if (!fs.existsSync(keypairPath)) {
    throw new Error(`Keypair not found at ${keypairPath}`);
  }
  const secret = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  return Keypair.fromSecretKey(Buffer.from(secret));
}

// ── Borsh helpers ──
function encodeU8(value) { const b = Buffer.alloc(1); b.writeUInt8(value, 0); return b; }
function encodeI64(value) {
  const bigVal = typeof value === 'bigint' ? value : BigInt(value);
  const b = Buffer.alloc(8); b.writeBigInt64LE(bigVal, 0); return b;
}
function encodeU64(value) {
  const bigVal = typeof value === 'bigint' ? value : BigInt(value);
  const b = Buffer.alloc(8); b.writeBigUInt64LE(bigVal, 0); return b;
}
function encodeBool(value) { return Buffer.from([value ? 1 : 0]); }
function encodePubkey(pk) { return pk.toBuffer(); }

// ── PDA ──
function getConfigPDA() {
  const [pda, bump] = PublicKey.findProgramAddressSync([ONYX_CONFIG_SEED], PROGRAM_ID);
  return { pda, bump };
}

function getAnalysisPDA(mint) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [TOKEN_ANALYSIS_SEED, mint.toBuffer()],
    PROGRAM_ID
  );
  return { pda, bump };
}

// ── Deserializers ──
function decodeU8(buf, offset) { return { value: buf.readUInt8(offset), offset: offset + 1 }; }
function decodeBool(buf, offset) { return { value: buf.readUInt8(offset) !== 0, offset: offset + 1 }; }
function decodeU64(buf, offset) {
  return { value: Number(buf.readBigUInt64LE(offset)), offset: offset + 8 };
}
function decodeI64(buf, offset) {
  return { value: Number(buf.readBigInt64LE(offset)), offset: offset + 8 };
}
function decodePubkey(buf, offset) {
  return { value: new PublicKey(buf.subarray(offset, offset + 32)), offset: offset + 32 };
}

function deserializeConfig(data) {
  let offset = 8;
  const authority = decodePubkey(data, offset); offset = authority.offset;
  const feeWallet = decodePubkey(data, offset); offset = feeWallet.offset;
  const paused = decodeBool(data, offset); offset = paused.offset;
  const analysisCount = decodeU64(data, offset); offset = analysisCount.offset;
  const bump = decodeU8(data, offset);
  return { authority: authority.value, feeWallet: feeWallet.value, paused: paused.value, analysisCount: analysisCount.value, bump: bump.value };
}

function deserializeTokenAnalysis(data) {
  let offset = 8;
  const mint = decodePubkey(data, offset); offset = mint.offset;
  const authority = decodePubkey(data, offset); offset = authority.offset;
  const largeTransfers = decodeU64(data, offset); offset = largeTransfers.offset;
  const whaleWallets = decodeU64(data, offset); offset = whaleWallets.offset;
  const holderConcentration = decodeU64(data, offset); offset = holderConcentration.offset;
  const newHolders = decodeU64(data, offset); offset = newHolders.offset;
  const holderGrowthRate = decodeI64(data, offset); offset = holderGrowthRate.offset;
  const devTxCount = decodeU64(data, offset); offset = devTxCount.offset;
  const suspiciousTransfers = decodeU64(data, offset); offset = suspiciousTransfers.offset;
  const devWalletBalance = decodeU64(data, offset); offset = devWalletBalance.offset;
  const liquidityDepth = decodeU64(data, offset); offset = liquidityDepth.offset;
  const liquidityChange24h = decodeI64(data, offset); offset = liquidityChange24h.offset;
  const lockedLiquidity = decodeU64(data, offset); offset = lockedLiquidity.offset;
  const liquidityConcentration = decodeU64(data, offset); offset = liquidityConcentration.offset;
  const dumpScore = decodeU64(data, offset); offset = dumpScore.offset;
  const liquidityRemovalScore = decodeU64(data, offset); offset = liquidityRemovalScore.offset;
  const devActivityScore = decodeU64(data, offset); offset = devActivityScore.offset;
  const overallRugScore = decodeU64(data, offset); offset = overallRugScore.offset;
  const riskScore = decodeU64(data, offset); offset = riskScore.offset;
  const mintAuthority = decodeBool(data, offset); offset = mintAuthority.offset;
  const freezeAuthority = decodeBool(data, offset); offset = freezeAuthority.offset;
  const isVerified = decodeBool(data, offset); offset = isVerified.offset;
  const renounced = decodeBool(data, offset); offset = renounced.offset;
  const tokenAgeSeconds = decodeI64(data, offset); offset = tokenAgeSeconds.offset;
  const analysisTimestamp = decodeI64(data, offset); offset = analysisTimestamp.offset;
  const bump = decodeU8(data, offset);
  return {
    mint: mint.value, authority: authority.value,
    largeTransfers: largeTransfers.value, whaleWallets: whaleWallets.value, holderConcentration: holderConcentration.value,
    newHolders: newHolders.value, holderGrowthRate: holderGrowthRate.value,
    devTxCount: devTxCount.value, suspiciousTransfers: suspiciousTransfers.value, devWalletBalance: devWalletBalance.value,
    liquidityDepth: liquidityDepth.value, liquidityChange24h: liquidityChange24h.value, lockedLiquidity: lockedLiquidity.value, liquidityConcentration: liquidityConcentration.value,
    dumpScore: dumpScore.value, liquidityRemovalScore: liquidityRemovalScore.value, devActivityScore: devActivityScore.value, overallRugScore: overallRugScore.value,
    riskScore: riskScore.value,
    mintAuthority: mintAuthority.value, freezeAuthority: freezeAuthority.value, isVerified: isVerified.value, renounced: renounced.value, tokenAgeSeconds: tokenAgeSeconds.value,
    analysisTimestamp: analysisTimestamp.value, bump: bump.value
  };
}

// ── Discriminators (Anchor 0.30 sighash) ──
const IX_DISCRIMINATORS = {
  initialize: Buffer.from([0xaf, 0xaf, 0x6d, 0x1f, 0x0d, 0x98, 0x9b, 0xed]),
  initTokenAnalysis: Buffer.from([0x68, 0xe1, 0xe5, 0xab, 0x53, 0x47, 0x1d, 0xbb]),
  updateTokenAnalysis: Buffer.from([0x0b, 0xf6, 0x80, 0xc6, 0xf3, 0xcb, 0x11, 0xcd]),
  closeTokenAnalysis: Buffer.from([0xba, 0xd3, 0xda, 0x4d, 0x29, 0xa6, 0xa2, 0x48]),
};

// ── RPC Helper ──
async function sendAndConfirm(connection, tx, signer) {
  tx.sign([signer]);
  const raw = tx.serialize();
  const sig = await connection.sendRawTransaction(raw, { skipPreflight: false });
  const result = await connection.confirmTransaction(sig, 'confirmed');
  if (result.value.err) throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
  return sig;
}

// ══════════════════════════════════════
//  Main
// ══════════════════════════════════════
async function main() {
  console.log(`\n${CYAN}╔══════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║   Onyx Protocol — On-Chain Test Suite       ║${RESET}`);
  console.log(`${CYAN}║   Cluster: ${RESET}devnet         ${CYAN}              ║${RESET}`);
  console.log(`${CYAN}╚══════════════════════════════════════════════╝${RESET}\n`);

  const keypair = loadKeypair();
  const connection = new Connection(RPC_URL, 'confirmed');
  log(`Wallet: ${keypair.publicKey.toBase58()}`);

  // Check balance
  const balance = await connection.getBalance(keypair.publicKey);
  log(`Balance: ${balance / 1e9} SOL`);
  if (balance < 0.05e9) {
    fail('Insufficient SOL balance (< 0.05 SOL)');
    process.exit(1);
  }

  const { pda: configPda } = getConfigPDA();
  log(`Config PDA: ${configPda.toBase58()}`);

  // ── P0.2.2: Initialize config ──
  header('P0.2.2 — Initialize Config on Devnet');
  let configExists = false;
  try {
    const acc = await connection.getAccountInfo(configPda);
    configExists = acc !== null && acc.data.length > 8;
    if (configExists) {
      const config = deserializeConfig(acc.data);
      ok(`Config already initialized. authority=${config.authority.toBase58()}, feeWallet=${config.feeWallet.toBase58()}`);
    } else {
      log('Config not found. Initializing...');
      const data = Buffer.concat([IX_DISCRIMINATORS.initialize, encodePubkey(keypair.publicKey)]);
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: configPda, isSigner: false, isWritable: true },
          { pubkey: PublicKey.default, isSigner: false, isWritable: false },
        ],
        data,
      });
      const { blockhash } = await connection.getLatestBlockhash();
      const msg = new TransactionMessage({ payerKey: keypair.publicKey, recentBlockhash: blockhash, instructions: [ix] }).compileToV0Message();
      const tx = new VersionedTransaction(msg);
      const sig = await sendAndConfirm(connection, tx, keypair);
      ok(`Initialize tx confirmed: ${sig}`);

      // Verify
      const acc2 = await connection.getAccountInfo(configPda);
      if (acc2 && acc2.data.length > 8) {
        const config = deserializeConfig(acc2.data);
        ok(`Config verified: authority=${config.authority.toBase58()}, paused=${config.paused}, analysisCount=${config.analysisCount}`);
      } else {
        fail('Config account not found after initialization');
      }
    }
  } catch (e) {
    fail('Initialize config', e);
  }

  // ── P0.3.1: Test init_token_analysis ──
  header('P0.3.1 — Test init_token_analysis');
  try {
    const { pda: analysisPda } = getAnalysisPDA(TEST_MINT);
    log(`Analysis PDA: ${analysisPda.toBase58()}`);

    // Check if already exists
    const existing = await connection.getAccountInfo(analysisPda);
    if (existing && existing.data.length > 8) {
      ok(`TokenAnalysis already exists for mint ${TEST_MINT.toBase58().slice(0, 8)}...`);
    } else {
      const { pda: configPda2 } = getConfigPDA();
      const data = Buffer.concat([IX_DISCRIMINATORS.initTokenAnalysis, encodePubkey(TEST_MINT)]);
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: configPda2, isSigner: false, isWritable: true },
          { pubkey: analysisPda, isSigner: false, isWritable: true },
          { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data,
      });
      const { blockhash } = await connection.getLatestBlockhash();
      const msg = new TransactionMessage({ payerKey: keypair.publicKey, recentBlockhash: blockhash, instructions: [ix] }).compileToV0Message();
      const tx = new VersionedTransaction(msg);
      const sig = await sendAndConfirm(connection, tx, keypair);
      ok(`init_token_analysis tx confirmed: ${sig}`);
    }

    // Read and verify
    const acc = await connection.getAccountInfo(getAnalysisPDA(TEST_MINT).pda);
    if (acc && acc.data.length > 8) {
      const analysis = deserializeTokenAnalysis(acc.data);
      ok(`TokenAnalysis exists: mint=${analysis.mint.toBase58().slice(0, 8)}..., authority=${analysis.authority.toBase58().slice(0, 8)}...`);
    } else {
      fail('TokenAnalysis account not found after init');
    }
  } catch (e) {
    fail('init_token_analysis', e);
  }

  // ── P0.3.2: Test update_token_analysis ──
  header('P0.3.2 — Test update_token_analysis');
  try {
    const { pda: configPda3 } = getConfigPDA();
    const { pda: analysisPda3 } = getAnalysisPDA(TEST_MINT);

    const fields = Buffer.concat([
      encodeU64(15),    // largeTransfers
      encodeU64(3),     // whaleWallets
      encodeU64(4500),  // holderConcentration (45%)
      encodeU64(120),   // newHolders
      encodeI64(250),   // holderGrowthRate (2.5%)
      encodeU64(8),     // devTxCount
      encodeU64(0),     // suspiciousTransfers
      encodeU64(5000000000n), // devWalletBalance
      encodeU64(10000000n), // liquidityDepth ($100k)
      encodeI64(-50),   // liquidityChange24h (-0.5%)
      encodeU64(8000000n), // lockedLiquidity ($80k)
      encodeU64(3000),  // liquidityConcentration (30%)
      encodeU64(2000),  // dumpScore
      encodeU64(1500),  // liquidityRemovalScore
      encodeU64(800),   // devActivityScore
      encodeU64(1800),  // overallRugScore
      encodeU64(2500),  // riskScore
      encodeBool(false), // mintAuthority
      encodeBool(false), // freezeAuthority
      encodeBool(true),  // isVerified
      encodeBool(true),  // renounced
      encodeI64(86400 * 30), // tokenAgeSeconds (30 days)
    ]);

    const data = Buffer.concat([IX_DISCRIMINATORS.updateTokenAnalysis, fields]);
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: keypair.publicKey, isSigner: true, isWritable: false },
        { pubkey: configPda3, isSigner: false, isWritable: false },
        { pubkey: analysisPda3, isSigner: false, isWritable: true },
      ],
      data,
    });

    const { blockhash } = await connection.getLatestBlockhash();
    const msg = new TransactionMessage({ payerKey: keypair.publicKey, recentBlockhash: blockhash, instructions: [ix] }).compileToV0Message();
    const tx = new VersionedTransaction(msg);
    const sig = await sendAndConfirm(connection, tx, keypair);
    ok(`update_token_analysis tx confirmed: ${sig}`);

    // Read and verify
    const updatedAcc = await connection.getAccountInfo(analysisPda3);
    if (updatedAcc && updatedAcc.data.length > 8) {
      const analysis = deserializeTokenAnalysis(updatedAcc.data);
      const checks = [
        ['largeTransfers', analysis.largeTransfers, 15],
        ['overallRugScore', analysis.overallRugScore, 1800],
        ['riskScore', analysis.riskScore, 2500],
        ['isVerified', analysis.isVerified, true],
        ['renounced', analysis.renounced, true],
      ];
      let allOk = true;
      for (const [field, actual, expected] of checks) {
        if (actual !== expected) {
          fail(`${field}: expected ${expected}, got ${actual}`);
          allOk = false;
        }
      }
      if (allOk) ok('All update fields verified on-chain');
    } else {
      fail('Could not read updated account');
    }
  } catch (e) {
    fail('update_token_analysis', e);
  }

  // ── P0.3.3: Test close_token_analysis ──
  header('P0.3.3 — Test close_token_analysis');
  try {
    const { pda: configPda4 } = getConfigPDA();
    const { pda: analysisPda4 } = getAnalysisPDA(TEST_MINT);

    // Verify exists first
    const beforeClose = await connection.getAccountInfo(analysisPda4);
    if (!beforeClose) {
      fail('TokenAnalysis not found before close — was it already deleted?');
    } else {
      const data = IX_DISCRIMINATORS.closeTokenAnalysis;
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: configPda4, isSigner: false, isWritable: false },
          { pubkey: analysisPda4, isSigner: false, isWritable: true },
        ],
        data,
      });

      const { blockhash } = await connection.getLatestBlockhash();
      const msg = new TransactionMessage({ payerKey: keypair.publicKey, recentBlockhash: blockhash, instructions: [ix] }).compileToV0Message();
      const tx = new VersionedTransaction(msg);
      const sig = await sendAndConfirm(connection, tx, keypair);
      ok(`close_token_analysis tx confirmed: ${sig}`);

      // Verify closed
      await sleep(2000);
      const afterClose = await connection.getAccountInfo(analysisPda4);
      if (afterClose === null) {
        ok('TokenAnalysis account successfully closed (rent reclaimed)');
      } else {
        fail('TokenAnalysis account still exists after close');
      }
    }
  } catch (e) {
    fail('close_token_analysis', e);
  }

  // ── Summary ──
  console.log(`\n${CYAN}══════════════════════════════════════════════${RESET}`);
  console.log(`${CYAN}  Results: ${passCount} passed, ${failCount} failed${RESET}`);
  console.log(`${CYAN}══════════════════════════════════════════════${RESET}\n`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(`${RED}Fatal:${RESET}`, e);
  process.exit(1);
});