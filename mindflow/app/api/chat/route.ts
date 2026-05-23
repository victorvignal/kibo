import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mindflow-ruby.vercel.app";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Kibo";

interface KiboContext {
  userId?: string;
  userName?: string;
  recentCheckins?: Array<{
    date: string;
    mood: number;
    sleep: number;
    anxiety: number;
    activity: number;
    social: number;
  }>;
  avgMood?: number;
  avgSleep?: number;
  avgAnxiety?: number;
  avgSocial?: number;
  streak?: number;
  trend?: "improving" | "stable" | "worsening";
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(context?: KiboContext): string {
  let prompt = `Você é o Kibo 🐱, um assistente de bem-estar mental empático, acolhedor e profissional.

Sua missão é:
- Ouvir com atenção e validar os sentimentos do usuário
- Oferecer suporte emocional baseado em evidências
- Fornecer técnicas práticas de manejo de estresse e ansiedade
- Detectar sinais de risco (crise, ideação suicida) e agir com cuidado
- Motivar hábitos saudáveis de forma gentil (sono, movimento, socialização)

Suas respostas devem ser:
- Em português brasileiro (formal-informal respeitoso)
- Calorosas e humanizadas, nunca roboticas
- Breves e focadas (2-4 parágrafos maximo)
- Com emojis estratégicos para humanizar, nunca excessivos
- Práticas: ofereça 1-2 ações concretas quando possível

DADOS DO USUÁRIO:`;

  if (context) {
    if (context.userName) {
      prompt += `\n- Nome: ${context.userName}`;
    }
    if (context.recentCheckins && context.recentCheckins.length > 0) {
      prompt += `\n- Check-ins recentes (últimos 7 dias):`;
      context.recentCheckins.forEach((c) => {
        prompt += `\n  • ${c.date}: humor=${c.mood}/10, sono=${c.sleep}/10, ansiedade=${c.anxiety}/10, atividade=${c.activity}/10, social=${c.social}/10`;
      });
    }
    if (context.avgMood !== undefined) {
      prompt += `\n- Humor médio: ${context.avgMood}/10`;
    }
    if (context.avgSleep !== undefined) {
      prompt += `\n- Sono médio: ${context.avgSleep}/10`;
    }
    if (context.avgAnxiety !== undefined) {
      prompt += `\n- Ansiedade média: ${context.avgAnxiety}/10`;
    }
    if (context.avgSocial !== undefined) {
      prompt += `\n- Socialização média: ${context.avgSocial}/10`;
    }
    if (context.streak !== undefined) {
      prompt += `\n- Dias consecutivos de check-in: ${context.streak}`;
    }
    if (context.trend) {
      const trendMap = {
        improving: "melhorando 📈",
        stable: "estável ➡️",
        worsening: "piorando 📉",
      };
      prompt += `\n- Tendência emocional: ${trendMap[context.trend]}`;
    }
  } else {
    prompt += `\n- (sem dados de check-in disponíveis ainda)`;
  }

  prompt += `

REGRAS DE RISCO (máxima prioridade):
Se o usuário mencionar qualquer sinal de crise, ideation, desespero ou risco:
1. Responda com empatia imediata ("Eu ouvi você. Isso que você está sentindo é muito difícil.")
2. Mencione recursos de crise: CVV 188, SAMU 192, ou procure o CAPS mais próximo
3. Ofereça Techniques de urgência (respiração 4-7-8, grounding 5-4-3-2-1)
4. NÃO tente "resolver" o problema - apenas acolha e conecte a ajuda profissional
5. NUNCA minimize o sofrimento nem dê conselhos clínicos beyond seu escopo

Conexão: você é um assistente, não um substituto para profissionais de saúde mental.`;

  return prompt;
}

function buildUserMessage(
  message: string,
  context?: KiboContext
): string {
  let msg = `MENSAGEM DO USUÁRIO: "${message}"`;

  if (context && context.userId) {
    msg += `\n\n[Contexto adicional disponível no system prompt - use quando relevante]`;
  }

  return msg;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, history } = body as {
      message: string;
      context?: KiboContext;
      history?: ConversationMessage[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    // Build messages for OpenRouter
    const systemPrompt = buildSystemPrompt(context);
    const userMsg = buildUserMessage(message, context);

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (last 10 messages)
    if (history && Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-10);
      for (const h of recentHistory) {
        if (h.role === "user" || h.role === "assistant") {
          messages.push({ role: h.role, content: h.content });
        }
      }
    }

    // Add current message
    messages.push({ role: "user", content: userMsg });

    // Call OpenRouter API
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": SITE_URL,
          "X-Title": SITE_NAME,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages,
          max_tokens: 800,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to get response from AI", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract reply from OpenRouter's choices array
    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Desculpe, não consegui gerar uma resposta. Tente novamente. 💜";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "kibo-chat",
    model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
  });
}
