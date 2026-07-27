/**
 * @file agent.js
 * @desc Vercel serverless endpoint — unified AI proxy for intelligent_integration agents.
 *       Supports NVIDIA NIM (primary), OpenRouter (fallback), and 9Router Gateway.
 *       All API keys stay server-side.
 * @endpoint POST /api/ai/agent
 *
 * Request body:
 *   { provider: "nvidia"|"openrouter"|"9router", model, messages, ... }
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { provider, ...body } = req.body;

    let endpoint, apiKey;
    switch (provider || 'nvidia') {
      case 'nvidia':
        endpoint = process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY
          ? 'https://integrate.api.nvidia.com/v1/chat/completions'
          : '';
        apiKey = process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY || '';
        break;
      case 'openrouter':
        endpoint = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY
          ? 'https://openrouter.ai/api/v1/chat/completions'
          : '';
        apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || '';
        break;
      case '9router':
        endpoint = process.env.VITE_AI_GATEWAY_URL
          ? `${process.env.VITE_AI_GATEWAY_URL}/chat/completions`
          : 'http://localhost:20128/v1/chat/completions';
        apiKey = process.env.VITE_AI_GATEWAY_KEY || 'arblok';
        break;
      default:
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }

    if (!endpoint) {
      return res.status(400).json({ error: `${provider} provider not configured on server` });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
