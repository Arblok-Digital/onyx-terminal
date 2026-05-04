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
    const { inputMint, outputMint, amount, slippageBps, allowPump } = req.query;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Fee 50bps jika input ATAU output adalah wSOL/USDC (Logika 2 arah)
    const isInputTarget = (inputMint === MINTS.WSOL || inputMint === MINTS.USDC);
    const isOutputTarget = (outputMint === MINTS.WSOL || outputMint === MINTS.USDC);
    const platformFeeBps = (isInputTarget || isOutputTarget) ? 50 : 0;

    const shouldBlockPump = allowPump !== 'true';
    console.log(`Quote Request: In=${inputMint}, Out=${outputMint}, AllowPump=${!shouldBlockPump}`);

    // 🔥 FIX: Handle Auto Slippage lebih robust (trim & lowercase)
    const isAuto = typeof slippageBps === 'string' && slippageBps.toLowerCase().trim() === 'auto';
    
    // 🔥 FIX: Pastikan slippageBps selalu integer jika manual
    let manualSlippageBps = 50; // fallback default
    if (!isAuto && slippageBps) {
      const parsed = parseInt(String(slippageBps), 10);
      if (!isNaN(parsed)) manualSlippageBps = parsed;
    }

    const response = await axios.get(`${JUP_BASE_URL}/quote`, {
      params: {
        inputMint,
        outputMint,
        amount,
        ...(isAuto 
          ? { autoSlippage: true, autoSlippageCollisionUsdValue: 1000 } 
          : { slippageBps: manualSlippageBps }),
        platformFeeBps,
        excludeDexes: "Pump.fun Amm" // 🚫 Blokir lebih ketat agar fee tetap aman
      },
      headers: {
        'x-api-key': JUP_API_KEY,
        'Accept': 'application/json'
      }
    });

    const quoteData = response.data;

    // 1. Pengecekan Error Jupiter (Case Insensitive)
    if (quoteData.error) {
      const errMessage = String(quoteData.error).toLowerCase();
      console.warn("[QUOTE_ERROR] Jupiter API:", quoteData.error);

      if (errMessage.includes("no routes found") || errMessage.includes("not found")) {
        return res.status(400).json({ 
          error: "Likuiditas belum stabil / Rute belum tersedia. Jika ini token mecin baru, harap tunggu 1-2 menit hingga likuiditas migrasi sepenuhnya ke pool publik yang lebih aman (Raydium/Orca)." 
        });
      }
      return res.status(400).json({ error: quoteData.error });
    }

    // 2. Periksa jika quoteData tidak memiliki routePlan atau routePlan-nya kosong
    // Ini mengindikasikan tidak ada rute yang ditemukan, tapi Jupiter tidak mengembalikan error eksplisit di properti 'error'.
    if (!quoteData.routePlan || quoteData.routePlan.length === 0) {
      console.warn("[QUOTE_EMPTY] Jupiter API returned no routePlan for the given pair.");
      return res.status(400).json({ error: "Saat ini belum ada rute swap yang tersedia untuk pasangan token ini. Coba cek lagi nanti atau tunggu token masuk ke pool likuiditas yang lebih stabil (misal: Raydium, Orca, atau Meteora V2 setelah migrasi)." });
    }

    // 3. Double Check untuk Pump.fun (tetap jalankan setelah semua rute ditemukan)
    const hasPump = quoteData.routePlan.some(step =>
      step.swapInfo?.label?.toLowerCase().includes("pump")
    );
    if (shouldBlockPump && hasPump) {
      console.warn("[BLOCK] Pump.fun detected in route plan despite exclusion.");
      return res.status(400).json({ error: "Rute terdeteksi via pool berisiko tinggi (Pump.fun). Ini terlalu beresiko, harap tunggu hingga token masuk ke pool yang aman (Raydium/Orca)." });
    }

    res.json(quoteData);
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

    const { inputMint, outputMint } = quoteResponse;
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