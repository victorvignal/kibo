import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList, RefreshControl } from 'react-native';
import Slider from '@react-native-community/slider';
import { onAuthChange } from '../services/firebase';
import { offlineFirstSaveCheckin } from '../services/offlineService';
import { getCheckinHistory, CheckinData, getMoodTrend } from '../services/checkins';

type Tab = 'checkin' | 'history';

export default function CheckinScreen() {
  const [tab, setTab] = useState<Tab>('checkin');
  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkinHistory, setCheckinHistory] = useState<CheckinData[]>([]);
  const [moodTrend, setMoodTrend] = useState<Array<{ date: string; mood: number }>>([]);
  const [checkin, setCheckin] = useState({
    mood: 5,
    sleep: 5,
    anxiety: 5,
    activity: 5,
    social: 5,
    notes: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        setUserId(user.uid);
        await loadHistory(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadHistory = async (uid: string) => {
    try {
      const history = await getCheckinHistory(uid, 30);
      const trend = await getMoodTrend(uid, 14);
      setCheckinHistory(history);
      setMoodTrend(trend);
    } catch (error) {
      console.warn('Failed to load check-in history:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadHistory(userId);
    setRefreshing(false);
  }, [userId]);

  const handleComplete = async () => {
    try {
      if (userId) {
        // Use offline-first: saves locally first, syncs when online
        const result = await offlineFirstSaveCheckin(userId, {
          mood: checkin.mood,
          sleep: checkin.sleep,
          anxiety: checkin.anxiety,
          activity: checkin.activity,
          social: checkin.social,
          notes: checkin.notes,
        });
        await loadHistory(userId);

        if (result.synced) {
          Alert.alert(
            'Check-in completo! 🎉',
            'Obrigado por compartilhar como você está se sentindo.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Check-in salvo localmente 📱',
            'Sua resposta foi salva e será sincronizada quando você estiver online.',
            [{ text: 'OK' }]
          );
        }
      }
      setStep(0);
      setCheckin({ mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 5, notes: '' });
      setTab('history');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o check-in. Tente novamente.');
    }
  };

  const questions = [
    {
      key: 'mood',
      emoji: '😊',
      title: 'Como está seu humor?',
      subtitle: 'De 1 (muito ruim) a 10 (excelente)',
    },
    {
      key: 'sleep',
      emoji: '😴',
      title: 'Como foi seu sono?',
      subtitle: 'De 1 (muito ruim) a 10 (excelente)',
    },
    {
      key: 'anxiety',
      emoji: '😰',
      title: 'Nível de ansiedade',
      subtitle: 'De 1 (muito baixo) a 10 (muito alto)',
    },
    {
      key: 'activity',
      emoji: '🏃',
      title: 'Nível de atividade física',
      subtitle: 'De 1 (nenhuma) a 10 (muita)',
    },
    {
      key: 'social',
      emoji: '💬',
      title: 'Interação social',
      subtitle: 'De 1 (nenhuma) a 10 (muita)',
    },
  ];

  const currentQuestion = questions[step];

  const getScoreColor = (score: number, inverse = false) => {
    if (inverse) {
      if (score >= 7) return '#DC2626'; // high anxiety = red
      if (score >= 4) return '#D97706'; // medium
      return '#059669'; // low
    }
    if (score >= 7) return '#059669'; // good
    if (score >= 4) return '#D97706'; // medium
    return '#DC2626'; // low
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const renderHistoryItem = ({ item }: { item: CheckinData }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyDate}>{formatDate(item.timestamp)}</Text>
      <View style={styles.historyScores}>
        <View style={styles.historyScore}>
          <Text style={styles.historyEmoji}>😊</Text>
          <Text style={[styles.historyValue, { color: getScoreColor(item.mood) }]}>{item.mood}</Text>
        </View>
        <View style={styles.historyScore}>
          <Text style={styles.historyEmoji}>😴</Text>
          <Text style={[styles.historyValue, { color: getScoreColor(item.sleep) }]}>{item.sleep}</Text>
        </View>
        <View style={styles.historyScore}>
          <Text style={styles.historyEmoji}>😰</Text>
          <Text style={[styles.historyValue, { color: getScoreColor(item.anxiety, true) }]}>{item.anxiety}</Text>
        </View>
        <View style={styles.historyScore}>
          <Text style={styles.historyEmoji}>🏃</Text>
          <Text style={[styles.historyValue, { color: getScoreColor(item.activity) }]}>{item.activity}</Text>
        </View>
        <View style={styles.historyScore}>
          <Text style={styles.historyEmoji}>💬</Text>
          <Text style={[styles.historyValue, { color: getScoreColor(item.social) }]}>{item.social}</Text>
        </View>
      </View>
      {item.notes ? <Text style={styles.historyNotes} numberOfLines={1}>{item.notes}</Text> : null}
    </View>
  );

  const renderTrendChart = () => {
    if (moodTrend.length < 2) return null;
    const maxMood = 10;
    const chartHeight = 60;
    
    return (
      <View style={styles.trendCard}>
        <Text style={styles.trendTitle}>📈 Tendência de Humor (14 dias)</Text>
        <View style={styles.trendChart}>
          {moodTrend.slice(-7).map((point, i) => {
            const height = (point.mood / maxMood) * chartHeight;
            return (
              <View key={point.date} style={styles.trendBar}>
                <View
                  style={[
                    styles.trendBarFill,
                    { height, backgroundColor: getScoreColor(point.mood) }
                  ]}
                />
                <Text style={styles.trendDate}>
                  {new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit' })}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'checkin' && styles.tabActive]}
          onPress={() => setTab('checkin')}
        >
          <Text style={[styles.tabText, tab === 'checkin' && styles.tabTextActive]}>
            ✏️ Novo Check-in
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            📋 Histórico
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'checkin' ? (
        <ScrollView style={styles.scrollView}>
          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((step + 1) / questions.length) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{step + 1} de {questions.length}</Text>
          </View>

          {/* Question Card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionEmoji}>{currentQuestion.emoji}</Text>
            <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
            <Text style={styles.questionSubtitle}>{currentQuestion.subtitle}</Text>

            {/* Slider */}
            <View style={styles.sliderContainer}>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>1</Text>
                <Text style={styles.sliderValue}>{checkin[currentQuestion.key as keyof typeof checkin]}</Text>
                <Text style={styles.sliderLabel}>10</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={checkin[currentQuestion.key as keyof typeof checkin] as number}
                onValueChange={(value) =>
                  setCheckin(prev => ({ ...prev, [currentQuestion.key]: value as number }))
                }
                minimumTrackTintColor="#7C3AED"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#7C3AED"
              />
            </View>

            {/* Emoji scale */}
            <View style={styles.emojiScale}>
              {[1, 3, 5, 7, 10].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.emojiButton,
                    checkin[currentQuestion.key as keyof typeof checkin] === value && styles.emojiButtonActive
                  ]}
                  onPress={() => setCheckin(prev => ({ ...prev, [currentQuestion.key]: value }))}
                >
                  <Text style={styles.emojiButtonText}>
                    {value <= 3 ? '😔' : value <= 6 ? '😐' : value <= 8 ? '😊' : '😄'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Navigation */}
          <View style={styles.navButtons}>
            {step > 0 && (
              <TouchableOpacity
                style={styles.navButtonPrev}
                onPress={() => setStep(prev => prev - 1)}
              >
                <Text style={styles.navButtonPrevText}>Anterior</Text>
              </TouchableOpacity>
            )}

            {step < questions.length - 1 ? (
              <TouchableOpacity
                style={[styles.navButtonNext, step === 0 && styles.navButtonNextFull]}
                onPress={() => setStep(prev => prev + 1)}
              >
                <Text style={styles.navButtonNextText}>Próximo</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navButtonNext, styles.navButtonNextFull]}
                onPress={handleComplete}
              >
                <Text style={styles.navButtonNextText}>Finalizar ✓</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />
          }
        >
          {/* Summary stats */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumo dos últimos 30 dias</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{checkinHistory.length}</Text>
                <Text style={styles.summaryLabel}>Check-ins</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>
                  {checkinHistory.length > 0
                    ? (checkinHistory.reduce((a, c) => a + c.mood, 0) / checkinHistory.length).toFixed(1)
                    : '-'}
                </Text>
                <Text style={styles.summaryLabel}>Humor médio</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>
                  {moodTrend.length >= 7
                    ? (
                        (moodTrend.slice(-1)[0].mood - moodTrend[0].mood) > 0 ? '+' : '') +
                        (moodTrend.slice(-1)[0].mood - moodTrend[0].mood).toFixed(1)
                    : '-'}
                </Text>
                <Text style={styles.summaryLabel}>Mudança</Text>
              </View>
            </View>
          </View>

          {renderTrendChart()}

          {/* History list */}
          <Text style={styles.historyTitle}>Histórico</Text>
          {checkinHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryEmoji}>📋</Text>
              <Text style={styles.emptyHistoryText}>
                Nenhum check-in ainda.{'\n'}Faça seu primeiro check-in!
              </Text>
            </View>
          ) : (
            checkinHistory.map((item) => (
              <View key={item.id}>
                {renderHistoryItem({ item })}
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#7C3AED',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#7C3AED',
  },
  scrollView: {
    flex: 1,
  },
  progressContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  questionCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  questionEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  questionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  sliderContainer: {
    width: '100%',
    marginBottom: 20,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  sliderValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  emojiScale: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButtonActive: {
    backgroundColor: '#F3E8FF',
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  emojiButtonText: {
    fontSize: 24,
  },
  navButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  navButtonPrev: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  navButtonPrevText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  navButtonNext: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
  },
  navButtonNextFull: {
    flex: 2,
  },
  navButtonNextText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // History styles
  summaryCard: {
    margin: 20,
    marginBottom: 10,
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  trendCard: {
    margin: 20,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  trendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    paddingTop: 10,
  },
  trendBar: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  trendBarFill: {
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  trendDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 12,
  },
  historyItem: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    width: 50,
  },
  historyScores: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  historyScore: {
    alignItems: 'center',
  },
  historyEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  historyValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyNotes: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 40,
  },
  emptyHistoryEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
