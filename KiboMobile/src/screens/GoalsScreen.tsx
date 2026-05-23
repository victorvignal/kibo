import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { onAuthChange } from '../services/firebase';
import { getCheckinHistory, CheckinData } from '../services/checkins';
import Slider from '@react-native-community/slider';

/** Calculate streak from check-in history */
function calculateStreak(history: CheckinData[]): number {
  if (history.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = [...history]
    .filter(h => h.timestamp)
    .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());

  let streak = 0;
  for (let i = 0; i < sorted.length; i++) {
    const checkinDate = new Date(sorted[i].timestamp!);
    checkinDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);

    if (checkinDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

interface Goal {
  id: string;
  type: 'sleep' | 'mood' | 'activity' | 'social' | 'checkin';
  label: string;
  emoji: string;
  target: number;
  current: number;
  unit: string;
  period: 'daily' | 'weekly';
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<CheckinData[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        setUserId(user.uid);
        await loadGoals(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadGoals = async (uid: string) => {
    try {
      const history = await getCheckinHistory(uid, 7);
      const today = new Date().toISOString().split('T')[0];
      const todayCheckins = history.filter(h => 
        h.timestamp && h.timestamp.toISOString().split('T')[0] === today
      );

      // Calculate weekly averages
      const weeklyAvg = {
        mood: history.length > 0 ? history.reduce((a, c) => a + c.mood, 0) / history.length : 0,
        sleep: history.length > 0 ? history.reduce((a, c) => a + c.sleep, 0) / history.length : 0,
        activity: history.length > 0 ? history.reduce((a, c) => a + c.activity, 0) / history.length : 0,
        social: history.length > 0 ? history.reduce((a, c) => a + c.social, 0) / history.length : 0,
      };

      setGoals([
        {
          id: 'sleep',
          type: 'sleep',
          label: 'Qualidade do Sono',
          emoji: '😴',
          target: 7,
          current: weeklyAvg.sleep,
          unit: '/10',
          period: 'weekly',
        },
        {
          id: 'mood',
          type: 'mood',
          label: 'Humor Geral',
          emoji: '😊',
          target: 7,
          current: weeklyAvg.mood,
          unit: '/10',
          period: 'weekly',
        },
        {
          id: 'activity',
          type: 'activity',
          label: 'Atividade Física',
          emoji: '🏃',
          target: 7,
          current: weeklyAvg.activity,
          unit: '/10',
          period: 'weekly',
        },
        {
          id: 'social',
          type: 'social',
          label: 'Interação Social',
          emoji: '💬',
          target: 6,
          current: weeklyAvg.social,
          unit: '/10',
          period: 'weekly',
        },
        {
          id: 'checkin',
          type: 'checkin',
          label: 'Check-ins',
          emoji: '📋',
          target: 7,
          current: todayCheckins.length > 0 ? 1 : 0,
          unit: '/dia',
          period: 'daily',
        },
      ]);

      // Calculate streak
      const streakCalc = calculateStreak(history);
      setStreak(streakCalc);
      setHistory(history);
    } catch (error) {
      console.warn('Failed to load goals:', error);
    }
  };

  const updateGoal = (id: string, newTarget: number) => {
    setGoals(prev => prev.map(g => 
      g.id === id ? { ...g, target: newTarget } : g
    ));
    setEditingGoal(null);
  };

  const getProgress = (goal: Goal) => {
    if (goal.type === 'checkin') {
      return goal.current >= 1 ? 100 : 0;
    }
    return Math.min(100, (goal.current / goal.target) * 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#059669';
    if (progress >= 60) return '#D97706';
    return '#DC2626';
  };

  const getMotivationMessage = (goal: Goal) => {
    const progress = getProgress(goal);
    if (progress >= 100) return '🎉 Meta alcançada!';
    if (progress >= 75) return '🔥 Quase lá!';
    if (progress >= 50) return '💪 Continua assim!';
    if (progress >= 25) return '🚀 Vamos começar!';
    return '🌱 Comece hoje!';
  };

  const goalTips: Record<string, string> = {
    sleep: 'Estabeleça horários fixos para dormir e acordar, mesmo nos fins de semana.',
    mood: 'Pratique atividades que você gosta todos os dias, mesmo que por poucos minutos.',
    activity: 'Comece com 15 minutos de caminhada diária e aumente gradualmente.',
    social: 'Tente pelo menos uma conversa significativa por dia, mesmo que breve.',
    checkin: 'Reserve um momento do seu dia para reflectir sobre como você está se sentindo.',
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Suas Metas</Text>
        <Text style={styles.subtitle}>Acompanhe seu progresso de bem-estar</Text>
      </View>

      {/* Daily Focus */}
      <View style={styles.focusCard}>
        <Text style={styles.focusTitle}>Foco de Hoje</Text>
        <View style={styles.focusGrid}>
          {goals
            .filter(g => g.period === 'daily')
            .map(goal => {
              const progress = getProgress(goal);
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.focusItem}
                  onPress={() => {
                    setEditingGoal(goal.id);
                    setEditValue(goal.target);
                  }}
                >
                  <Text style={styles.focusEmoji}>{goal.emoji}</Text>
                  <Text style={styles.focusValue}>
                    {goal.current >= 1 ? '✓' : '○'}
                  </Text>
                  <Text style={styles.focusLabel}>{goal.label}</Text>
                </TouchableOpacity>
              );
            })}
        </View>
      </View>

      {/* Weekly Goals */}
      <Text style={styles.sectionTitle}>Metas da Semana</Text>
      
      {goals
        .filter(g => g.period === 'weekly')
        .map(goal => {
          const progress = getProgress(goal);
          const isEditing = editingGoal === goal.id;
          
          return (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={styles.goalTitleRow}>
                  <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                  <View>
                    <Text style={styles.goalLabel}>{goal.label}</Text>
                    <Text style={styles.goalMotivation}>{getMotivationMessage(goal)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setEditingGoal(goal.id);
                    setEditValue(goal.target);
                  }}
                >
                  <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>
              </View>

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress}%`,
                        backgroundColor: getProgressColor(progress),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: getProgressColor(progress) }]}>
                  {Math.round(progress)}%
                </Text>
              </View>

              {/* Current / Target */}
              <View style={styles.goalStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {Math.round(goal.current * 10) / 10}
                  </Text>
                  <Text style={styles.statLabel}>Atual</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  {isEditing ? (
                    <View style={styles.editContainer}>
                      <Slider
                        style={styles.editSlider}
                        minimumValue={1}
                        maximumValue={10}
                        step={0.5}
                        value={editValue}
                        onValueChange={setEditValue}
                        minimumTrackTintColor="#7C3AED"
                        maximumTrackTintColor="#E5E7EB"
                        thumbTintColor="#7C3AED"
                      />
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={() => updateGoal(goal.id, editValue)}
                      >
                        <Text style={styles.saveButtonText}>Salvar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.statValue}>{goal.target}</Text>
                      <Text style={styles.statLabel}>Meta {goal.unit}</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Tip */}
              <View style={styles.tipContainer}>
                <Text style={styles.tipIcon}>💡</Text>
                <Text style={styles.tipText}>{goalTips[goal.id]}</Text>
              </View>
            </View>
          );
        })}

      {/* Streak Info */}
      <View style={styles.streakCard}>
        <Text style={styles.streakTitle}>🔥 Sequência de Check-ins</Text>
        <Text style={styles.streakDesc}>
          Manter uma sequência ajuda você a construir hábitos saudáveis de autoconhecimento.
        </Text>
        <View style={styles.streakStats}>
          <Text style={styles.streakValue}>{streak}</Text>
          <Text style={styles.streakLabel}>dias consecutivos</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  focusCard: {
    margin: 20,
    marginTop: 10,
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    padding: 20,
  },
  focusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  focusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  focusItem: {
    alignItems: 'center',
    gap: 4,
  },
  focusEmoji: {
    fontSize: 28,
  },
  focusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  focusLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  goalCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalEmoji: {
    fontSize: 32,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  goalMotivation: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 45,
    textAlign: 'right',
  },
  goalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  editContainer: {
    flex: 1,
    alignItems: 'center',
  },
  editSlider: {
    width: '100%',
    height: 40,
  },
  saveButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
  },
  tipIcon: {
    fontSize: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  streakCard: {
    margin: 20,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  streakDesc: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  streakStats: {
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  streakLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});
