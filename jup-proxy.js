import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

// Simpan di environment variable (.env)
const JUP_API_KEY = process.env.JUPITER_API_KEY || "";
const JUP_BASE_URL = "https://api.jup.ag/swap/v1";

// Konfigurasi Token dan ATA untuk Fee
const MINTS = {
  WSOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
};

const FEE_ACCOUNTS = {
  WSOL: process.env.VITE_JUPITER_FEE_ACCOUNT_WSOL || "7S7KfighhMhasJrVbkk8R3hKjtM73JuVLe92oXGCyNnT",
  USDC: process.env.VITE_JUPITER_FEE_ACCOUNT_USDC || "EHJqU8SEg12muMp1pb6KH4ghn4UB6rA51KYARetKdAgr"
};

/**
 * Health Check — Verifikasi koneksi backend & proxy
 */
app.get('/api/jup/test', (req, res) => {
  res.json({
    status: "ok",
    message: "Onyx Proxy is Running",
    usingKey: JUP_API_KEY !== "YOUR_REAL_API_KEY_HERE",
    port: 3001
  });
});

/**
 * Proxy untuk Jupiter Quote API
 */
app.get('/api/jup/quote', async (req, res) => {
  try {
    const { inputMint, outputMint, amount, slippageBps } = req.query;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // 🔥 FIX: Fee 50bps jika input ATAU output adalah wSOL/USDC
    const isInputTarget = (req.query.inputMint === MINTS.WSOL || req.query.inputMint === MINTS.USDC);
    const isOutputTarget = (outputMint === MINTS.WSOL || outputMint === MINTS.USDC);
    const platformFeeBps = (isInputTarget || isOutputTarget) ? 50 : 0;

    console.log(`Quote Request: In=${req.query.inputMint}, Out=${outputMint}, Fee=${platformFeeBps}bps`);

    const response = await axios.get(`${JUP_BASE_URL}/quote`, {
      params: {
        inputMint,
        outputMint,
        amount,
        slippageBps: slippageBps || 50,
        platformFeeBps
      },
      headers: {
        'x-api-key': JUP_API_KEY,
        'Accept': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    console.error(`Quote Proxy Error [${status}]:`, error.response?.data || error.message);
    res.status(status).json(error.response?.data || { error: "Quote Proxy Error" });
  }
});

/**
 * Proxy untuk Jupiter Swap API
 */
app.post('/api/jup/swap', async (req, res) => {
  try {
    const { quoteResponse, userPublicKey, wrapAndUnwrapSol = true } = req.body;

    if (!quoteResponse || !userPublicKey) {
      return res.status(400).json({ error: "Missing swap parameters" });
    }

    const outputMint = quoteResponse.outputMint;
    const inputMint = quoteResponse.inputMint; // 🔥 Ambil inputMint untuk logic tambahan

    const swapParams = {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto"
    };

    // 🔥 FIX: Suntik feeAccount secara dinamis (prioritas output, lalu input)
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

    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    console.error(`Swap Proxy Error [${status}]:`, error.response?.data || error.message);
    res.status(status).json(error.response?.data || { error: "Failed to build swap transaction" });
  }
});

app.listen(3001, () => {
  console.log('Onyx Jup Proxy running on port 3001');
  console.log(`Jupiter API Key: ${JUP_API_KEY ? "DETECTED ✅" : "NOT DETECTED (Using Free Tier) ⚠️"}`);
});