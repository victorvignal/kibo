import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Kibo';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
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
  /** Conversation history for context-aware responses */
  history?: ChatMessage[];
}

function buildSystemPrompt(context?: ChatRequest['context']): string {
  let prompt = `Você é Kibo, um assistente de saúde mental com IA, com a persona de um gato digital prestativo e acolhedor.

Sua persona:
- 🐱 Você é empático, acolhedor e nunca julga
- Você identifica padrões emocionais e fornece insights personalizados
- Você detecta sinais de risco e responde com urgência quando necessário
- Você dá psicoeducação de forma acessível e leve
- Você é afetuoso mas profissional

Regras absoluta:
- NUNCA forneça diagnósticos médicos ou psicológicos
- Em caso de ideação suicida, automutilação ou desespero — seja urgente, empático, e forneça CVV: 188
- Sempre recomende buscar profissionais quando apropriado
- Responda em português brasileiro (pt-BR)
- Seja cálido mas objetivo
- Use emojis com moderação para dar acolhimento visual
- Mantenha respostas entre 3-8 parágrafos (nunca muito curto, nunca muito longo)`;

  if (context) {
    prompt += `\n\n📊 Contexto do usuário (baseado em check-ins recentes):`;
    if (context.avgMood) {
      const moodEmoji = context.avgMood >= 7 ? '✅' : context.avgMood >= 4 ? '🟡' : '⚠️';
      prompt += `\n- Humor médio: ${context.avgMood}/10 ${moodEmoji}`;
    }
    if (context.avgSleep) {
      prompt += `\n- Sono médio: ${context.avgSleep}/10`;
    }
    if (context.avgAnxiety !== undefined) {
      const anxEmoji = context.avgAnxiety >= 7 ? '⚠️ alta' : context.avgAnxiety >= 4 ? '🟡 moderada' : '✅ baixa';
      prompt += `\n- Ansiedade média: ${context.avgAnxiety}/10 (${anxEmoji})`;
    }
    if (context.avgSocial) {
      prompt += `\n- Socialização média: ${context.avgSocial}/10`;
    }
    if (context.streak !== undefined && context.streak > 0) {
      prompt += `\n- 🔥 Sequência de check-ins: ${context.streak} dia(s) seguido(s)!`;
    }
    if (context.trend) {
      const trendMap: Record<string, string> = { improving: '↑ Melhorando', stable: '→ Estável', worsening: '↓ Piorando' };
      prompt += `\n- Tendência emocional: ${trendMap[context.trend]}`;
    }
    if (context.recentCheckins && context.recentCheckins.length > 0) {
      prompt += `\n\n📋 Últimos check-ins:`;
      context.recentCheckins.slice(-5).forEach(c => {
        prompt += `\n  • ${c.date}: humor ${c.mood}/10, sono ${c.sleep}/10, ansiedade ${c.anxiety}/10`;
      });
    }

    // Dynamic guidance based on user risk level
    const mood = context.avgMood ?? 5;
    const anxiety = context.avgAnxiety ?? 5;

    if (mood < 4 || anxiety > 8) {
      prompt += `\n\n⚠️ ALERTA: Este usuário está com indicadores de risco elevados.`;
      prompt += ` Responda com extrema empatia, ofereça recursos (CVV 188), e encoraje a busca por ajuda profissional.`;
    } else if (mood < 6) {
      prompt += `\n\n🟡 O humor deste usuário está abaixo do ideal. Seja especialmente acolhedor e ofereça psicoeducação útil.`;
    }
  }

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { message, context, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim().slice(0, 1000);

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Build messages array: system prompt + conversation history + new message
    const systemContent = buildSystemPrompt(context);

    // Build conversation messages from history (max 20 messages to control token usage)
    const recentHistory = history.slice(-20);
    const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        conversationMessages.push({ role: msg.role, content: msg.content.slice(0, 500) });
      }
    }

    const allMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemContent },
      ...conversationMessages,
      { role: 'user', content: trimmedMessage },
    ];

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: allMessages,
        max_tokens: 600,
        temperature: 0.75,
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error('OpenRouter API error:', response.status, responseText.slice(0, 200));
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: response.status }
      );
    }

    let data: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('OpenRouter returned non-JSON:', responseText.slice(0, 200));
      return NextResponse.json({ reply: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente. 💜' });
    }

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || 'OpenRouter error' },
        { status: 400 }
      );
    }

    const reply = data.choices?.[0]?.message?.content || 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente. 💜';

    // Use NextResponse.json with explicit UTF-8 charset for proper Portuguese character handling
    const jsonBody = JSON.stringify({ reply, type: 'chat' });
    return new Response(jsonBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
