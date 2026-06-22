// Banco de cartas: 10 situações no estilo "Quem Disse O Quê?"
// Cada carta tem 1 leitura mais provável + 1 alternativa plausível (foco no jogo)

window.CARTAS = [
  {
    contexto: "Amizade · amigo que sumiu",
    psi: "Implicatura de irrelevância · Grice (1975)",
    frase: "Amigo que tava sumido responde: \"Beleza, a gente se vê quando der.\"",
    leituraReal: "Não vou te procurar (corte definitivo de contato, modo educado). Quem tá só ocupado marca data: \"semana que vem, quinta?\". A vagueza aqui é o sinal.",
    alternativas: ["Tô ocupado, mas quero manter contato"]
  },
  {
    contexto: "Trabalho · chefe, prazo implícito",
    psi: "Ato de fala indireto diretivo · Searle (1975)",
    frase: "Chefe manda na sexta 17h: \"Quando puder, dá uma olhada nesse relatório.\"",
    leituraReal: "Faz HOJE, é pra ontem — mas não quero ser grosseiro pedindo de forma direta. Chefe com prazo real diz a data: \"preciso sexta às 10h\". A vagueza aqui = urgência.",
    alternativas: ["Faz quando der, sem pressa"]
  },
  {
    contexto: "Família · mãe, decisão importante",
    psi: "Implicatura conversacional · Grice (1975)",
    frase: "Mãe no telefone, depois que você contou uma decisão polêmica: \"Tá, mas você que sabe.\"",
    leituraReal: "Discordo totalmente, mas não vou brigar — aguardo você perceber sozinha. Quem apoia de verdade pergunta \"como posso te ajudar?\".",
    alternativas: ["Te apoio, vai lá"]
  },
  {
    contexto: "Comunicação digital · grupo familiar",
    psi: "Ato fático minimalista · Jakobson (1960)",
    frase: "Tio-avô no grupo de zap com 15 pessoas manda só: 👍",
    leituraReal: "Vou fingir que li, encerra a conversa sem me posicionar. Quem concorda de verdade manda \"concordo\" ou ❤️. Só 👍 = quer sair da conversa.",
    alternativas: ["Concordo, beleza"]
  },
  {
    contexto: "Sala de aula · pós-graduação",
    psi: "Face-saving act · Brown & Levinson (1987)",
    frase: "Professora, depois que você falou algo sem sentido: \"Interessante esse ponto. Vamos continuar na próxima aula.\"",
    leituraReal: "Você falou disparate, mas não vou te expor na frente da turma. Quem gostou do ponto pergunta: \"onde você leu isso?\" ou \"me dá um exemplo\". Trocar de assunto = não gostou.",
    alternativas: ["Gostei, vamos aprofundar"]
  },
  {
    contexto: "Família · pai, decisão arriscada",
    psi: "Pressuposição retórica · Ducrot (1972)",
    frase: "Pai, depois que você disse que vai largar o emprego: \"Se você acha que tá certo, então faz.\"",
    leituraReal: "Eu acho errado, te dou corda pra se enforcar — depois eu digo \"eu avisei\". A condicional \"se você acha\" já presume que ele acha errado, só não quer falar agora.",
    alternativas: ["Pai confiante, te apoia"]
  },
  {
    contexto: "Amizade · pós-briga",
    psi: "Ato de fala indireto · Searle (1975)",
    frase: "Amiga, depois de uma briga feia ontem, responde: \"Tô bem, só cansada.\"",
    leituraReal: "Estou magoada com você, mas não quero tocar no assunto. Quem tá só cansada diz \"que dia difícil, canseira\" — sem precisar afirmar \"tô bem\" antes.",
    alternativas: ["Tá cansada mesmo, ok"]
  },
  {
    contexto: "Trabalho · entrevista, oferta ruim",
    psi: "Discurso institucional · Fairclough (1992)",
    frase: "RH, na oferta com salário abaixo do mercado: \"Aqui na empresa somos uma família.\"",
    leituraReal: "Espera hora extra, dedicação emocional, sacrifício pessoal — tudo disfarçado de intimidade. Família corporativa é o oposto da família real: você não pode sair, não tem sangue, não pode xingar.",
    alternativas: ["Ambiente acolhedor, bom sinal"]
  },
  {
    contexto: "Amizade · pedido sério",
    psi: "Fático como defesa · Jakobson (1960)",
    frase: "Amigo próximo, depois que você contou que perdeu o emprego: \"kkkkk\" (sem mais nada)",
    leituraReal: "Não sei o que dizer, fujo pro riso — me poupe de conselhos clichê. Rir de notícia pesada é congelamento, não leveza.",
    alternativas: ["Rindo de nervoso, tentando amenizar o clima"]
  },
  {
    contexto: "Amizade · conflito iminente",
    psi: "Marcador de FTA · Brown & Levinson (1987)",
    frase: "Amigo de longa data começa: \"Mano, sem querer te chatear, mas...\"",
    leituraReal: "Vou te chatear sim, e vai ser pesado — tô avisando pra preservar minha face. \"Sem querer te chatear\" não é disclaimer, é preâmbulo obrigatório pra FTA que vem a seguir.",
    alternativas: ["Vou te dar uma notícia ruim qualquer"]
  },
  {
    contexto: "Relacionamento · casal de 3 anos",
    psi: "Polidez negativa · Brown & Levinson (1987)",
    frase: "Namorada, quando você avisa que vai sair com a galera sexta: \"Tudo bem, vai sair com seus amigos.\"",
    leituraReal: "Tô magoada por não ter sido convidada, mas não vou admitir pra não parecer carente. Quem tá tranquilo diria \"se diverte\" ou \"bora junto?\" — não \"seus amigos\" com pronome possessivo criando distância.",
    alternativas: ["Tá tranquilo, vai lá"]
  }
];



