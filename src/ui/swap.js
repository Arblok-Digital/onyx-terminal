import axios from 'axios';

const JUP_API_KEY = process.env.JUPITER_API_KEY || "";
const JUP_BASE_URL = "https://api.jup.ag/swap/v1";
const MINTS = {
  WSOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
};
const FEE_ACCOUNTS = {
  WSOL: process.env.VITE_JUPITER_FEE_ACCOUNT_WSOL || "7S7KfighhMhasJrVbkk8R3hKjtM73JuVLe92oXGCyNnT",
  USDC: process.env.VITE_JUPITER_FEE_ACCOUNT_USDC || "EHJqU8SEg12muMp1pb6KH4ghn4UB6rA51KYARetKdAgr"
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
    const swapParams = {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto"
    };

    if (outputMint === MINTS.WSOL || inputMint === MINTS.WSOL) {
      swapParams.feeAccount = FEE_ACCOUNTS.WSOL;
    } else if (outputMint === MINTS.USDC || inputMint === MINTS.USDC) {
      swapParams.feeAccount = FEE_ACCOUNTS.USDC;
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