// api/state.js — proxy entre o cliente e o Firestore
// O cliente fala só com o Vercel; o Vercel fala com o Firestore.
// Resolve o caso onde a rede do cliente bloqueia firestore.googleapis.com.
//
// Cache em memória: 1.5s para GETs. Isso evita bater no limite de quota
// do Firestore quando vários clientes (painel + tela + testes) pollam
// ao mesmo tempo. Múltiplas chamadas dentro da janela de cache
// retornam o mesmo snapshot, sem custo extra de leitura.

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/kibo-b298c/databases/(default)/documents/jogos/quem-disse-o-que';
const CACHE_TTL_MS_OK = 5000;   // cache agressivo p/ sucesso (corta reads)
const CACHE_TTL_MS_ERR = 500;   // cache curto p/ erros (deixa o Firestore respirar)

let cache = null;        // último body retornado pelo Firestore
let cacheTime = 0;       // timestamp (ms) de quando o cache foi populado
let cacheStatus = 0;     // HTTP status do cache (200 ou 429)
let inflight = null;     // promise em andamento (coalesce requests simultâneos)

async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function fetchFromFirestore(key) {
  const url = `${FIRESTORE_BASE}?key=${key}`;
  const r = await fetch(url, { cache: 'no-store' });
  return { status: r.status, data: await r.json().catch(() => ({})) };
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

  // GET: cache 5s p/ sucesso (mata ~70% dos reads), 0.5s p/ erro
  // (deixa o cooldown do Firestore respirar). Múltiplos clients no mesmo
  // instante compartilham a request "viva" via inflight coalescing.
  if (req.method === 'GET') {
    const now = Date.now();
    const ttl = cacheStatus === 200 ? CACHE_TTL_MS_OK : CACHE_TTL_MS_ERR;
    if (cache && (now - cacheTime) < ttl) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(cacheStatus).json(cache);
    }
    if (inflight) {
      res.setHeader('X-Cache', 'COALESCED');
      const result = await inflight;
      return res.status(result.status).json(result.data);
    }
    res.setHeader('X-Cache', 'MISS');
    inflight = fetchFromFirestore(key)
      .then((result) => {
        cache = result.data;
        cacheStatus = result.status;
        cacheTime = Date.now();
        return result;
      })
      .finally(() => { inflight = null; });
    const result = await inflight;
    return res.status(result.status).json(result.data);
  }

  // PATCH: passa direto pro Firestore, sem cache.
  // Invalida o cache pra que o próximo GET pegue o estado novo.
  if (req.method === 'PATCH') {
    try {
      const raw = await readRawBody(req);
      const url = `${FIRESTORE_BASE}?key=${key}`;
      const r = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: raw
      });
      const data = await r.json().catch(() => ({}));
      // invalida cache em PATCH bem-sucedido; em erro, expira rápido
      if (r.status === 200) {
        cache = data;
        cacheStatus = 200;
        cacheTime = Date.now();
      } else {
        cache = data;
        cacheStatus = r.status;
        cacheTime = Date.now() - (CACHE_TTL_MS_OK - CACHE_TTL_MS_ERR); // TTL curto
      }
      return res.status(r.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'proxy error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
