// api/state.js — proxy entre o cliente e o Firestore
// O cliente fala só com o Vercel; o Vercel fala com o Firestore.
// Resolve o caso onde a rede do cliente bloqueia firestore.googleapis.com.

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/kibo-b298c/databases/(default)/documents/jogos/quem-disse-o-que';

async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // CORS — libera o painel em qualquer origem
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const key = process.env.FIREBASE_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'FIREBASE_API_KEY not set in Vercel env' });
  }

  const url = `${FIRESTORE_BASE}?key=${key}`;

  try {
    if (req.method === 'GET') {
      const r = await fetch(url, { cache: 'no-store' });
      const data = await r.json().catch(() => ({}));
      return res.status(r.status).json(data);
    }

    if (req.method === 'PATCH') {
      // Lê o body cru (mais robusto que depender do parser automático)
      const raw = await readRawBody(req);
      const r = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: raw
      });
      const data = await r.json().catch(() => ({}));
      return res.status(r.status).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'proxy error' });
  }
}
