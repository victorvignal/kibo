import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { onAuthChange, getUserProfile, getUnreadNotificationCount } from '../services/firebase';
import { sensorService } from '../services/sensors';
import { getCheckinHistory, getMoodTrend, CheckinData } from '../services/checkins';
import { generateWeeklyInsights, WeeklyInsight } from '../services/insights';
import MoodCalendar from '../components/MoodCalendar';
import ActivityMonitor from '../components/ActivityMonitor';
import { StepActivityCard } from '../components/StepActivityCard';
import { StressLevelCard } from '../components/StressLevelCard';
import TodayCheckinCard from '../components/TodayCheckinCard';
import KiboTipCard from '../components/KiboTipCard';
import InsightsSection from '../components/InsightsSection';
import ChallengesSection from '../components/ChallengesSection';
import QuickActionsGrid from '../components/QuickActionsGrid';
import {
  startConnectivityMonitor,
  getSyncState,
  SyncState,
  syncPendingData,
} from '../services/offlineService';
import { detectCrisisPattern, CrisisWarning } from '../services/crisisPrevention';
import { generateChallenges, Challenge } from '../services/challenges';

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activityLevel, setActivityLevel] = useState(0);
  const [sensorBufferSize, setSensorBufferSize] = useState(0);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sensorOnline, setSensorOnline] = useState(false);
  
  // Real wellness data from Firebase
  const [wellnessData, setWellnessData] = useState({
    mood: 0,
    sleep: 0,
    social: 0,
    streak: 0,
    trend: 'stable' as 'improving' | 'stable' | 'worsening',
    checkinCount: 0,
  });
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [checkinHistory, setCheckinHistory] = useState<CheckinData[]>([]);
  


  // Offline sync status
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'synced',
    pendingCount: 0,
    lastSync: null,
    isOnline: true,
  });

  // Crisis prevention
  const [crisisWarning, setCrisisWarning] = useState<CrisisWarning | null>(null);
  const [crisisBannerVisible, setCrisisBannerVisible] = useState(false);
  const crisisAnimValue = new Animated.Value(0);

  // Challenges
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [recommendedChallengeId, setRecommendedChallengeId] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [syncAnim] = useState(new Animated.Value(0));
  
  const navigation = useNavigation<any>();

  // Load user profile
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUserId(firebaseUser.uid);
        const profile = await getUserProfile(firebaseUser.uid);
        setUser(profile);
        await loadWellnessData(firebaseUser.uid);

        // Detect crisis pattern
        const warning = await detectCrisisPattern(firebaseUser.uid);
        setCrisisWarning(warning);
        if (warning.detected) {
          setCrisisBannerVisible(true);
          Animated.spring(crisisAnimValue, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }).start();
        }

        // Load unread notification count
        try {
          const count = await getUnreadNotificationCount(firebaseUser.uid);
          setUnreadNotifications(count);
        } catch {
          // Notifications collection may not exist yet
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Connectivity + sync status monitor
  useEffect(() => {
    const cleanup = startConnectivityMonitor();

    // Load initial sync state
    getSyncState().then(setSyncState);

    // Poll sync state every 15 seconds
    const syncInterval = setInterval(async () => {
      const state = await getSyncState();
      setSyncState(state);
      // Auto-sync if online and pending items
      if (state.isOnline && state.pendingCount > 0) {
        await syncPendingData();
        const updated = await getSyncState();
        setSyncState(updated);
      }
    }, 15000);

    return () => {
      cleanup();
      clearInterval(syncInterval);
    };
  }, []);

  const loadWellnessData = async (userId: string) => {
    try {
      const history = await getCheckinHistory(userId, 30);
      const trend = await getMoodTrend(userId, 14);

      if (history.length === 0) {
        setWellnessData({
          mood: 0,
          sleep: 0,
          social: 0,
          streak: 0,
          trend: 'stable',
          checkinCount: 0,
        });
        return;
      }

      // Calculate averages
      const avgMood = history.reduce((a, c) => a + c.mood, 0) / history.length;
      const avgSleep = history.reduce((a, c) => a + c.sleep, 0) / history.length;
      const avgSocial = history.reduce((a, c) => a + c.social, 0) / history.length;

      // Calculate streak (consecutive days with checkins)
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sortedHistory = [...history].sort(
        (a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
      );

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

      setWellnessData({
        mood: Math.round(avgMood * 10) / 10,
        sleep: Math.round(avgSleep * 10) / 10,
        social: Math.round(avgSocial * 10) / 10,
        streak,
        trend: trendDirection,
        checkinCount: history.length,
      });

      // Load weekly insights
      const weeklyInsights = await generateWeeklyInsights(userId);
      setInsights(weeklyInsights);
      setCheckinHistory(history);

      // Load challenges
      const { challenges: userChallenges, recommendedChallenge } = await generateChallenges(userId);
      setChallenges(userChallenges);
      setRecommendedChallengeId(recommendedChallenge);
    } catch (error) {
      console.warn('Failed to load wellness data:', error);
    }
  };

  // Poll sensor data every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const level = sensorService.getActivityLevel();
      setActivityLevel(level);
      setSensorBufferSize(sensorService.getBufferCount());
      setSensorOnline(sensorService.getIsTracking());

      const latest = sensorService.getLatestReading();
      if (latest?.location) {
        setLastLocation({
          lat: Math.round(latest.location.latitude * 10000) / 10000,
          lng: Math.round(latest.location.longitude * 10000) / 10000,
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Refresh user profile
    const firebaseUser = await new Promise<any>((resolve) => {
      const unsub = onAuthChange((u) => {
        unsub();
        resolve(u);
      });
    });

    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid);
      setUser(profile);
      await loadWellnessData(firebaseUser.uid);
    }

    // Force sensor data flush
    await sensorService.flushToFirebase();

    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleManualSync = useCallback(async () => {
    if (!syncState.isOnline || syncState.pendingCount === 0) return;
    if (syncState.pendingCount === 0) return;

    // Animate sync indicator
    Animated.loop(
      Animated.timing(syncAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();

    try {
      await syncPendingData();
      const state = await getSyncState();
      setSyncState(state);
    } finally {
      syncAnim.stopAnimation();
      syncAnim.setValue(0);
    }
  }, [syncState]);

  const getTrendIcon = () => {
    switch (wellnessData.trend) {
      case 'improving': return '↑ Melhorando';
      case 'worsening': return '↓ Piorando';
      default: return '→ Estável';
    }
  };

  const getTrendColor = () => {
    switch (wellnessData.trend) {
      case 'improving': return { bg: '#D4EDDA', text: '#155724' };
      case 'worsening': return { bg: '#F8D7DA', text: '#721C24' };
      default: return { bg: '#FFF3CD', text: '#856404' };
    }
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              Olá, {user?.name?.split(' ')[0] || 'Usuário'}! 👋
            </Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          {/* Sync Status Indicator */}
          <TouchableOpacity
            style={[
              styles.syncIndicator,
              syncState.status === 'offline' && styles.syncIndicatorOffline,
              syncState.status === 'pending' && styles.syncIndicatorPending,
            ]}
            onPress={handleManualSync}
            disabled={!syncState.isOnline || syncState.pendingCount === 0}
            activeOpacity={0.7}
          >
            <Animated.View style={[
              styles.syncDot,
              syncState.status === 'offline' && styles.syncDotOffline,
              syncState.status === 'pending' && styles.syncDotPending,
              syncState.status === 'synced' && styles.syncDotSynced,
              syncState.status === 'pending' && {
                transform: [{
                  rotate: syncAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                }],
              },
            ]} />
            <Text style={[
              styles.syncText,
              syncState.status === 'offline' && styles.syncTextOffline,
            ]}>
              {syncState.status === 'offline' ? 'Offline' :
               syncState.status === 'pending' ? `${syncState.pendingCount} pendente${syncState.pendingCount > 1 ? 's' : ''}` :
               'Sincronizado'}
            </Text>
          </TouchableOpacity>
          {/* Unread notification badge */}
          {unreadNotifications > 0 && (
            <TouchableOpacity
              style={styles.notificationBadge}
              onPress={() => navigation.navigate('Chat')}
              activeOpacity={0.7}
            >
              <Text style={styles.notificationBadgeText}>
                🔔 {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Crisis Prevention Banner */}
      {crisisBannerVisible && crisisWarning?.detected && (
        <Animated.View
          style={[
            styles.crisisBanner,
            crisisWarning.severity === 'high' && styles.crisisBannerHigh,
            crisisWarning.severity === 'medium' && styles.crisisBannerMedium,
            {
              transform: [{
                translateY: crisisAnimValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 0],
                }),
              }],
              opacity: crisisAnimValue,
            },
          ]}
        >
          <View style={styles.crisisBannerHeader}>
            <Text style={styles.crisisBannerEmoji}>💜</Text>
            <Text style={styles.crisisBannerTitle}>Kibo está com você</Text>
          </View>
          <Text style={styles.crisisBannerMessage}>{crisisWarning.personalizedMessage}</Text>
          <View style={styles.crisisBannerActions}>
            {crisisWarning.copingStrategies.slice(0, 2).map((strategy) => (
              <TouchableOpacity
                key={strategy.id}
                style={styles.crisisActionChip}
                onPress={() => {
                  if (strategy.screenNavigate) {
                    navigation.navigate(strategy.screenNavigate);
                  } else {
                    navigation.navigate('Chat');
                  }
                }}
              >
                <Text style={styles.crisisActionChipText}>{strategy.emoji} {strategy.actionLabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.crisisDismissButton}
            onPress={() => setCrisisBannerVisible(false)}
          >
            <Text style={styles.crisisDismissText}>Minimizar</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Sensor Status Card */}
      <View style={styles.sensorCard}>
        <View style={styles.sensorHeader}>
          <Text style={styles.sensorTitle}>📡 Sensores Ativos</Text>
          <View style={[styles.sensorBadge, !sensorOnline && styles.sensorBadgeOffline]}>
            <View style={[styles.sensorDot, !sensorOnline && styles.sensorDotOffline]} />
            <Text style={[styles.sensorBadgeText, !sensorOnline && styles.sensorBadgeTextOffline]}>
              {sensorOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <View style={styles.sensorGrid}>
          <View style={styles.sensorItem}>
            <Text style={styles.sensorEmoji}>🏃</Text>
            <Text style={styles.sensorValue}>{activityLevel}%</Text>
            <Text style={styles.sensorLabel}>Atividade</Text>
          </View>
          <View style={styles.sensorItem}>
            <Text style={styles.sensorEmoji}>📶</Text>
            <Text style={styles.sensorValue}>{sensorBufferSize}</Text>
            <Text style={styles.sensorLabel}>Buffer</Text>
          </View>
          <View style={styles.sensorItem}>
            <Text style={styles.sensorEmoji}>📍</Text>
            <Text style={styles.sensorValueSmall}>
              {lastLocation ? `${lastLocation.lat}, ${lastLocation.lng}` : '...'}
            </Text>
            <Text style={styles.sensorLabel}>Localização</Text>
          </View>
        </View>
      </View>

      {/* Real-time Activity Monitor */}
      <ActivityMonitor />

      {/* Step Counter & Activity Card */}
      <StepActivityCard />

      {/* Stress Level Detection */}
      <StressLevelCard />

      {/* Streak Card */}
      <View style={styles.streakCard}>
        <View style={styles.streakContent}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View>
            <Text style={styles.streakNumber}>{wellnessData.streak} dias</Text>
            <Text style={styles.streakLabel}>Sequência de check-ins</Text>
          </View>
        </View>
        <View style={[styles.trendBadge, { backgroundColor: getTrendColor().bg }]}>
          <Text style={[styles.trendText, { color: getTrendColor().text }]}>
            {getTrendIcon()}
          </Text>
        </View>
      </View>

      {/* Today's Check-in Card */}
      <TodayCheckinCard
        todayCheckin={checkinHistory.find(h => {
          if (!h.timestamp) return false;
          const d = new Date(h.timestamp);
          const today = new Date();
          return d.toDateString() === today.toDateString();
        }) || null}
        onCheckinPress={() => navigation.navigate('Checkin')}
        onColorCheckinPress={() => navigation.navigate('ColorCheckin')}
      />

      {/* Kibo Tip */}
      <KiboTipCard />

      {/* Weekly Insights */}
      <InsightsSection insights={insights} />

      {/* Challenges Section */}
      <ChallengesSection
        challenges={challenges}
        recommendedChallengeId={recommendedChallengeId}
      />

      {/* Quick Actions */}
      <QuickActionsGrid onNavigate={(screen) => navigation.navigate(screen)} />

      {/* Stats Summary */}
      <View style={styles.statsSummary}>
        <Text style={styles.statsSummaryText}>
          📊 {wellnessData.checkinCount} check-ins nos últimos 30 dias
        </Text>
      </View>

      {/* Mood Calendar */}
      {checkinHistory.length > 0 && (
        <MoodCalendar checkins={checkinHistory} />
      )}

      {/* Quick Mood Button */}
      <TouchableOpacity
        style={styles.quickMoodButton}
        onPress={() => navigation.navigate('ColorCheckin')}
        activeOpacity={0.8}
      >
        <Text style={styles.quickMoodEmoji}>🎨</Text>
        <View style={styles.quickMoodContent}>
          <Text style={styles.quickMoodTitle}>Check-in Emocional</Text>
          <Text style={styles.quickMoodSubtitle}>Registre como se sente por cores</Text>
        </View>
        <Text style={styles.quickMoodArrow}>→</Text>
      </TouchableOpacity>

      {/* Spacer */}
      <View style={{ height: 30 }} />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  // Sync indicator
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
    marginTop: 4,
  },
  syncIndicatorOffline: {
    backgroundColor: '#FEE2E2',
  },
  syncIndicatorPending: {
    backgroundColor: '#FEF3C7',
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  syncDotSynced: {
    backgroundColor: '#22C55E',
  },
  syncDotOffline: {
    backgroundColor: '#EF4444',
  },
  syncDotPending: {
    backgroundColor: '#F59E0B',
  },
  syncText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  syncTextOffline: {
    color: '#DC2626',
  },
  // Notification badge
  notificationBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 4,
    marginLeft: 6,
  },
  notificationBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Crisis banner
  crisisBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  crisisBannerHigh: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  crisisBannerMedium: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  crisisBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  crisisBannerEmoji: {
    fontSize: 22,
  },
  crisisBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  crisisBannerMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  crisisBannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  crisisActionChip: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  crisisActionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  crisisDismissButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  crisisDismissText: {
    fontSize: 12,
    color: '#6B7280',
  },
  sensorCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 16,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sensorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E7FF',
  },
  sensorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  sensorBadgeOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  sensorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  sensorDotOffline: {
    backgroundColor: '#EF4444',
  },
  sensorBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  sensorBadgeTextOffline: {
    color: '#EF4444',
  },
  sensorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sensorItem: {
    alignItems: 'center',
  },
  sensorEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  sensorValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sensorValueSmall: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sensorLabel: {
    fontSize: 10,
    color: '#A5B4FC',
    marginTop: 2,
  },
  streakCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakEmoji: {
    fontSize: 40,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  streakLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  trendBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  emptyState: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  scoresGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreEmoji: {
    fontSize: 32,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'right',
  },
  tipCard: {
    margin: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipEmoji: {
    fontSize: 20,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
  },
  tipText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionEmoji: {
    fontSize: 28,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  statsSummary: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  statsSummaryText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  quickMoodButton: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  quickMoodEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  quickMoodContent: {
    flex: 1,
  },
  quickMoodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  quickMoodSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  quickMoodArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  modalEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  modalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7C3AED',
    marginBottom: 20,
  },
  modalSlider: {
    width: '100%',
    height: 40,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalSave: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Insights styles
  insightsContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
  },
  insightSuccess: {
    backgroundColor: '#D4EDDA',
    borderLeftColor: '#059669',
  },
  insightWarning: {
    backgroundColor: '#FFF3CD',
    borderLeftColor: '#D97706',
  },
  insightTip: {
    backgroundColor: '#F3E8FF',
    borderLeftColor: '#7C3AED',
  },
  insightEmoji: {
    fontSize: 24,
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
  // Challenges styles
  challengesScroll: {
    paddingHorizontal: 20,
  },
  challengesRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
  },
  challengeCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  challengeCardCompleted: {
    opacity: 0.7,
  },
  challengeCardRecommended: {
    backgroundColor: '#F3E8FF',
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeEmoji: {
    fontSize: 32,
  },
  recommendedBadge: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 12,
  },
  challengeProgress: {
    marginBottom: 8,
  },
  challengeProgressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  challengeProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  challengeProgressText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
  },
  completedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D4EDDA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  challengeInsight: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
