import axios from 'axios';

const JUP_API_KEY = process.env.JUPITER_API_KEY || "";
const JUP_BASE_URL = "https://api.jup.ag/swap/v1";
const MINTS = {
  WSOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
};

/**
 * Allowed origins untuk CORS.
 * Request dari origin lain akan ditolak.
 */
const ALLOWED_ORIGINS = [
  'https://onyx-terminal.vercel.app',
  'http://localhost:5173',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3001',
];

/** Set CORS headers based on request origin */
function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // NOTE: origin tidak di whitelist → header CORS gak dikirim
  // Browser akan nolak request secara otomatis
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Accept');
}

export default async function handler(req, res) {
  // CORS Headers — restricted, not wildcard
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { inputMint, outputMint, amount, slippageBps, isSafeLocked } = req.query;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Fee 50bps jika melibatkan SOL/USDC
    const isInputTarget = (inputMint === MINTS.WSOL || inputMint === MINTS.USDC);
    const isOutputTarget = (outputMint === MINTS.WSOL || outputMint === MINTS.USDC);
    const platformFeeBps = (isInputTarget || isOutputTarget) ? 50 : 0;

    const isAuto = typeof slippageBps === 'string' && slippageBps.toLowerCase().trim() === 'auto';
    let manualSlippageBps = 50;
    if (!isAuto && slippageBps) {
      const parsed = parseInt(String(slippageBps), 10);
      if (!isNaN(parsed)) manualSlippageBps = parsed;
    }

    const commonParams = {
      inputMint,
      outputMint,
      amount,
      ...(isAuto
        ? { autoSlippage: true, autoSlippageCollisionUsdValue: 1000 }
        : { slippageBps: manualSlippageBps }),
      platformFeeBps,
      maxAccounts: 64
    };

    console.log("[API-QUOTE] Requesting best inclusive route...");
    const response = await axios.get(`${JUP_BASE_URL}/quote`, {
      params: commonParams,
      headers: {
        'x-api-key': JUP_API_KEY,
        'Accept': 'application/json'
      }
    });

    const quoteData = response.data;

    if (quoteData.error) {
      return res.status(400).json({ error: quoteData.error });
    }

    if (!quoteData.routePlan || quoteData.routePlan.length === 0) {
      return res.status(400).json({ error: "Rute tidak ditemukan. Coba naikkan slippage atau tunggu likuiditas muncul." });
    }

    return res.status(200).json(quoteData);
  } catch (error) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: "Quote API Error" });
  }
}