// ============================================================
// Sync via API REST do Firestore (sem SDK, mais confiável)
// Path: jogos/quem-disse-o-que
// Usa long-polling a cada 1.5s pra detectar mudanças
// ============================================================

const PROJECT_ID = "kibo-b298c";
const API_KEY = "AIzaSyCp1N9TqP9SbgT_RgDP7vN6pwG6Xejcbks";
const DOC_PATH = "projects/kibo-b298c/databases/(default)/documents/jogos/quem-disse-o-que";
// Proxy serverless: celular fala com o Vercel, Vercel fala com o Firestore.
// Resolve o caso onde a rede do cliente bloqueia firestore.googleapis.com.
const BASE_URL = '/api/state';

const ESTADO_DEFAULT = {
  rodada: 0,
  cartaAtual: null,
  respostas: { a: "", b: "" },
  votos: { a: 0, b: 0 },
  placar: { a: 0, b: 0 },
  rodadaIniciada: false,
  gabaritoRevelado: false,
  versao: 0
};

// converte objeto JS pro formato do Firestore REST
function toFirestore(obj) {
  const fields = {};
  for (const key in obj) {
    fields[key] = jsToFirestoreValue(obj[key]);
  }
  return { fields };
}

function jsToFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") return { integerValue: String(Math.floor(v)) };
  if (typeof v === "boolean") return { booleanValue: v };
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(jsToFirestoreValue) } };
  }
  if (typeof v === "object") {
    const fields = {};
    for (const k in v) fields[k] = jsToFirestoreValue(v[k]);
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

// converte do Firestore pro JS
function fromFirestore(doc) {
  if (!doc || !doc.fields) return Object.assign({}, ESTADO_DEFAULT);
  const result = {};
  for (const key in doc.fields) {
    result[key] = firestoreToJsValue(doc.fields[key]);
  }
  return Object.assign({}, ESTADO_DEFAULT, result);
}

function firestoreToJsValue(v) {
  if (!v) return null;
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return parseInt(v.integerValue, 10);
  if ("doubleValue" in v) return parseFloat(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("arrayValue" in v) {
    return (v.arrayValue.values || []).map(firestoreToJsValue);
  }
  if ("mapValue" in v) {
    const obj = {};
    const fields = (v.mapValue && v.mapValue.fields) || {};
    for (const k in fields) obj[k] = firestoreToJsValue(fields[k]);
    return obj;
  }
  return null;
}

let estadoLocal = Object.assign({}, ESTADO_DEFAULT);
let estadoListeners = [];
let pollInterval = null;
let ultimoVersao = -1;
let enviando = false;

// lê o estado atual do Firestore
async function fetchEstado() {
  try {
    const r = await fetch(BASE_URL, { cache: "no-store" });
    if (!r.ok) {
      console.error("Erro GET:", r.status);
      return null;
    }
    const data = await r.json();
    return fromFirestore(data);
  } catch (err) {
    console.error("Erro fetch:", err);
    return null;
  }
}

// envia o estado pro Firestore
async function enviarEstado(novo) {
  if (enviando) return;
  enviando = true;
  try {
    novo.versao = (novo.versao || 0) + 1;
    const body = JSON.stringify(toFirestore(novo));
    const r = await fetch(BASE_URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error("Erro PATCH:", r.status, txt);
    } else {
      const data = await r.json();
      const novoEstado = fromFirestore(data);
      estadoLocal = novoEstado;
      ultimoVersao = novoEstado.versao;
    }
  } catch (err) {
    console.error("Erro ao enviar:", err);
  } finally {
    enviando = false;
  }
}

function getEstado() {
  return estadoLocal;
}

function setEstado(novo) {
  estadoLocal = Object.assign({}, estadoLocal, novo);
  // avisa listeners locais imediatamente
  estadoListeners.forEach(fn => {
    try { fn(estadoLocal); } catch {}
  });
  try { window.dispatchEvent(new Event("jogo_estado_mudou")); } catch {}
  // envia pro Firestore em background
  enviarEstado(Object.assign({}, estadoLocal));
}

function sortearCarta() {
  return window.CARTAS[Math.floor(Math.random() * window.CARTAS.length)];
}

function iniciarPolling() {
  if (pollInterval) clearInterval(pollInterval);
  const tick = async () => {
    const novo = await fetchEstado();
    if (novo && novo.versao !== ultimoVersao) {
      ultimoVersao = novo.versao;
      estadoLocal = novo;
      estadoListeners.forEach(fn => {
        try { fn(estadoLocal); } catch {}
      });
      try { window.dispatchEvent(new Event("jogo_estado_mudou")); } catch {}
    }
  };
  tick();
  pollInterval = setInterval(tick, 1500);
}

function onEstadoChange(fn) {
  estadoListeners.push(fn);
  try { fn(estadoLocal); } catch {}
}
