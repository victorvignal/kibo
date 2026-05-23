/**
 * Crisis Prevention Service
 * Detects early-warning patterns from check-in history
 * and surfaces proactive interventions before crisis escalates.
 */

import { getCheckinHistory, CheckinData } from './checkins';

export interface CrisisWarning {
  detected: boolean;
  severity: 'low' | 'medium' | 'high';
  triggerReason: string;
  daysAffected: number;
  pattern: 'mood_drop' | 'anxiety_spike' | 'isolation' | 'combined';
  copingStrategies: CopingStrategy[];
  personalizedMessage: string;
  suggestedActions: string[];
}

export interface CopingStrategy {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: 'breathing' | 'movement' | 'social' | 'grounding' | 'routine' | 'professional';
  actionLabel: string;
  screenNavigate?: string;
}

const COPING_STRATEGIES: CopingStrategy[] = [
  {
    id: 'breathing_4_7_8',
    title: 'Respiração 4-7-8',
    description: 'Inspire por 4s, segure por 7s, expire por 8s. Repita 3x. Ativa o sistema parassimpático.',
    emoji: '🌬️',
    category: 'breathing',
    actionLabel: 'Fazer exercício',
    screenNavigate: 'BreathingExercise',
  },
  {
    id: 'grounding_5_4_3_2_1',
    title: 'Técnica 5-4-3-2-1',
    description: 'Identifique: 5 coisas que vê, 4 que toca, 3 que ouve, 2 que cheira, 1 que prova. Ancoragem no presente.',
    emoji: '🌍',
    category: 'grounding',
    actionLabel: 'Praticar agora',
    screenNavigate: undefined,
  },
  {
    id: 'body_scan',
    title: 'Escaneamento Corporal',
    description: 'Percorra mentalmente cada parte do corpo, notando sensações sem julgar. 5 minutos.',
    emoji: '🧘',
    category: 'grounding',
    actionLabel: 'Começar',
    screenNavigate: 'BreathingExercise',
  },
  {
    id: 'walk_10min',
    title: 'Caminhada de 10 minutos',
    description: 'Mesmo小幅 atividade física libera endorfinas e reduz cortisol. Sem exigência de performance.',
    emoji: '🚶',
    category: 'movement',
    actionLabel: 'Anotar intenção',
    screenNavigate: 'Goals',
  },
  {
    id: 'reach_out',
    title: 'Contatar alguém',
    description: 'Uma mensagem para alguém de confiança pode reduzir sensação de isolamento. Não precisa ser longo.',
    emoji: '💬',
    category: 'social',
    actionLabel: 'Ver contatos',
    screenNavigate: undefined,
  },
  {
    id: 'sleep_hygiene',
    title: 'Rotina de sono',
    description: 'Horário fixo, tela fora 1h antes, ambiente escuro. higiene de sono melhora humor em dias.',
    emoji: '😴',
    category: 'routine',
    actionLabel: 'Ver dicas',
    screenNavigate: 'Insights',
  },
  {
    id: 'crisis_line',
    title: 'Ligar para CVV (188)',
    description: 'Apoio emocional gratuito e sigiloso, 24h. Você não precisa estar em crise para ligar.',
    emoji: '📞',
    category: 'professional',
    actionLabel: 'Ligar agora',
    screenNavigate: undefined,
  },
];

