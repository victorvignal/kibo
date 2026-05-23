import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

admin.initializeApp({ projectId: 'kibo-b298c' });

// Re-export Kibo analysis functions
export {
  onCheckinAnalyze,
  analyzeUser,
  getUserProfile,
  scheduledAnalysis6h,
  scheduledAnalysisDaily,
  scheduledWeeklyDeep,
  triggerAnalysis,
} from './kibo';

const db = admin.firestore();

// ============================================================================
// Kibo AI - HTTPS Callable Function
// ============================================================================
// To deploy: firebase deploy --only functions
// Requires Firebase Blaze plan (pay-as-you-go)
//
// Environment variables needed (set via: firebase functions:config:set):
// - openrouter.api_key: your OpenRouter API key
// - openrouter.model: model to use (default: google/gemini-2.0-flash-exp)
// ============================================================================

const OPENROUTER_API_KEY = functions.config().openrouter?.api_key || process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = functions.config().openrouter?.model || process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite';

interface KiboRequest {
  message: string;
  context?: {
    userId: string;
    userName?: string;
    avgMood?: number;
    avgSleep?: number;
    avgAnxiety?: number;
    avgSocial?: number;
    streak?: number;
    trend?: 'improving' | 'stable' | 'worsening';
    recentCheckins?: Array<{
      date: string;
      mood: number;
      sleep: number;
      anxiety: number;
      activity: number;
      social: number;
    }>;
  };
}

interface KiboResponse {
  reply: string;
  type?: 'checkin' | 'alert' | 'psicoeducation' | 'chat';
  metadata?: Record<string, unknown>;
}

// Risk detection patterns (checked first, always)
const RISK_PATTERNS = [
  /suicid|ideação|automutila|matar a si|ferir a si|própria vida|acabar com a vida/i,
  /desespero|sem esperança|não aguento mais|melhor sem mim/i,
];

const CRISIS_PATTERNS = [
  /crise|emergência|ajuda agora|pânico|descontrole/i,
];

/** Check if message contains risk keywords */
function containsRisk(input: string): boolean {
  return RISK_PATTERNS.some(p => p.test(input));
}

/** Check if message contains crisis keywords */
function containsCrisis(input: string): boolean {
  return CRISIS_PATTERNS.some(p => p.test(input));
}

/** Build system prompt with user context */
function buildSystemPrompt(context?: KiboRequest['context']): string {
  let prompt = `Você é Kibo, um assistente de saúde mental com IA, com a persona de um gato digital prestativo.

Sua persona:
-🐱 Você é empático, acolhedor e não-julgador
- Você identifica padrões emocionais e fornece insights personalizados
- Você detecta sinais de risco e responde com urgência quando necessário
- Você dá psicoeducação de forma acessível

Regras:
- Nunca forneça diagnósticos
- Sempre recomende profissionais quando necessário
- Em caso de risco, forneça CVV: 188
- Responda em português brasileiro
- Seja cálido mas objetivo`;

  if (context) {
    prompt += `\n\nContexto do usuário:`;
    if (context.avgMood) prompt += `\n- Humor médio recente: ${context.avgMood}/10`;
    if (context.avgSleep) prompt += `\n- Sono médio recente: ${context.avgSleep}/10`;
    if (context.avgAnxiety) prompt += `\n- Ansiedade média recente: ${context.avgAnxiety}/10`;
    if (context.avgSocial) prompt += `\n- Socialização média recente: ${context.avgSocial}/10`;
    if (context.streak !== undefined) prompt += `\n- Sequência de check-ins: ${context.streak} dias`;
    if (context.trend) prompt += `\n- Tendência: ${context.trend}`;
  }

  return prompt;
}

/** Call OpenRouter API for AI response */
async function callOpenRouterAI(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model: string
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://kibo.app',
      'X-Title': 'Kibo AI',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (data.error) {
    throw new Error(`OpenRouter error: ${data.error.message}`);
  }

  return data.choices?.[0]?.message?.content
    || 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente. 💜';
}

