import axios from 'axios';

const JUP_API_KEY = process.env.JUPITER_API_KEY || "";
const JUP_BASE_URL = "https://api.jup.ag/swap/v1";
const MINTS = {
  WSOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
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
      maxAccounts: 64, // Tambahkan ini agar rute tidak terlalu kompleks
      restrictIntermediateTokens: false, // Buka akses ke token mecin baru
      filterSecurityTokens: false // Jangan batasi koin high-risk
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