const PERSONALIZED_MESSAGES: Record<CrisisWarning['pattern'], string[]> = {
  mood_drop: [
    'Kibo notou que seu humor tem oscillado para baixo nos últimos dias.',
    'Parece que você está passando por um período mais difícil. Isso é temporário.',
    'Seus dados mostram uma tendência de queda no bem-estar. Não precisa enfrentar sozinho.',
  ],
  anxiety_spike: [
    'Kibo percebeu que sua ansiedade tem estado mais elevada recentemente.',
    'Os níveis de tensão estão mais altos que o habitual. Vamos cuidar disso juntos.',
    'Quando a ansiedade sobe, pequenas estratégias fazem grande diferença.',
  ],
  isolation: [
    'Kibo notou que você tem interagido menos ultimamente.',
    'O isolamento pode se acumular. Que tal uma pequena conexão hoje?',
    'Mesmo um "oi" para alguém pode ajudar. Você não precisa fazer isso sozinho.',
  ],
  combined: [
    'Kibo notou que você está passando por um período difícil. Múltiplos sinais mostram que você pode precisar de apoio extra.',
    'Parece que as coisas andam pesando. Quero que saiba: está tudo bem pedir ajuda.',
    'Seus indicadores mostram que você não está no seu melhor momento. Estamos aqui para isso.',
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function averageByDay(checkins: CheckinData[]): Map<string, { mood: number; anxiety: number; social: number; count: number }> {
  const byDay = new Map<string, { mood: number; anxiety: number; social: number; count: number }>();

  for (const c of checkins) {
    if (!c.timestamp) continue;
    const key = new Date(c.timestamp).toISOString().split('T')[0];
    const existing = byDay.get(key) || { mood: 0, anxiety: 0, social: 0, count: 0 };
    existing.mood += c.mood;
    existing.anxiety += c.anxiety;
    existing.social += c.social;
    existing.count += 1;
    byDay.set(key, existing);
  }

  // Average
  for (const [key, val] of byDay) {
    val.mood = val.mood / val.count;
    val.anxiety = val.anxiety / val.count;
    val.social = val.social / val.count;
  }

  return byDay;
}

function selectStrategies(checkins: CheckinData[]): CopingStrategy[] {
  // Look at recent checkin pattern to pick relevant strategies
  const recentAvg = {
    mood: 0, anxiety: 0, social: 0,
  };
  if (checkins.length > 0) {
    const recent = checkins.slice(0, Math.min(3, checkins.length));
    recentAvg.mood = recent.reduce((a, c) => a + c.mood, 0) / recent.length;
    recentAvg.anxiety = recent.reduce((a, c) => a + c.anxiety, 0) / recent.length;
    recentAvg.social = recent.reduce((a, c) => a + c.social, 0) / recent.length;
  }

  const strategies: CopingStrategy[] = [];

  // Always include breathing
  strategies.push(COPING_STRATEGIES.find(s => s.id === 'breathing_4_7_8')!);

  // Always include grounding
  strategies.push(COPING_STRATEGIES.find(s => s.id === 'grounding_5_4_3_2_1')!);

  // If mood is low, include movement and social
  if (recentAvg.mood < 5) {
    strategies.push(COPING_STRATEGIES.find(s => s.id === 'walk_10min')!);
    strategies.push(COPING_STRATEGIES.find(s => s.id === 'reach_out')!);
  }

  // If anxiety is high, add body scan
  if (recentAvg.anxiety > 6) {
    strategies.push(COPING_STRATEGIES.find(s => s.id === 'body_scan')!);
  }

  // If social is low, add reach_out
  if (recentAvg.social < 4) {
    if (!strategies.find(s => s.id === 'reach_out')) {
      strategies.push(COPING_STRATEGIES.find(s => s.id === 'reach_out')!);
    }
  }

  // Always include crisis line for medium/high severity
  strategies.push(COPING_STRATEGIES.find(s => s.id === 'crisis_line')!);

  return strategies.slice(0, 5);
}

export async function detectCrisisPattern(patientId: string): Promise<CrisisWarning> {
  const defaultWarning: CrisisWarning = {
    detected: false,
    severity: 'low',
    triggerReason: '',
    daysAffected: 0,
    pattern: 'combined',
    copingStrategies: COPING_STRATEGIES.slice(0, 3),
    personalizedMessage: pickRandom(PERSONALIZED_MESSAGES.combined),
    suggestedActions: ['Fazer check-in', 'Conversar com Kibo'],
  };

  try {
    // Get last 5 days of check-ins
    const history = await getCheckinHistory(patientId, 5);

    if (history.length < 3) {
      // Need at least 3 check-ins over at least 3 days for pattern detection
      return defaultWarning;
    }

    const daily = averageByDay(history);

    // Sort days
    const sortedDays = Array.from(daily.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    if (sortedDays.length < 3) {
      return defaultWarning;
    }

    // Analyze patterns
    let moodDropDays = 0;
    let anxietySpikeDays = 0;
    let isolationDays = 0;
    let totalDays = sortedDays.length;

    // Reference: overall average across all check-ins
    const overallMood = history.reduce((a, c) => a + c.mood, 0) / history.length;
    const overallAnxiety = history.reduce((a, c) => a + c.anxiety, 0) / history.length;
    const overallSocial = history.reduce((a, c) => a + c.social, 0) / history.length;

    for (const [, day] of sortedDays) {
      // Mood drop: below overall average by >1.5 points
      if (day.mood < overallMood - 1.5) moodDropDays++;
      // Anxiety spike: above overall average by >1.5 points
      if (day.anxiety > overallAnxiety + 1.5) anxietySpikeDays++;
      // Isolation: social score below 4
      if (day.social < 4) isolationDays++;
    }

    // Trigger if 3+ days show the same pattern
    const TRIGGER_THRESHOLD = 3;
    const daysWithMoodDrop = moodDropDays;
    const daysWithAnxietySpike = anxietySpikeDays;
    const daysWithIsolation = isolationDays;

    const maxPatternDays = Math.max(daysWithMoodDrop, daysWithAnxietySpike, daysWithIsolation);

    if (maxPatternDays < TRIGGER_THRESHOLD) {
      return defaultWarning;
    }

    // Determine which pattern is dominant
    let pattern: CrisisWarning['pattern'] = 'combined';
    let triggerReason = '';
    let severity: CrisisWarning['severity'] = 'medium';

    if (daysWithMoodDrop >= TRIGGER_THRESHOLD && daysWithAnxietySpike >= TRIGGER_THRESHOLD) {
      pattern = 'combined';
      triggerReason = `Queda de humor + pico de ansiedade em ${maxPatternDays} dias`;
      severity = maxPatternDays >= 4 ? 'high' : 'medium';
    } else if (daysWithMoodDrop >= TRIGGER_THRESHOLD) {
      pattern = 'mood_drop';
      triggerReason = `Queda sustentada de humor em ${daysWithMoodDrop} dias`;
      severity = daysWithMoodDrop >= 4 ? 'high' : 'medium';
    } else if (daysWithAnxietySpike >= TRIGGER_THRESHOLD) {
      pattern = 'anxiety_spike';
      triggerReason = `Pico de ansiedade em ${daysWithAnxietySpike} dias`;
      severity = daysWithAnxietySpike >= 4 ? 'high' : 'medium';
    } else if (daysWithIsolation >= TRIGGER_THRESHOLD) {
      pattern = 'isolation';
      triggerReason = `Isolamento social em ${daysWithIsolation} dias`;
      severity = 'medium';
    }

    const messages = PERSONALIZED_MESSAGES[pattern];
    const message = pickRandom(messages);
    const strategies = selectStrategies(history);

    const suggestedActions: string[] = [];
    if (severity === 'high') {
      suggestedActions.push('Ligar para CVV (188)', 'Falar com Kibo agora', 'Avisar alguém de confiança');
    } else {
      suggestedActions.push('Fazer exercício de respiração', 'Dar um paseo curto', 'Conversar com Kibo');
    }

    return {
      detected: true,
      severity,
      triggerReason,
      daysAffected: maxPatternDays,
      pattern,
      copingStrategies: strategies,
      personalizedMessage: message,
      suggestedActions,
    };
  } catch (error) {
    console.warn('Crisis detection error:', error);
    return defaultWarning;
  }
}