/** Local fallback response generator */
function localFallback(message: string, context?: KiboRequest['context']): KiboResponse {
  const input = message.toLowerCase();
  const ctx = context;

  // Risk detection
  if (containsRisk(input)) {
    return {
      reply: `Eu ouvi você. Parece que você está passando por um momento muito difícil. 💜

É importante saber que você não está sozinho(a). Esses sentimentos são muito difíceis de enfrentar sozinho.

Você gostaria de conversar mais sobre como está se sentindo? Ou posso te ajudar a encontrar profissionais de saúde mental na sua região?

**Recursos disponíveis:**
• CVV: 188 (24h, ligação gratuita)
• CAPS mais próximo
• Psicólogo online`,
      type: 'alert',
      metadata: { riskLevel: 'high' },
    };
  }

  // Crisis
  if (containsCrisis(input)) {
    return {
      reply: `Parece que você está em um momento de crise. 💜

Algumas coisas que podem ajudar agora:

1. **Respire fundo** - 4s inhale, 7s segure, 8s exhale. Repita 3x.
2. **Técnica 5-4-3-2-1** - Nomeie 5 coisas que vê, 4 que toca, 3 que ouve, 2 que cheira, 1 que sente.
3. **Peça ajuda** - CVV: **188** (24h).

Você está em um momento difícil, mas isso vai passar. Eu estou aqui. 💜`,
      type: 'alert',
    };
  }

  // Context-aware responses
  const hasContext = ctx && (ctx.avgMood !== undefined);

  if (/\b(triste|chatead[oa]|tristeza|mal|mau)\b/i.test(input)) {
    let reply = `Entendo que você está se sentindo assim. 💜

Sentir-se triste é uma parte normal da experiência humana. Você não precisa fingir estar bem.`;

    if (hasContext && ctx!.avgMood && ctx!.avgMood < 4) {
      reply += `\n\nVejo que seu humor anda baixo ultimamente (média ${ctx!.avgMood}/10). Isso pode estar relacionado ao sono, ansiedade ou acontecimentos recentes. Quer explorar isso mais?`;
    } else {
      reply += `\n\nQuer me contar mais sobre o que está acontecendo?`;
    }

    return { reply, type: 'chat' };
  }

  if (/\b(ansioso|ansiedade|nervoso|preocupad[oa]|ansia)\b/i.test(input)) {
    let reply = `A ansiedade pode ser bem difícil de lidar. 🧠💜`;

    if (hasContext && ctx!.avgAnxiety && ctx!.avgAnxiety >= 7) {
      reply += `\n\nNota que seus níveis de ansiedade têm estado altos (média ${ctx!.avgAnxiety}/10). Isso é desafiador. Vamos tentar algo juntos agora?`;
    } else {
      reply += `\n\nVamos tentar um exercício rápido de grounding?`;
    }

    reply += `\n\n**Técnica 5-4-3-2-1:**
• 👀 5 coisas que você pode VER
• ✋ 4 coisas que você pode TOCAR
• 👂 3 coisas que você pode OUVIR
• 👃 2 coisas que você pode SENTIR o cheiro
• 👅 1 coisa que você pode PROVAR

Isso ajuda a trazer você de volta ao presente. Quer tentar?`;

    return { reply, type: 'chat' };
  }

  if (/\b(estressad[oa]|estresse|sobrecarregad[oa]|cansad[oa])\b/i.test(input)) {
    let reply = `Parece que você está com muito em mente. 😔`;

    if (hasContext && ctx!.avgSleep && ctx!.avgSleep < 5) {
      reply += `\n\nSeu sono não está bom (média ${ctx!.avgSleep}/10). A privação de sono amplifica muito o estresse. Tentar dormir um pouco mais cedo hoje pode ajudar.`;
    } else {
      reply += `\n\nAlgumas técnicas que podem ajudar:
1. **Pausa de 2 min** - Feche os olhos e foque apenas na respiração
2. **Lista rápida** - Escreva 3 coisas que estão te preocupando e 1 ação para cada
3. **Movimento** - Levantar e alongar por 1 minuto já ajuda`;
    }

    return { reply, type: 'chat' };
  }

  if (/\b(dormir|sono|insônne|acordar|descansar)\b/i.test(input)) {
    return {
      reply: `Problemas com sono são muito comuns. 😴

Algumas dicas:
• Horários fixos para dormir e acordar
• Evite telas 1h antes de dormir
• Mantenha o quarto escuro e fresco
• Evite cafeína após as 14h

Você tem sentido dificuldades para dormir?`,
      type: 'psicoeducation',
    };
  }

  if (/\b(bem|feliz|contente|otim[oa]|maravilhos|excelente)\b/i.test(input)) {
    let reply = `Que maravilha! 😊 Fico muito feliz por você!`;

    if (ctx?.streak && ctx.streak > 0) {
      reply += `\n\nAliás, você está há ${ctx.streak} dia(s) seguido(s) fazendo check-in! 🔥`;
    }
    if (ctx?.trend === 'improving') {
      reply += `\n\nE sua tendência é de melhora! Continue assim. 💪`;
    }

    reply += `\n\nO que está fazendo você se sentir assim?`;
    return { reply, type: 'chat' };
  }

  if (/^\s*(oi|olá|hey|eae|opa|kibo|bom dia|boa tarde|boa noite)\s*$/i.test(input)) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    let reply = `${greeting}! 😊 Sou o Kibo, seu assistente de bem-estar mental.\n\nEstou aqui para ouvir, apoiar e ajudar no que você precisar.`;

    if (ctx?.streak && ctx.streak > 0) {
      reply += `\n\n🔥 Você está há ${ctx.streak} dia(s) de sequência de check-ins!`;
    }
    if (ctx?.avgMood) {
      reply += `\n📊 Seu humor médio recente: ${ctx.avgMood}/10`;
    }

    reply += `\n\nComo posso te ajudar hoje?`;
    return { reply, type: 'chat' };
  }

  // Default
  const defaults = [
    `Entendo como você está se sentindo. É importante dar espaço para essas emoções. 💜\n\nQuer me contar mais sobre isso?`,
    `Obrigado por compartilhar comigo. Como você está se sentindo em relação a isso?`,
    `Eu ouvi você. Esses sentimentos são válidos. 💜\n\nVocê gostaria de explorar isso mais ou prefere mudar de assunto?`,
    `Isso que você está passando parece difícil. Estou aqui para ouvir. 💜\n\nO que mais está em sua mente?`,
  ];

  return {
    reply: defaults[Math.floor(Math.random() * defaults.length)],
    type: 'chat',
  };
}

