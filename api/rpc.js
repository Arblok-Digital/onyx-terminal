/**
 * @file rpc.js
 * @desc Vercel serverless endpoint — proxies Solana RPC calls server-side
 *       so Helius API key is never exposed to the browser.
 * @endpoint POST /api/rpc
 */
export default async function handler(req, res) {
  // CORS — restricted, no wildcard
  const origin = req.headers.origin;
  const ALLOWED_ORIGINS = [
    'https://onyx-terminal.vercel.app',
    'http://localhost:5173',
    'http://localhost:3001',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3001',
  ];
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const heliusKey = process.env.HELIUS_API_KEY || process.env.VITE_HELIUS_API_KEY;
    const rpcUrl = heliusKey
      ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
      : 'https://api.mainnet-beta.solana.com';

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
