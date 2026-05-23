import { getCheckinHistory, CheckinData } from './checkins';

export type ChallengeCategory = 'sleep' | 'social' | 'activity' | 'mindfulness' | 'mood' | 'consistency';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: ChallengeCategory;
  targetDays: number;
  currentProgress: number;
  progressPercent: number;
  status: 'active' | 'completed' | 'locked' | 'available';
  reward: string;
  startDate?: Date;
  completedDate?: Date;
  insight: string;
}

interface ChallengeResult {
  challenges: Challenge[];
  recommendedChallenge: string | null;
  completedToday: boolean;
}

// Generate personalized challenges based on user's history
export async function generateChallenges(userId: string): Promise<ChallengeResult> {
  const history = await getCheckinHistory(userId, 30);

  const challenges: Challenge[] = [];
  let recommendedChallenge: string | null = null;

  // Analyze user's patterns
  const avgMood = history.filter(h => h.mood > 0).reduce((a, c) => a + c.mood, 0) / Math.max(1, history.filter(h => h.mood > 0).length);
  const avgSleep = history.filter(h => h.sleep > 0).reduce((a, c) => a + c.sleep, 0) / Math.max(1, history.filter(h => h.sleep > 0).length);
  const avgSocial = history.filter(h => h.social > 0).reduce((a, c) => a + c.social, 0) / Math.max(1, history.filter(h => h.social > 0).length);
  const avgActivity = history.filter(h => h.activity > 0).reduce((a, c) => a + c.activity, 0) / Math.max(1, history.filter(h => h.activity > 0).length);
  const avgAnxiety = history.filter(h => h.anxiety > 0).reduce((a, c) => a + c.anxiety, 0) / Math.max(1, history.filter(h => h.anxiety > 0).length);

  // Calculate streak (consecutive days with checkins)
  const sortedHistory = [...history]
    .filter(h => h.timestamp)
    .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  for (let i = 0; i < sortedHistory.length; i++) {
    const checkinDate = new Date(sortedHistory[i].timestamp!);
    checkinDate.setHours(0, 0, 0, 0);
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    if (checkinDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  // Challenge 1: Sleep Challenge (if sleep is low)
  const sleepProgress = Math.min(7, Math.floor(history.filter(h => h.sleep >= 7).length / 4.3));
  challenges.push({
    id: 'challenge_sleep_7days',
    title: 'Desafio Sono',
    description: 'Dormir pelo menos 7 horas por noite durante 7 dias',
    emoji: '😴',
    category: 'sleep',
    targetDays: 7,
    currentProgress: sleepProgress,
    progressPercent: Math.round((sleepProgress / 7) * 100),
    status: sleepProgress >= 7 ? 'completed' : 'active',
    reward: '🏆 Badge de Higiene do Sono',
    completedDate: sleepProgress >= 7 ? new Date() : undefined,
    insight: avgSleep < 6 ? 'Seu sono precisa de atenção. Tente dormir e acordar em horários fixos.' : 'Continue mantendo bons hábitos de sono!',
  });

  // Challenge 2: Social Challenge (if social is low)
  const socialProgress = Math.min(7, Math.floor(history.filter(h => h.social >= 6).length / 4.3));
  challenges.push({
    id: 'challenge_social_7days',
    title: 'Desafio Social',
    description: 'Uma conversa significativa por dia durante 7 dias',
    emoji: '💬',
    category: 'social',
    targetDays: 7,
    currentProgress: socialProgress,
    progressPercent: Math.round((socialProgress / 7) * 100),
    status: socialProgress >= 7 ? 'completed' : 'active',
    reward: '🎭 Badge de Conexão Social',
    insight: avgSocial < 5 ? 'Conexões sociais são importantes para o bem-estar. Que tal chamar alguém para conversar?' : 'Bom trabalho mantendo contato social!',
  });

  // Challenge 3: Consistency Challenge
  challenges.push({
    id: 'challenge_consistency_14days',
    title: 'Desafio Consistency',
    description: 'Fazer check-in todos os dias durante 14 dias',
    emoji: '🔥',
    category: 'consistency',
    targetDays: 14,
    currentProgress: Math.min(14, streak),
    progressPercent: Math.round((Math.min(14, streak) / 14) * 100),
    status: streak >= 14 ? 'completed' : 'active',
    reward: '⭐ Badge de Dedicação',
    insight: streak < 7 ? `Você está em uma sequência de ${streak} dias! Continue assim!` : 'Incrível! Sua consistência estánotável.',
  });

  // Challenge 4: Activity Challenge (if activity is low)
  const activityProgress = Math.min(7, Math.floor(history.filter(h => h.activity >= 6).length / 4.3));
  challenges.push({
    id: 'challenge_activity_7days',
    title: 'Desafio Movimento',
    description: 'Mover-se ativamente pelo menos 30 min por dia durante 7 dias',
    emoji: '🏃',
    category: 'activity',
    targetDays: 7,
    currentProgress: activityProgress,
    progressPercent: Math.round((activityProgress / 7) * 100),
    status: activityProgress >= 7 ? 'completed' : 'active',
    reward: '💪 Badge de Energia',
    insight: avgActivity < 5 ? 'A atividade física libera endorfinas. Mesmo uma caminhada curta conta!' : 'Ótimo! Sua atividade física está em dia.',
  });

  // Challenge 5: Mood Challenge
  const moodProgress = Math.min(7, Math.floor(history.filter(h => h.mood >= 7).length / 4.3));
  challenges.push({
    id: 'challenge_mood_7days',
    title: 'Desafio Humor',
    description: 'Manter humor acima de 7 durante 7 dias',
    emoji: '😊',
    category: 'mood',
    targetDays: 7,
    currentProgress: moodProgress,
    progressPercent: Math.round((moodProgress / 7) * 100),
    status: moodProgress >= 7 ? 'completed' : 'active',
    reward: '🌈 Badge de Bem-estar',
    insight: avgMood < 5 ? 'O humor anda baixo? Que tal fazer algo que você gosta hoje?' : 'Continue mantendo seu bem-estar!',
  });

  // Challenge 6: Mindfulness Challenge
  const mindfulnessProgress = Math.min(7, Math.floor(history.filter(h => h.anxiety <= 4).length / 4.3));
  challenges.push({
    id: 'challenge_mindfulness_7days',
    title: 'Desafio Calma',
    description: 'Praticar técnicas de relaxamento durante 7 dias',
    emoji: '🧘',
    category: 'mindfulness',
    targetDays: 7,
    currentProgress: mindfulnessProgress,
    progressPercent: Math.round((mindfulnessProgress / 7) * 100),
    status: mindfulnessProgress >= 7 ? 'completed' : 'active',
    reward: '🕊️ Badge de Serenidade',
    insight: avgAnxiety > 6 ? 'Respiração profunda e mindfulness podem ajudar a reduzir a ansiedade.' : 'Bom trabalho gerenciando o estresse!',
  });

  // Determine recommended challenge based on lowest scores
  const scores = [
    { category: 'sleep', score: avgSleep, id: 'challenge_sleep_7days' },
    { category: 'social', score: avgSocial, id: 'challenge_social_7days' },
    { category: 'activity', score: avgActivity, id: 'challenge_activity_7days' },
    { category: 'mood', score: avgMood, id: 'challenge_mood_7days' },
  ];

  // Sort by lowest score to recommend the most needed challenge
  scores.sort((a, b) => a.score - b.score);

  // Recommend the first non-completed challenge with lowest score
  for (const s of scores) {
    const challenge = challenges.find(c => c.id === s.id);
    if (challenge && challenge.status !== 'completed') {
      recommendedChallenge = s.id;
      break;
    }
  }

  // Check if user completed a challenge today (had a checkin today)
  const todayCheckin = sortedHistory.find(h => {
    const d = new Date(h.timestamp!);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const completedToday = !!todayCheckin;

  return { challenges, recommendedChallenge, completedToday };
}

// Get challenge category color
export function getChallengeColor(category: ChallengeCategory): string {
  switch (category) {
    case 'sleep': return '#6366F1';
    case 'social': return '#10B981';
    case 'activity': return '#F59E0B';
    case 'mindfulness': return '#8B5CF6';
    case 'mood': return '#EC4899';
    case 'consistency': return '#EF4444';
    default: return '#6B7280';
  }
}

// Get challenge category icon
export function getChallengeIcon(category: ChallengeCategory): string {
  switch (category) {
    case 'sleep': return '🌙';
    case 'social': return '👥';
    case 'activity': return '🏃';
    case 'mindfulness': return '🧘';
    case 'mood': return '💖';
    case 'consistency': return '🔥';
    default: return '⭐';
  }
}
