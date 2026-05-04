import axios from 'axios';

const JUP_API_KEY = process.env.JUPITER_API_KEY || "";
const JUP_BASE_URL = "https://api.jup.ag/swap/v1";
const MINTS = {
  WSOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { inputMint, outputMint, amount, slippageBps, allowPump } = req.query;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const isInputTarget = (inputMint === MINTS.WSOL || inputMint === MINTS.USDC);
    const isOutputTarget = (outputMint === MINTS.WSOL || outputMint === MINTS.USDC);
    const platformFeeBps = (isInputTarget || isOutputTarget) ? 50 : 0;
    const shouldBlockPump = allowPump !== 'true';

    const isAuto = typeof slippageBps === 'string' && slippageBps.toLowerCase().trim() === 'auto';
    let manualSlippageBps = 50;
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
        excludeDexes: "Pump.fun Amm"
      },
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
      return res.status(400).json({ error: "No route found" });
    }

    const hasPump = quoteData.routePlan.some(step =>
      step.swapInfo?.label?.toLowerCase().includes("pump")
    );

    if (shouldBlockPump && hasPump) {
      return res.status(400).json({ error: "Rute Pump.fun diblokir. Harap tunggu migrasi Raydium." });
    }

    return res.status(200).json(quoteData);
  } catch (error) {
    const status = error.response?.status || 500;
    return res.status(status).json(error.response?.data || { error: "Quote API Error" });
  }
}