// API route: GET /api/estado e POST /api/estado
// Persiste o estado do jogo no Vercel KV (Redis free tier)
// Funciona entre dispositivos (celular controla, PC projeta)
// Latência: ~50ms (mesma região)

import { kv } from "@vercel/kv";

const KEY = "jogo-quem-disse-o-que:estado";

const ESTADO_DEFAULT = {
  rodada: 0,
  cartaAtual: null,
  respostas: { a: "", b: "" },
  votos: { a: 0, b: 0 },
  placar: { a: 0, b: 0 },
  rodadaIniciada: false,
  gabaritoRevelado: false,
  versao: 0,
  atualizadoEm: 0
};

export default async function handler(req, res) {
  // CORS pra liberar qualquer origem
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    try {
      const data = await kv.get(KEY);
      return res.status(200).json(data || ESTADO_DEFAULT);
    } catch (err) {
      return res.status(200).json(ESTADO_DEFAULT);
    }
  }

  if (req.method === "POST") {
    try {
      const novo = req.body && Object.keys(req.body).length > 0 ? req.body : ESTADO_DEFAULT;
      novo.versao = (novo.versao || 0) + 1;
      novo.atualizadoEm = Date.now();
      await kv.set(KEY, novo);
      return res.status(200).json(novo);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
