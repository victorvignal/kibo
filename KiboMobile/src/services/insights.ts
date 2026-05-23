import { getCheckinHistory, CheckinData } from './checkins';

export interface WeeklyInsight {
  type: 'success' | 'warning' | 'tip';
  title: string;
  description: string;
  emoji: string;
  metric?: string;
}

export async function generateWeeklyInsights(userId: string): Promise<WeeklyInsight[]> {
  const insights: WeeklyInsight[] = [];
  
  try {
    const history = await getCheckinHistory(userId, 7);
    
    if (history.length === 0) {
      insights.push({
        type: 'tip',
        title: 'Comece seu check-in!',
        description: 'Fazer check-ins regulares ajuda você a entender seus padrões emocionais.',
        emoji: '💡',
      });
      return insights;
    }

    // Calculate averages
    const avgMood = history.reduce((a, c) => a + c.mood, 0) / history.length;
    const avgSleep = history.reduce((a, c) => a + c.sleep, 0) / history.length;
    const avgAnxiety = history.reduce((a, c) => a + c.anxiety, 0) / history.length;
    const avgActivity = history.reduce((a, c) => a + c.activity, 0) / history.length;
    const avgSocial = history.reduce((a, c) => a + c.social, 0) / history.length;

    // Mood insights
    if (avgMood >= 7) {
      insights.push({
        type: 'success',
        title: 'Humor em alta!',
        description: `Seu humor médio esta semana foi ${avgMood.toFixed(1)}/10. Continue assim!`,
        emoji: '😊',
        metric: `${avgMood.toFixed(1)}/10`,
      });
    } else if (avgMood < 4) {
      insights.push({
        type: 'warning',
        title: 'Humor em baixa',
        description: 'Seu humor médio esta semana foi menor que o usual. Que tal conversar mais com o Kibo?',
        emoji: '😔',
        metric: `${avgMood.toFixed(1)}/10`,
      });
    }

    // Sleep insights
    if (avgSleep >= 7) {
      insights.push({
        type: 'success',
        title: 'Sono de qualidade!',
        description: `Você está dormindo bem esta semana (${avgSleep.toFixed(1)}/10). Isso ajuda muito no bem-estar!`,
        emoji: '😴',
        metric: `${avgSleep.toFixed(1)}/10`,
      });
    } else if (avgSleep < 5) {
      insights.push({
        type: 'warning',
        title: 'Sono precisa melhorar',
        description: 'Dormir menos de 6 horas pode afetar seu humor e energia. Tente dormir mais cedo.',
        emoji: '⏰',
        metric: `${avgSleep.toFixed(1)}/10`,
      });
    }

    // Anxiety insights
    if (avgAnxiety >= 7) {
      insights.push({
        type: 'warning',
        title: 'Ansiedade elevada',
        description: 'Seus níveis de ansiedade estão altos. Técnicas de respiração podem ajudar.',
        emoji: '😰',
        metric: `${avgAnxiety.toFixed(1)}/10`,
      });
    } else if (avgAnxiety <= 3) {
      insights.push({
        type: 'success',
        title: 'Ansiedade controlada',
        description: 'Parabéns! Seus níveis de ansiedade estão baixos. Continue praticando autoconhecimento.',
        emoji: '🧘',
        metric: `${avgAnxiety.toFixed(1)}/10`,
      });
    }

    // Activity insights
    if (avgActivity >= 7) {
      insights.push({
        type: 'success',
        title: 'Muito ativo!',
        description: 'Ótimo nível de atividade física esta semana. O exercício ajuda a melhorar o humor!',
        emoji: '🏃',
        metric: `${avgActivity.toFixed(1)}/10`,
      });
    } else if (avgActivity < 4) {
      insights.push({
        type: 'tip',
        title: 'Mova-se mais',
        description: 'Pouca atividade física esta semana? Tente uma caminhada de 15 minutos hoje.',
        emoji: '🚶',
        metric: `${avgActivity.toFixed(1)}/10`,
      });
    }

    // Social insights
    if (avgSocial >= 6) {
      insights.push({
        type: 'success',
        title: 'Socialmente ativo!',
        description: 'Boas conexões sociais esta semana. Continue mantendo esses vínculos!',
        emoji: '💬',
        metric: `${avgSocial.toFixed(1)}/10`,
      });
    } else if (avgSocial < 3) {
      insights.push({
        type: 'tip',
        title: 'Conexões sociais',
        description: 'Que tal llamar um amigo ou participar de um grupo? Conexões são importantes para o bem-estar.',
        emoji: '🤝',
        metric: `${avgSocial.toFixed(1)}/10`,
      });
    }

    // Check-in frequency
    if (history.length >= 5) {
      insights.push({
        type: 'success',
        title: 'Check-ins consistentes',
        description: `Você fez ${history.length} check-ins esta semana. Isso é ótimo para acompanhar seu progresso!`,
        emoji: '📋',
        metric: `${history.length} check-ins`,
      });
    } else if (history.length < 3) {
      insights.push({
        type: 'tip',
        title: 'Faça mais check-ins',
        description: 'Você fez poucos check-ins esta semana. Tente fazer pelo menos um por dia.',
        emoji: '⏰',
        metric: `${history.length} check-ins`,
      });
    }

    // Sort by type (warning first, then success, then tips)
    const typeOrder = { warning: 0, success: 1, tip: 2 };
    insights.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

    // Limit to 4 insights
    return insights.slice(0, 4);
  } catch (error) {
    console.error('Failed to generate insights:', error);
    return [{
      type: 'tip',
      title: 'Carregando insights...',
      description: 'Aguarde enquanto processamos seus dados.',
      emoji: '⏳',
    }];
  }
}

export function getPersonalizedTip(moodAvg: number, sleepAvg: number, anxietyAvg: number): string {
  const tips: string[] = [];

  if (sleepAvg < 5) {
    tips.push('🦴 Sono: Tente dormir e acordar em horários fixos, mesmo nos fins de semana.');
  }
  if (anxietyAvg > 6) {
    tips.push('🧘 Ansiedade: Pratique 5 minutos de respiração profunda ao acordar ou antes de dormir.');
  }
  if (moodAvg < 5) {
    tips.push('😊 Humor: Reserve 10 minutos do seu dia para fazer algo que você gosta.');
  }
  if (tips.length === 0) {
    tips.push('💜 Lembre-se: buscar ajuda é um sinal de força. O Kibo está aqui para você!');
    tips.push('🏃 Manter-se ativo fisicamente ajuda a melhorar o humor e reduzir a ansiedade.');
    tips.push('💬 Conexões sociais, mesmo que breves, são importantes para o bem-estar.');
  }

  return tips[Math.floor(Math.random() * tips.length)];
}
