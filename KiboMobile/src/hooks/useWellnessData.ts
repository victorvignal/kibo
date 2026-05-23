import { useState, useEffect, useCallback } from 'react';
import { onAuthChange } from '../services/firebase';
import { getCheckinHistory, getMoodTrend, CheckinData } from '../services/checkins';
import { generateWeeklyInsights, WeeklyInsight } from '../services/insights';

export interface WellnessData {
  mood: number;
  sleep: number;
  anxiety: number;
  activity: number;
  social: number;
  streak: number;
  trend: 'improving' | 'stable' | 'worsening';
  checkinCount: number;
  avgMood: number;
  avgSleep: number;
  avgAnxiety: number;
  avgActivity: number;
  avgSocial: number;
}

export function useWellnessData(userId: string | null) {
  const [data, setData] = useState<WellnessData | null>(null);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      setError(null);

      const [history, trend, weeklyInsights] = await Promise.all([
        getCheckinHistory(uid, 30),
        getMoodTrend(uid, 14),
        generateWeeklyInsights(uid),
      ]);

      if (history.length === 0) {
        setData({
          mood: 0, sleep: 0, anxiety: 0, activity: 0, social: 0,
          streak: 0, trend: 'stable', checkinCount: 0,
          avgMood: 0, avgSleep: 0, avgAnxiety: 0, avgActivity: 0, avgSocial: 0,
        });
        setInsights(weeklyInsights);
        return;
      }

      // Current (last check-in)
      const latest = history[0];

      // Averages
      const avgMood = history.reduce((a, c) => a + c.mood, 0) / history.length;
      const avgSleep = history.reduce((a, c) => a + c.sleep, 0) / history.length;
      const avgAnxiety = history.reduce((a, c) => a + c.anxiety, 0) / history.length;
      const avgActivity = history.reduce((a, c) => a + c.activity, 0) / history.length;
      const avgSocial = history.reduce((a, c) => a + c.social, 0) / history.length;

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

      // Trend direction
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

      setData({
        mood: latest.mood,
        sleep: latest.sleep,
        anxiety: latest.anxiety,
        activity: latest.activity,
        social: latest.social,
        streak,
        trend: trendDirection,
        checkinCount: history.length,
        avgMood: Math.round(avgMood * 10) / 10,
        avgSleep: Math.round(avgSleep * 10) / 10,
        avgAnxiety: Math.round(avgAnxiety * 10) / 10,
        avgActivity: Math.round(avgActivity * 10) / 10,
        avgSocial: Math.round(avgSocial * 10) / 10,
      });

      setInsights(weeklyInsights);
    } catch (err) {
      setError('Erro ao carregar dados de bem-estar');
      console.warn('useWellnessData error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setInsights([]);
      setLoading(false);
      return;
    }
    loadData(userId);
  }, [userId, loadData]);

  return { data, insights, loading, error, refresh: (uid: string) => loadData(uid) };
}
