#!/usr/bin/env node

const { Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction, Keypair } = require('@solana/web3.js');
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROGRAM_ID = new PublicKey('FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG');
const ONYX_CONFIG_SEED = Buffer.from('onyx_config');
const TOKEN_ANALYSIS_SEED = Buffer.from('token_analysis');
const TEST_MINT = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNiXmFkHt3WJ7jY7rVs');
const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

function loadKeypair() {
  const keypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  const secret = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  return Keypair.fromSecretKey(Buffer.from(secret));
}

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

const IX_DISCRIMINATORS = {
  initTokenAnalysis: Buffer.from([0x68, 0xe1, 0xe5, 0xab, 0x53, 0x47, 0x1d, 0xbb]),
};

async function main() {
  const keypair = loadKeypair();
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const { pda: configPda } = getConfigPDA();
  const { pda: analysisPda } = getAnalysisPDA(TEST_MINT);

  console.log('=== DEBUG init_token_analysis ===');
  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('Authority:', keypair.publicKey.toBase58());
  console.log('Config PDA:', configPda.toBase58());
  console.log('Analysis PDA:', analysisPda.toBase58());
  console.log('Mint (instruction param):', TEST_MINT.toBase58());
  console.log('System Program ID:', SYSTEM_PROGRAM_ID.toBase58());

  // Instruction data: discriminator + mint pubkey
  const data = Buffer.concat([IX_DISCRIMINATORS.initTokenAnalysis, TEST_MINT.toBuffer()]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: analysisPda, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  console.log('\n=== Accounts in instruction ===');
  ix.keys.forEach((k, i) => {
    console.log(`[${i}] ${k.pubkey.toBase58()} signer=${k.isSigner} writable=${k.isWritable}`);
  });

  console.log('\n=== Simulate ===');
  const { blockhash } = await connection.getLatestBlockhash();
  const msg = new TransactionMessage({ payerKey: keypair.publicKey, recentBlockhash: blockhash, instructions: [ix] }).compileToV0Message();
  const tx = new VersionedTransaction(msg);
  tx.sign([keypair]);

  try {
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
    console.log('Simulation sent, sig:', sig);
    const result = await connection.confirmTransaction(sig, 'confirmed');
    console.log('Result:', result.value);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.logs) {
      console.error('Logs:', err.logs);
    }
  }
}

main().catch(console.error);