import { API_BASE_URL } from './config';

/**
 * Kibo API Service
 *
 * This service handles AI responses for the Kibo chat.
 * Uses local context-aware response generation.
 * When Firebase Cloud Functions are deployed, switch to callKiboAPI().
 */

export interface KiboMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: string;
}

export interface KiboConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface KiboContext {
  userId: string;
  userName?: string;
  recentCheckins?: RecentCheckin[];
  avgMood?: number;
  avgSleep?: number;
  avgAnxiety?: number;
  avgSocial?: number;
  streak?: number;
  trend?: 'improving' | 'stable' | 'worsening';
}

export interface RecentCheckin {
  date: string;
  mood: number;
  sleep: number;
  anxiety: number;
  activity: number;
  social: number;
}

/** Build context from user's recent check-ins */
export async function buildKiboContext(userId: string): Promise<KiboContext> {
  try {
    const { getCheckinHistory, getMoodTrend } = await import('./checkins');
    const history = await getCheckinHistory(userId, 7);
    const trend = await getMoodTrend(userId, 14);

    if (history.length === 0) {
      return { userId };
    }

    const recentCheckins: RecentCheckin[] = history.slice(0, 7).map(h => ({
      date: h.timestamp?.toISOString().split('T')[0] ?? '',
      mood: h.mood,
      sleep: h.sleep,
      anxiety: h.anxiety,
      activity: h.activity,
      social: h.social,
    }));

    const avgMood = history.reduce((a, c) => a + c.mood, 0) / history.length;
    const avgSleep = history.reduce((a, c) => a + c.sleep, 0) / history.length;
    const avgAnxiety = history.reduce((a, c) => a + c.anxiety, 0) / history.length;
    const avgSocial = history.reduce((a, c) => a + c.social, 0) / history.length;

    // Calculate streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sorted = [...history].sort(
      (a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
    );
    for (let i = 0; i < sorted.length; i++) {
      const d = new Date(sorted[i].timestamp!);
      d.setHours(0, 0, 0, 0);
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (d.getTime() === expected.getTime()) streak++;
      else break;
    }

    // Calculate trend
    let trendDirection: 'improving' | 'stable' | 'worsening' = 'stable';
    if (trend.length >= 7) {
      const recent = trend.slice(-3);
      const older = trend.slice(0, 3);
      const recentAvg = recent.reduce((a, c) => a + c.mood, 0) / recent.length;
      const olderAvg = older.reduce((a, c) => a + c.mood, 0) / older.length;
      const diff = recentAvg - olderAvg;
      if (diff > 0.5) trendDirection = 'improving';
      else if (diff < -0.5) trendDirection = 'worsening';
    }

    return {
      userId,
      recentCheckins,
      avgMood: Math.round(avgMood * 10) / 10,
      avgSleep: Math.round(avgSleep * 10) / 10,
      avgAnxiety: Math.round(avgAnxiety * 10) / 10,
      avgSocial: Math.round(avgSocial * 10) / 10,
      streak,
      trend: trendDirection,
    };
  } catch {
    return { userId };
  }
}

