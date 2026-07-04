import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const JUP_API_KEY = process.env.JUPITER_API_KEY || "";
const JUP_BASE_URL = "https://api.jup.ag/swap/v1";
const MINTS = {
  WSOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
};
const FEE_ACCOUNTS = {
  WSOL: process.env.VITE_JUPITER_FEE_ACCOUNT_WSOL || "",
  USDC: process.env.VITE_JUPITER_FEE_ACCOUNT_USDC || ""
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { quoteResponse, userPublicKey, wrapAndUnwrapSol = true } = req.body;
    if (!quoteResponse || !userPublicKey) {
      return res.status(400).json({ error: "Missing swap parameters" });
    }

    const { inputMint, outputMint } = quoteResponse;

    // 🔥 SINKRONISASI: Generate user destination ATA agar Jupiter handle pembuatan akun di Vercel
    const userDestinationATA = await getAssociatedTokenAddress(
      new PublicKey(outputMint),
      new PublicKey(userPublicKey)
    );

    const swapParams = {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol,
      dynamicComputeUnitLimit: true,
      // BATAS PRIORITAS: Menggunakan angka tetap (0.002 SOL) untuk menghindari biaya "auto" yang tidak terkendali.
      prioritizationFeeLamports: 2000000,
      destinationTokenAccount: userDestinationATA.toBase58()
    };

    // 🔥 SINKRONISASI LOGIKA FEE: Suntik feeAccount secara dinamis
    if (outputMint === MINTS.WSOL) {
      swapParams.feeAccount = FEE_ACCOUNTS.WSOL;
      console.log(`[FEE] Injecting wSOL ATA (output): ${FEE_ACCOUNTS.WSOL}`);
    } else if (outputMint === MINTS.USDC) {
      swapParams.feeAccount = FEE_ACCOUNTS.USDC;
      console.log(`[FEE] Injecting USDC ATA (output): ${FEE_ACCOUNTS.USDC}`);
    } else if (inputMint === MINTS.WSOL) {
      swapParams.feeAccount = FEE_ACCOUNTS.WSOL;
      console.log(`[FEE] Injecting wSOL ATA (input): ${FEE_ACCOUNTS.WSOL}`);
    } else if (inputMint === MINTS.USDC) {
      swapParams.feeAccount = FEE_ACCOUNTS.USDC;
      console.log(`[FEE] Injecting USDC ATA (input): ${FEE_ACCOUNTS.USDC}`);
    } else {
      console.log('[FEE] No target token found in pair. Skipping fee.');
    }

    const response = await axios.post(`${JUP_BASE_URL}/swap`, swapParams, {
      headers: {
        'x-api-key': JUP_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: "Swap API Error" });
  }
}