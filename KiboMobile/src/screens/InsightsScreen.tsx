import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Dimensions, TouchableOpacity, Alert,
} from 'react-native';
import { onAuthChange } from '../services/firebase';
import { getCheckinHistory, getMoodTrend, CheckinData } from '../services/checkins';
import { generateWeeklyInsights, WeeklyInsight } from '../services/insights';
import { WellnessCard, WellnessMiniCard } from '../components/WellnessCard';
import SleepAnalysis from '../components/SleepAnalysis';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DayBar {
  date: string;
  dayName: string;
  mood: number;
  sleep: number;
  anxiety: number;
  activity: number;
  social: number;
  hasData: boolean;
}

export default function InsightsScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [weeklyBars, setWeeklyBars] = useState<DayBar[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<CheckinData[]>([]);
  const [moodTrend, setMoodTrend] = useState<Array<{ date: string; mood: number }>>([]);
  const [summary, setSummary] = useState({
    totalCheckins: 0,
    avgMood: 0,
    avgSleep: 0,
    avgAnxiety: 0,
    avgActivity: 0,
    avgSocial: 0,
    streak: 0,
    bestDay: '',
    worstDay: '',
    improvement: 0,
  });

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (user) {
        setUserId(user.uid);
        await loadData(user.uid);
      }
    });
    return () => unsub();
  }, []);

  const loadData = async (uid: string) => {
    try {
      const [history, trend, weeklyInsights] = await Promise.all([
        getCheckinHistory(uid, 30),
        getMoodTrend(uid, 14),
        generateWeeklyInsights(uid),
      ]);

      setMonthlyHistory(history);
      setMoodTrend(trend);
      setInsights(weeklyInsights);

      // Build weekly bars (last 7 days)
      const bars: DayBar[] = [];
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const dayCheckins = history.filter(h => {
          if (!h.timestamp) return false;
          return h.timestamp.toISOString().split('T')[0] === dateKey;
        });

        if (dayCheckins.length > 0) {
          const avg = (key: keyof CheckinData) =>
            dayCheckins.reduce((a, c) => a + ((c[key] as number) || 5), 0) / dayCheckins.length;
          bars.push({
            date: dateKey,
            dayName: dayNames[d.getDay()],
            mood: Math.round(avg('mood') * 10) / 10,
            sleep: Math.round(avg('sleep') * 10) / 10,
            anxiety: Math.round(avg('anxiety') * 10) / 10,
            activity: Math.round(avg('activity') * 10) / 10,
            social: Math.round(avg('social') * 10) / 10,
            hasData: true,
          });
        } else {
          bars.push({
            date: dateKey,
            dayName: dayNames[d.getDay()],
            mood: 0, sleep: 0, anxiety: 0, activity: 0, social: 0,
            hasData: false,
          });
        }
      }
      setWeeklyBars(bars);

      // Summary calculations
      const totals = history.reduce(
        (acc, c) => ({
          mood: acc.mood + c.mood,
          sleep: acc.sleep + c.sleep,
          anxiety: acc.anxiety + c.anxiety,
          activity: acc.activity + c.activity,
          social: acc.social + c.social,
        }),
        { mood: 0, sleep: 0, anxiety: 0, activity: 0, social: 0 }
      );
      const count = history.length || 1;

      // Streak
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

      // Best/worst day (from daily averages)
      const byDate: Record<string, number[]> = {};
      for (const h of history) {
        if (!h.timestamp) continue;
        const key = h.timestamp.toISOString().split('T')[0];
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(h.mood);
      }
      const dailyAvgs = Object.entries(byDate).map(([date, moods]) => ({
        date,
        avg: moods.reduce((a, b) => a + b, 0) / moods.length,
      }));
      dailyAvgs.sort((a, b) => b.avg - a.avg);
      const bestDay = dailyAvgs[0]
        ? new Date(dailyAvgs[0].date).toLocaleDateString('pt-BR', { weekday: 'long' })
        : '-';
      const worstDay = dailyAvgs[dailyAvgs.length - 1]
        ? new Date(dailyAvgs[dailyAvgs.length - 1].date).toLocaleDateString('pt-BR', { weekday: 'long' })
        : '-';

      // Improvement (compare last 7 vs previous 7)
      const recent7 = history.slice(0, Math.min(7, history.length));
      const older7 = history.slice(7, Math.min(14, history.length));
      const recentAvg = recent7.length > 0 ? recent7.reduce((a, c) => a + c.mood, 0) / recent7.length : 0;
      const olderAvg = older7.length > 0 ? older7.reduce((a, c) => a + c.mood, 0) / older7.length : 0;
      const improvement = Math.round((recentAvg - olderAvg) * 10) / 10;

      setSummary({
        totalCheckins: count,
        avgMood: Math.round((totals.mood / count) * 10) / 10,
        avgSleep: Math.round((totals.sleep / count) * 10) / 10,
        avgAnxiety: Math.round((totals.anxiety / count) * 10) / 10,
        avgActivity: Math.round((totals.activity / count) * 10) / 10,
        avgSocial: Math.round((totals.social / count) * 10) / 10,
        streak,
        bestDay,
        worstDay,
        improvement,
      });
    } catch (error) {
      console.warn('Failed to load insights data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadData(userId);
    setRefreshing(false);
  }, [userId]);

  const getBarHeight = (value: number, max: number) => {
    return Math.max(4, (value / max) * 80);
  };

  const getBarColor = (value: number) => {
    if (value >= 7) return '#059669';
    if (value >= 4) return '#D97706';
    if (value > 0) return '#DC2626';
    return '#E5E7EB';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />}
    >
      {/* Summary Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Últimos 30 dias</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>📋</Text>
            <Text style={styles.summaryValue}>{summary.totalCheckins}</Text>
            <Text style={styles.summaryLabel}>Check-ins</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>🔥</Text>
            <Text style={styles.summaryValue}>{summary.streak}</Text>
            <Text style={styles.summaryLabel}>Dias de sequência</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>📈</Text>
            <Text style={[styles.summaryValue, { color: summary.improvement >= 0 ? '#059669' : '#DC2626' }]}>
              {summary.improvement >= 0 ? '+' : ''}{summary.improvement}
            </Text>
            <Text style={styles.summaryLabel}>Mudança (vs. semana anterior)</Text>
          </View>
        </View>
      </View>

      {/* Weekly Mood Bars */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>😊 Humor nos últimos 7 dias</Text>
        <View style={styles.weekChart}>
          {weeklyBars.map((bar, i) => (
            <View key={i} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: bar.hasData ? getBarHeight(bar.mood, 10) : 4,
                      backgroundColor: getBarColor(bar.mood),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, bar.hasData && styles.barLabelActive]}>
                {bar.dayName}
              </Text>
              <Text style={styles.barValue}>{bar.hasData ? bar.mood : '-'}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Metric Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Médias gerais</Text>
        <View style={styles.metricsGrid}>
          <WellnessMiniCard emoji="😊" label="Humor" value={summary.avgMood} trend={summary.improvement > 0 ? 'up' : summary.improvement < 0 ? 'down' : 'stable'} />
          <WellnessMiniCard emoji="😴" label="Sono" value={summary.avgSleep} />
          <WellnessMiniCard emoji="😰" label="Ansiedade" value={summary.avgAnxiety} trend={summary.avgAnxiety > 6 ? 'down' : summary.avgAnxiety < 4 ? 'up' : 'stable'} />
          <WellnessMiniCard emoji="🏃" label="Atividade" value={summary.avgActivity} />
          <WellnessMiniCard emoji="💬" label="Social" value={summary.avgSocial} />
        </View>
      </View>

      {/* Best/Worst Days */}
      {(summary.bestDay || summary.worstDay) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Dias destacados</Text>
          <View style={styles.daysRow}>
            <View style={[styles.dayCard, styles.bestDayCard]}>
              <Text style={styles.dayEmoji}>🌟</Text>
              <Text style={styles.dayTitle}>Melhor dia</Text>
              <Text style={styles.dayValue}>{summary.bestDay}</Text>
            </View>
            <View style={[styles.dayCard, styles.worstDayCard]}>
              <Text style={styles.dayEmoji}>🌧️</Text>
              <Text style={styles.dayTitle}>Dia mais difícil</Text>
              <Text style={styles.dayValue}>{summary.worstDay}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Weekly Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Insights da semana</Text>
          {insights.map((insight, i) => (
            <View
              key={i}
              style={[
                styles.insightCard,
                insight.type === 'success' && styles.insightSuccess,
                insight.type === 'warning' && styles.insightWarning,
                insight.type === 'tip' && styles.insightTip,
              ]}
            >
              <Text style={styles.insightEmoji}>{insight.emoji}</Text>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Sleep Analysis */}
      {monthlyHistory.length > 0 && (
        <View style={styles.section}>
          <SleepAnalysis checkins={monthlyHistory} />
        </View>
      )}

      {/* Mood Calendar (mini) */}
      {monthlyHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📆 Calendário de humor</Text>
          <View style={styles.calendarGrid}>
            {Array.from({ length: 30 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (29 - i));
              const dateKey = d.toISOString().split('T')[0];
              const dayCheckins = monthlyHistory.filter(h => {
                if (!h.timestamp) return false;
                return h.timestamp.toISOString().split('T')[0] === dateKey;
              });
              const avgMood = dayCheckins.length > 0
                ? dayCheckins.reduce((a, c) => a + c.mood, 0) / dayCheckins.length
                : 0;

              return (
                <View
                  key={i}
                  style={[
                    styles.calendarDay,
                    {
                      backgroundColor: avgMood > 0
                        ? `rgba(${avgMood < 4 ? '220,38,38' : avgMood < 7 ? '217,119,6' : '5,150,105'},0.3)`
                        : '#F3F4F6',
                    },
                  ]}
                >
                  <Text style={styles.calendarDayText}>
                    {avgMood > 0 ? Math.round(avgMood) : ''}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.calendarLegend}>
            <Text style={styles.calendarLegendText}>🟥 Baixo  🟧 Médio  🟩 Alto</Text>
          </View>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  weekChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    height: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 80,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    width: 24,
    borderRadius: 6,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 6,
    fontWeight: '600',
  },
  barLabelActive: {
    color: '#374151',
  },
  barValue: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dayCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bestDayCard: {
    borderTopWidth: 3,
    borderTopColor: '#059669',
  },
  worstDayCard: {
    borderTopWidth: 3,
    borderTopColor: '#DC2626',
  },
  dayEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  dayTitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  dayValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  insightSuccess: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#059669',
  },
  insightWarning: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#D97706',
  },
  insightTip: {
    backgroundColor: '#F5F3FF',
    borderLeftColor: '#7C3AED',
  },
  insightEmoji: {
    fontSize: 22,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  insightDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarDay: {
    width: (SCREEN_WIDTH - 40 - 24 - 20) / 7 - 4,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  calendarLegend: {
    marginTop: 8,
    alignItems: 'center',
  },
  calendarLegendText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
