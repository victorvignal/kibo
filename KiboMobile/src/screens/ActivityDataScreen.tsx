import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl, TouchableOpacity
} from 'react-native';
import { onAuthChange } from '../services/firebase';
import { sensorAnalysisService } from '../services/sensorAnalysis';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ActivityInterval {
  startTime: Date;
  endTime: Date;
  avgMagnitude: number;
  steps: number;
  activityType: string;
}

export default function ActivityDataScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any>(null);
  const [activityHistory, setActivityHistory] = useState<ActivityInterval[]>([]);
  const [todayStats, setTodayStats] = useState({
    totalSteps: 0,
    avgActivityLevel: 0,
    activeMinutes: 0,
    stationaryMinutes: 0,
  });

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (user) {
        setUserId(user.uid);
        loadData();
      }
    });
    return () => unsub();
  }, []);

  const loadData = () => {
    const activity = sensorAnalysisService.getCurrentActivity();
    const recent = sensorAnalysisService.getRecentActivity(60);
    const history = sensorAnalysisService.getActivityHistory(5);

    setCurrentActivity(activity);
    setRecentActivity(recent);
    setActivityHistory(history);

    // Calculate today's stats
    const todayHistory = history.filter(h => {
      const today = new Date();
      return h.startTime.toDateString() === today.toDateString();
    });

    const activeIntervals = todayHistory.filter(h => h.activityType !== 'stationary');
    const stationaryIntervals = todayHistory.filter(h => h.activityType === 'stationary');

    const totalStepsFromHistory = todayHistory.reduce((sum, h) => sum + h.steps, 0);
    const avgActivity = todayHistory.length > 0
      ? Math.round(todayHistory.reduce((sum, h) => sum + h.avgMagnitude, 0) / todayHistory.length * 100) / 100
      : 1;

    setTodayStats({
      totalSteps: totalStepsFromHistory || recent.steps,
      avgActivityLevel: Math.round((avgActivity - 1) * 200),
      activeMinutes: activeIntervals.length * 5,
      stationaryMinutes: stationaryIntervals.length * 5,
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getActivityEmoji = (type: string) => {
    switch (type) {
      case 'walking': return '🚶';
      case 'running': return '🏃';
      case 'stationary': return '🧘';
      case 'cycling': return '🚴';
      default: return '❓';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'walking': return '#059669';
      case 'running': return '#DC2626';
      case 'stationary': return '#6B7280';
      case 'cycling': return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'walking': return 'Caminhando';
      case 'running': return 'Correndo';
      case 'stationary': return 'Parado';
      case 'cycling': return 'Pedalando';
      default: return 'Desconhecido';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />
      }
    >
      {/* Current Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Atividade Atual</Text>
        <View style={styles.currentCard}>
          <View style={styles.currentMain}>
            <Text style={styles.currentEmoji}>
              {getActivityEmoji(currentActivity?.type || 'unknown')}
            </Text>
            <View style={styles.currentInfo}>
              <Text style={[styles.currentType, {
                color: getActivityColor(currentActivity?.type || 'unknown')
              }]}>
                {getActivityLabel(currentActivity?.type || 'unknown')}
              </Text>
              <Text style={styles.currentConfidence}>
                Confiança: {currentActivity ? Math.round(currentActivity.confidence * 100) : 0}%
              </Text>
            </View>
          </View>

          <View style={styles.currentStats}>
            <View style={styles.currentStat}>
              <Text style={styles.currentStatValue}>{currentActivity?.steps || 0}</Text>
              <Text style={styles.currentStatLabel}>passos sessão</Text>
            </View>
            <View style={styles.currentStat}>
              <Text style={styles.currentStatValue}>{currentActivity?.cadence || 0}</Text>
              <Text style={styles.currentStatLabel}>passos/min</Text>
            </View>
            <View style={styles.currentStat}>
              <Text style={styles.currentStatValue}>
                {currentActivity?.duration ? Math.round(currentActivity.duration / 60000) : 0}m
              </Text>
              <Text style={styles.currentStatLabel}>duração</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Today's Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Resumo de Hoje</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>👣</Text>
            <Text style={styles.summaryValue}>{todayStats.totalSteps}</Text>
            <Text style={styles.summaryLabel}>passos</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>⚡</Text>
            <Text style={styles.summaryValue}>{todayStats.avgActivityLevel}%</Text>
            <Text style={styles.summaryLabel}>nível ativo</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>🏃</Text>
            <Text style={styles.summaryValue}>{todayStats.activeMinutes}m</Text>
            <Text style={styles.summaryLabel}>ativo</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>🧘</Text>
            <Text style={styles.summaryValue}>{todayStats.stationaryMinutes}m</Text>
            <Text style={styles.summaryLabel}>parado</Text>
          </View>
        </View>
      </View>

      {/* Activity History Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Histórico de Atividade (24h)</Text>
        {activityHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>
              Dados de atividade serão coletados conforme você usa o app.
              {'\n'}
              Fique com o app aberto ou em segundo plano para coletar dados.
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {activityHistory.map((interval, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <Text style={styles.timelineTime}>
                    {formatTime(interval.startTime)}
                  </Text>
                  <Text style={styles.timelineSteps}>
                    {interval.steps > 0 ? `+${interval.steps} passos` : ''}
                  </Text>
                </View>

                <View style={styles.timelineCenter}>
                  <View style={[
                    styles.timelineDot,
                    { backgroundColor: getActivityColor(interval.activityType) }
                  ]} />
                  {index < activityHistory.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>

                <View style={styles.timelineRight}>
                  <View style={styles.timelineCard}>
                    <Text style={styles.timelineEmoji}>
                      {getActivityEmoji(interval.activityType)}
                    </Text>
                    <View style={styles.timelineInfo}>
                      <Text style={[styles.timelineType, {
                        color: getActivityColor(interval.activityType)
                      }]}>
                        {getActivityLabel(interval.activityType)}
                      </Text>
                      <Text style={styles.timelineMagnitude}>
                        {interval.avgMagnitude.toFixed(2)}g avg
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Activity Guide */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📖 Guia de Atividades</Text>
        <View style={styles.guideCard}>
          {[
            { emoji: '🧘', type: 'stationary', color: '#6B7280', desc: 'Parado ou sentado. Magnitude ~1.0g com baixa variação.' },
            { emoji: '🚶', type: 'walking', color: '#059669', desc: 'Caminhando. Magnitude variável, cadência 40-130 passos/min.' },
            { emoji: '🏃', type: 'running', color: '#DC2626', desc: 'Correndo. Alta variação de magnitude, cadência >130 passos/min.' },
            { emoji: '🚴', type: 'cycling', color: '#3B82F6', desc: 'Pedalando. Magnitude estável ~1.0g, movimento rítmico.' },
          ].map((item) => (
            <View key={item.type} style={styles.guideItem}>
              <View style={[styles.guideDot, { backgroundColor: item.color }]} />
              <Text style={styles.guideEmoji}>{item.emoji}</Text>
              <View style={styles.guideInfo}>
                <Text style={[styles.guideType, { color: item.color }]}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
                <Text style={styles.guideDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
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
  section: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  currentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currentMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  currentEmoji: {
    fontSize: 56,
  },
  currentInfo: {
    flex: 1,
  },
  currentType: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  currentConfidence: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  currentStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  currentStat: {
    alignItems: 'center',
  },
  currentStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  currentStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: (SCREEN_WIDTH - 40 - 30) / 2,
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
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  timeline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  timelineLeft: {
    width: 60,
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  timelineSteps: {
    fontSize: 10,
    color: '#059669',
    marginTop: 2,
  },
  timelineCenter: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 30,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 4,
  },
  timelineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineEmoji: {
    fontSize: 20,
  },
  timelineInfo: {
    flex: 1,
  },
  timelineType: {
    fontSize: 14,
    fontWeight: '600',
  },
  timelineMagnitude: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  guideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  guideDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  guideEmoji: {
    fontSize: 20,
  },
  guideInfo: {
    flex: 1,
  },
  guideType: {
    fontSize: 14,
    fontWeight: '600',
  },
  guideDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
