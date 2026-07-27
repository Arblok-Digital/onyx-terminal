/**
 * @file birdeye.js
 * @desc Vercel serverless endpoint — proxies Birdeye API calls server-side
 *       so the API key is never exposed to the browser.
 * @endpoint GET /api/proxy/birdeye?path=...
 */
export default async function handler(req, res) {
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const birdeyeKey = process.env.BIRDEYE_API_KEY || process.env.VITE_BIRDEYE_API_KEY;
    if (!birdeyeKey) {
      return res.status(400).json({ error: 'BIRDEYE_API_KEY not configured on server' });
    }

    const path = req.query.path || '';
    const baseUrl = 'https://public-api.birdeye.so';
    const url = `${baseUrl}${path.startsWith('/') ? path : '/' + path}` + (req.query.q ? `?q=${req.query.q}` : '');

    const response = await fetch(url, {
      headers: {
        'x-api-key': birdeyeKey,
        'Accept': 'application/json',
      },
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