// ============================================================================
// Main HTTPS Callable Function
// ============================================================================
export const kiboChat = functions.https.onCall(
  async (request: functions.https.CallableRequest<KiboRequest>): Promise<KiboResponse> => {
    const { message, context } = request.data;

    if (!message || typeof message !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'message is required');
    }

    const trimmedMessage = message.trim().slice(0, 1000);

    // Get OpenRouter config
    const apiKey = OPENROUTER_API_KEY;
    const model = OPENROUTER_MODEL;

    // Try AI API if configured, otherwise use local fallback
    if (apiKey) {
      try {
        const systemPrompt = buildSystemPrompt(context);
        const reply = await callOpenRouterAI(systemPrompt, trimmedMessage, apiKey, model);

        // Save chat message to Firestore
        if (context?.userId) {
          await db.collection('messages').add({
            patientId: context.userId,
            role: 'user',
            content: trimmedMessage,
            type: 'chat',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          await db.collection('messages').add({
            patientId: context.userId,
            role: 'assistant',
            content: reply,
            type: 'chat',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return { reply, type: 'chat' };
      } catch (error) {
        console.error('MiniMax API error:', error);
        // Fall through to local fallback
      }
    }

    // Local fallback
    const response = localFallback(trimmedMessage, context);

    // Save to Firestore
    if (context?.userId) {
      await db.collection('messages').add({
        patientId: context.userId,
        role: 'user',
        content: trimmedMessage,
        type: 'chat',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      await db.collection('messages').add({
        patientId: context.userId,
        role: 'assistant',
        content: response.reply,
        type: response.type,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return response;
  }
);

// ============================================================================
// Firestore Trigger: Generate alert when risk is detected
// ============================================================================
export const onCheckinCreate = functions.firestore
  .document('checkins/{checkinId}')
  .onCreate(async (snap: DocumentSnapshot) => {
    const data = snap.data();
    const patientId = data.patientId;

    // Calculate risk score
    const mood = data.mood ?? 5;
    const anxiety = data.anxiety ?? 5;
    const riskScore = Math.max(0, Math.min(10, 10 - mood + anxiety));

    // Get patient's therapist (if any) - needed for alert and lastActive update
    const patientDoc = await db.collection('patients').doc(patientId).get();
    const patientData = patientDoc.data();

    // Create alert if high risk
    if (riskScore >= 7) {
      await db.collection('alerts').add({
        patientId,
        therapistId: patientData?.therapistId || null,
        type: 'risk_increase',
        severity: riskScore >= 9 ? 'high' : 'medium',
        riskScore,
        message: `Risco elevado detectado: humor ${mood}/10, ansiedade ${anxiety}/10`,
        recommendation: 'Verificar paciente e entrar em contato',
        acknowledged: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Update patient's lastActive
    if (patientData?.therapistId) {
      await db.collection('patients').doc(patientId).update({
        lastActive: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

// ============================================================================
// Scheduled: Send weekly summary notifications
// ============================================================================
export const weeklySummary = functions.pubsub
  .schedule('every 7 days')
  .onRun(async () => {
    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      if (userData.role !== 'patient') continue;

      // Get last week's check-ins
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);

      const checkinsSnapshot = await db
        .collection('checkins')
        .where('patientId', '==', userId)
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(cutoff))
        .get();

      if (checkinsSnapshot.empty) continue;

      // Calculate weekly average
      let totalMood = 0;
      let totalSleep = 0;
      let totalAnxiety = 0;
      let totalActivity = 0;
      let totalSocial = 0;

      checkinsSnapshot.forEach((snapshotDoc: admin.firestore.QueryDocumentSnapshot) => {
        const data = snapshotDoc.data();
        totalMood += data.mood ?? 0;
        totalSleep += data.sleep ?? 0;
        totalAnxiety += data.anxiety ?? 0;
        totalActivity += data.activity ?? 0;
        totalSocial += data.social ?? 0;
      });

      const count = checkinsSnapshot.size;
      const avgMood = (totalMood / count).toFixed(1);
      const avgSleep = (totalSleep / count).toFixed(1);
      const avgAnxiety = (totalAnxiety / count).toFixed(1);

      // TODO: Send push notification via FCM
      console.log(
        `Weekly summary for user ${userId}:`,
        `Mood: ${avgMood}, Sleep: ${avgSleep}, Anxiety: ${avgAnxiety}`
      );
    }

    return null;
  });
