/**
 * @file chat.js
 * @desc Vercel serverless endpoint — proxies AI chat to NVIDIA NIM.
 *       Works on Vercel (no CORS issues for server-to-server calls).
 * @endpoint POST /api/ai/chat
 */
export default async function handler(req, res) {
  // CORS — restrict to known origins
  const origin = req.headers.origin;
  const ALLOWED_ORIGINS = [
    'https://onyx-terminal.vercel.app',
    'http://localhost:5173',
    'http://localhost:3001',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3001',
  ];
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const nvidiaKey = process.env.VITE_NVIDIA_API_KEY || process.env.NVIDIA_API_KEY;
  if (!nvidiaKey) {
    return res.status(400).json({ error: "NVIDIA_API_KEY not configured" });
  }

  try {
    const response = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${nvidiaKey}`,
        },
        body: JSON.stringify(req.body),
      }
    );
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