// Local response generator - used when no cloud function is available
export function generateLocalKiboResponse(userInput: string, context?: KiboContext): string {
  const input = userInput.toLowerCase();
  const ctx = context;

  // Build contextual summary if available
  const hasContext = ctx && (ctx.avgMood !== undefined || ctx.recentCheckins);

  // Risk detection - highest priority
  const riskPatterns = [
    /suicid|ideação|automutila|matar a? si|ferir a? si|própria vida|me matar|me suicid/i,
    /desespero|sem esperança|não aguento mais|melhor sem mim/i,
    /fim da vida|acabar com tudo|me deletar/i,
  ];

  if (riskPatterns.some(p => p.test(input))) {
    return `Eu ouvi você. Parece que você está passando por um momento muito difícil. 💜

É importante saber que você não está sozinho(a). Esses sentimentos são muito difíceis de enfrentar sozinho.

Você gostaria de conversar mais sobre como está se sentindo? Ou posso te ajudar a encontrar profissionais de saúde mental na sua região?

**Recursos disponíveis:**
• CVV: 188 (24h, ligação gratuita)
• CAPS mais próximo
• Psicólogo online`;
  }

  // Crisis resources
  const crisisPatterns = [
    /crise|emergência|ajuda agora|pânico|descontrole/i,
  ];

  if (crisisPatterns.some(p => p.test(input))) {
    return `Parece que você está em um momento de crise. 💜

Algumas coisas que podem ajudar agora:

1. **Respire fundo** - 4 segundos inhale, 7 segundos segure, 8 segundos exhale. Repita 3x.

2. **Técnica 5-4-3-2-1** - Nomeie 5 coisas que vê, 4 que toca, 3 que ouve, 2 que cheira, 1 que sente.

3. **Peça ajuda** - Se sentir que pode se machucar, procure o CVV: **188** (24h).

Você está em um momento difícil, mas isso vai passar. Eu estou aqui. 💜`;
  }

  // Context-aware mood response
  if (/\b(triste|chatead[oa]|tristeza|mal|mau)\b/i.test(input)) {
    let response = `Entendo que você está se sentindo assim. 💜

Sentir-se triste é uma parte normal da experiência humana. Você não precisa fingir estar bem.`;

    if (hasContext && ctx!.avgMood && ctx!.avgMood < 4) {
      response += `\n\nVejo que seu humor anda baixo ultimamente (média ${ctx!.avgMood}/10). `;
      response += `Isso pode estar relacionado ao sono, ansiedade ou acontecimentos recentes. `;
      response += `Quer explorar isso mais?`;
    } else if (hasContext && ctx!.avgMood && ctx!.avgMood >= 7) {
      response += `\n\nEstranhamente, seus check-ins mostram que você estava bem recentemente (média ${ctx!.avgMood}/10). `;
      response += `O que mudou? Às vezes os sentimentos oscilam e isso é normal.`;
    } else {
      response += `\n\nQuer me contar mais sobre o que está acontecendo?`;
    }

    return response;
  }

  if (/\b(ansioso|ansiedade|nervoso|preocupad[oa]|ansia)\b/i.test(input)) {
    let response = `A ansiedade pode ser bem difícil de lidar. 💜`;

    if (hasContext && ctx!.avgAnxiety && ctx!.avgAnxiety >= 7) {
      response += `\n\nNota que seus níveis de ansiedade têm estado altos (média ${ctx!.avgAnxiety}/10). `;
      response += `Isso é desafiador. Vamos tentar algo juntos agora?`;
    } else {
      response += `\n\nVamos tentar um exercício rápido de grounding?`;
    }

    response += `\n\n**Técnica 5-4-3-2-1:**
• 👀 5 coisas que você pode VER
• ✋ 4 coisas que você pode TOCAR
• 👂 3 coisas que você pode OUVIR
• 👃 2 coisas que você pode SENTIR o cheiro
• 👅 1 coisa que você pode PROVAR

Isso ajuda a trazer você de volta ao presente. Quer tentar?`;

    return response;
  }

  if (/\b(estressad[oa]|estresse|sobrecarregad[oa]|cansad[oa])\b/i.test(input)) {
    let response = `Parece que você está com muito em mente. 😔`;

    if (hasContext && ctx!.avgSleep && ctx!.avgSleep < 5) {
      response += `\n\nSeu sono não está bom (média ${ctx!.avgSleep}/10). A privação de sono amplifica muito o estresse. `;
      response += `Tentar dormir um pouco mais cedo hoje pode ajudar.`;
    } else {
      response += `\n\nAlgumas técnicas que podem ajudar:\n\n1. **Pausa de 2 min** - Feche os olhos e foque apenas na respiração\n2. **Lista rápida** - Escreva 3 coisas que estão te preocupando e 1 ação para cada\n3. **Movimento** - Levantar e alongar por 1 minuto já ajuda`;
    }

    return response;
  }

  if (/\b(dormir|sono|insône|acordar|descansar)\b/i.test(input)) {
    let response = `Problemas com sono são muito comuns. 😴`;

    if (hasContext && ctx!.avgSleep) {
      response += `\n\nNa sua média recente, seu sono está ${ctx!.avgSleep >= 7 ? 'bom' : ctx!.avgSleep >= 5 ? 'regular' : 'preocupante'} (${ctx!.avgSleep}/10).`;
    }

    response += `\n\nAlgumas dicas:\n\n• Horários fixos para dormir e acordar\n• Evite telas 1h antes de dormir\n• Mantenha o quarto escuro e fresco\n• Evite cafeína após as 14h`;

    return response;
  }

  if (/\b(sozinho|solitário|isolad[oa]|sem ninguém)\b/i.test(input)) {
    let response = `A solidão é uma sensação muito difícil. 💜

Você não está realmente sozinho - eu estou aqui com você.`;

    if (hasContext && ctx!.avgSocial && ctx!.avgSocial < 3) {
      response += `\n\nSeus check-ins mostram menos interação social recentemente (${ctx!.avgSocial}/10). `;
      response += `Uma única conversa significativa por dia já faz diferença.`;
    }

    response += `\n\nAlgumas sugestões:
• Ligar para um amigo ou familiar
• Participar de um grupo online sobre algo que você gosta
• Um trabalho voluntário também pode ajudar a se conectar

Quer explorar mais alguma dessas ideias?`;

    return response;
  }

  // Positive inputs
  if (/\b(bem|feliz|contente|otim[oa]|maravilhos|excelente)\b/i.test(input)) {
    let response = `Que maravilha! 😊 Fico muito feliz por você!`;

    if (hasContext && ctx!.streak && ctx!.streak > 0) {
      response += `\n\nAliás, você está há ${ctx!.streak} dia(s) seguido(s) fazendo check-in! 🔥`;
    }

    if (hasContext && ctx!.trend === 'improving') {
      response += `\n\nE sua tendência é de melhora! Continue assim. 💪`;
    }

    response += `\n\nO que está fazendo você se sentir assim? Celebrar as coisas boas é importante para o bem-estar.`;

    return response;
  }

  // Greetings
  if (/^\s*(oi|olá|hey|eae|opa|kibo|bom dia|boa tarde|boa noite)\s*$/.test(input)) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    let response = `${greeting}! 😊 Sou o Kibo, seu assistente de bem-estar mental.

Estou aqui para ouvir, apoiar e ajudar no que você precisar.`;

    if (hasContext) {
      if (ctx!.streak && ctx!.streak > 0) {
        response += `\n\n🔥 Você está há ${ctx!.streak} dia(s) de sequência de check-ins!`;
      }
      if (ctx!.avgMood) {
        response += `\n📊 Seu humor médio recente: ${ctx!.avgMood}/10`;
      }
    }

    response += `\n\nComo posso te ajudar hoje?`;
    return response;
  }

  // Gratitude
  if (/\b(obrigad[oa]|valeu|thanks|grato|grata)\b/i.test(input)) {
    return `De nada! 😊 Fico feliz em ajudar.

Lembre-se: buscar apoio é um sinal de força, não de fraqueza. Estou sempre aqui para você. 💜`;
  }

  // Check-in encouragement (context-aware)
  if (/\b(check-in|checkin|check in)\b/i.test(input)) {
    let response = `Ótima ideia! Fazer check-ins regularmente ajuda a entender seus padrões emocionais. 💜

Você pode fazer seu check-in na aba 📋 aqui no app. Leva só 1 minuto!`;

    if (hasContext && ctx!.streak === 0) {
      response += `\n\nVocê ainda não fez check-in hoje. Que tal começar agora?`;
    } else if (hasContext && ctx!.streak && ctx!.streak > 0) {
      response += `\n\nIncrível! Você já está há ${ctx!.streak} dias de sequência. Continue! 🔥`;
    }

    return response;
  }

  // Breathing exercise
  if (/\b(respiração|respirar|respire|exercício|exercicio|relaxar|relaxamento)\b/i.test(input)) {
    return `Temos uma tela de exercícios de respiração guiada! 🌬️

Vá para a tela **🌬️ Respirar** no app - lá você encontra:
• 4-7-8 Respiração (relaxamento profundo)
• Respiração Quadrada (anti-ansiedade)
• Respiração Calma (ativa o sistema parassimpático)
• Respiração Energizante

Todos com cronômetro visual e contador de ciclos. Quer experimentar agora? 💜

Ou se preferir, podemos fazer juntos agora:
1. Expire completamente pela boca
2. Inspire pelo nariz por 4 segundos
3. Segure por 7 segundos
4. Expire lentamente por 8 segundos

Repita 3-4 vezes e notice como seu corpo responde.`;
  }

  // "How am I doing?" / summary request
  if (/\b(como estou|meu resumo|como vai|como tá|status|pontuação|score)\b/i.test(input)) {
    if (!hasContext) {
      return `Ainda não tenho dados suficientes dos seus check-ins para gerar um resumo. 💜

Que tal fazer um check-in agora na aba 📋? Assim posso te dar insights mais personalizados.`;
    }

    const mood = ctx!.avgMood ?? 0;
    const sleep = ctx!.avgSleep ?? 0;
    const anxiety = ctx!.avgAnxiety ?? 0;
    const streak = ctx!.streak ?? 0;

    let riskLevel = 'baixo';
    if (mood < 4 || anxiety > 8) riskLevel = 'elevado';
    else if (mood < 6 || anxiety > 6) riskLevel = 'moderado';

    return `📊 Aqui está seu resumo recente:

• Humor médio: ${mood}/10 ${mood >= 7 ? '✅' : mood >= 4 ? '🟡' : '⚠️'}
• Sono médio: ${sleep}/10
• Ansiedade média: ${ctx!.avgAnxiety}/10
• Sequência: ${streak} dia(s) 🔥
• Nível de risco: ${riskLevel}

${riskLevel === 'elevado' ? 'Estou preocupado com você. Que tal conversarmos mais?' :
        riskLevel === 'moderado' ? 'Você está indo bem, mas preste atenção em como está se sentindo.' :
        'Você está bem! Continue mantendo o que está dando certo. 💜'}`;
  }

  // Default empathetic response
  const defaultResponses = [
    `Entendo como você está se sentindo. É importante dar espaço para essas emoções. 💜

Quer me contar mais sobre isso?`,
    `Obrigado por compartilhar comigo. Como você está se sentindo em relação a isso?`,
    `Eu ouvi você. Esses sentimentos são válidos. 💜

Você gostaria de explorar isso mais ou prefere mudar de assunto?`,
    `Isso que você está passando parece difícil. Estou aqui para ouvir. 💜

O que mais está em sua mente?`,
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

/**
 * Call Kibo AI via REST API (mindflow) or Cloud Function.
 * Falls back to local generation if the call fails.
 * Passes conversation history for context-aware responses.
 */
export async function callKiboAPI(
  message: string,
  context?: KiboContext,
  history?: KiboConversationMessage[]
): Promise<string> {
  // Try REST API first (mindflow web dashboard)
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, history }),
    });

    if (response.ok) {
      const data = await response.json() as { reply?: string };
      if (data.reply && data.reply.trim().length > 0) {
        return data.reply;
      }
    }
  } catch {
    // Fall through to try Cloud Function
  }

  // Try Firebase Cloud Function as fallback
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const { app } = await import('./firebase');
    const functions = getFunctions(app);
    const response = await httpsCallable(functions, 'kiboChat')({ message, context, history });
    return (response.data as { reply: string }).reply;
  } catch {
    // Fall through to local generation
  }

  // Use local context-aware generation (works offline)
  return generateLocalKiboResponse(message, context);
}
