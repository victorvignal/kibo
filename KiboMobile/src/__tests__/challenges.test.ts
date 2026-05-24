/**
 * Tests for Challenges Service
 */

jest.mock('../services/checkins');

import { getCheckinHistory } from '../services/checkins';
import {
  generateChallenges,
  getChallengeColor,
  getChallengeIcon,
} from '../services/challenges';

function makeCheckin(overrides: Partial<{
  mood: number;
  sleep: number;
  anxiety: number;
  activity: number;
  social: number;
  timestamp: Date;
}> = {}) {
  return {
    mood: 5,
    sleep: 5,
    anxiety: 5,
    activity: 5,
    social: 5,
    timestamp: new Date('2026-05-21T09:00:00Z'),
    ...overrides,
  };
}

describe('Challenges Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateChallenges', () => {
    test('returns 6 challenges', async () => {
      (getCheckinHistory as jest.Mock).mockResolvedValueOnce([]);

      const result = await generateChallenges('user-1');

      expect(result.challenges).toHaveLength(6);
    });

    test('returns empty history with no check-ins', async () => {
      (getCheckinHistory as jest.Mock).mockResolvedValueOnce([]);

      const result = await generateChallenges('user-1');

      // Should generate challenges with zero progress
      const consistencyChallenge = result.challenges.find(c => c.category === 'consistency');
      expect(consistencyChallenge?.currentProgress).toBe(0);
    });

    test('calculates streak from consecutive check-ins', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      (getCheckinHistory as jest.Mock).mockResolvedValueOnce([
        makeCheckin({ timestamp: today }),
        makeCheckin({ timestamp: yesterday }),
        makeCheckin({ timestamp: twoDaysAgo }),
      ]);

      const result = await generateChallenges('user-1');

      const consistencyChallenge = result.challenges.find(c => c.id === 'challenge_consistency_14days');
      expect(consistencyChallenge?.currentProgress).toBe(3);
      expect(consistencyChallenge?.progressPercent).toBe(Math.round((3 / 14) * 100));
    });

    test('recommends lowest-scoring non-completed challenge', async () => {
      // User has low mood, low social, medium sleep
      (getCheckinHistory as jest.Mock).mockResolvedValueOnce([
        makeCheckin({ mood: 3, social: 4, sleep: 5, activity: 7, anxiety: 3 }),
        makeCheckin({ mood: 3, social: 4, sleep: 5, activity: 7, anxiety: 3 }),
        makeCheckin({ mood: 3, social: 4, sleep: 5, activity: 7, anxiety: 3 }),
        makeCheckin({ mood: 3, social: 4, sleep: 5, activity: 7, anxiety: 3 }),
        makeCheckin({ mood: 3, social: 4, sleep: 5, activity: 7, anxiety: 3 }),
        makeCheckin({ mood: 3, social: 4, sleep: 5, activity: 7, anxiety: 3 }),
        makeCheckin({ mood: 3, social: 4, sleep: 5, activity: 7, anxiety: 3 }),
      ]);

      const result = await generateChallenges('user-1');

      // mood score = 3, social score = 4 → mood is lowest → recommended
      expect(result.recommendedChallenge).toBe('challenge_mood_7days');
    });

    test('does not recommend completed challenges', async () => {
      // User has high mood (≥7) - mood challenge would be completed
      (getCheckinHistory as jest.Mock).mockResolvedValueOnce(
        Array.from({ length: 7 }, () => makeCheckin({ mood: 8, social: 3 }))
      );

      const result = await generateChallenges('user-1');

      // mood should be completed, so recommendation should be social (next lowest)
      expect(result.recommendedChallenge).not.toBe('challenge_mood_7days');
    });

    test('marks completedToday true when checkin exists today', async () => {
      const today = new Date();
      today.setHours(9, 0, 0, 0);

      (getCheckinHistory as jest.Mock).mockResolvedValueOnce([
        makeCheckin({ timestamp: today }),
      ]);

      const result = await generateChallenges('user-1');

      expect(result.completedToday).toBe(true);
    });

    test('marks completedToday false when no checkin today', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (getCheckinHistory as jest.Mock).mockResolvedValueOnce([
        makeCheckin({ timestamp: yesterday }),
      ]);

      const result = await generateChallenges('user-1');

      expect(result.completedToday).toBe(false);
    });

    test('sleep challenge with low sleep score generates insight', async () => {
      (getCheckinHistory as jest.Mock).mockResolvedValueOnce([
        makeCheckin({ sleep: 4 }),
        makeCheckin({ sleep: 4 }),
      ]);

      const result = await generateChallenges('user-1');

      const sleepChallenge = result.challenges.find(c => c.category === 'sleep');
      expect(sleepChallenge?.insight).toContain('sono');
    });

    test('all challenges have required fields', async () => {
      (getCheckinHistory as jest.Mock).mockResolvedValueOnce([]);

      const result = await generateChallenges('user-1');

      result.challenges.forEach(challenge => {
        expect(challenge.id).toBeDefined();
        expect(challenge.title).toBeDefined();
        expect(challenge.description).toBeDefined();
        expect(challenge.emoji).toBeDefined();
        expect(challenge.category).toBeDefined();
        expect(challenge.targetDays).toBeGreaterThan(0);
        expect(challenge.currentProgress).toBeGreaterThanOrEqual(0);
        expect(challenge.progressPercent).toBeGreaterThanOrEqual(0);
        expect(challenge.status).toMatch(/^(active|completed|locked|available)$/);
        expect(challenge.reward).toBeDefined();
        expect(challenge.insight).toBeDefined();
      });
    });

    test('consistency challenge has 14-day target', async () => {
      (getCheckinHistory as jest.Mock).mockResolvedValueOnce([]);

      const result = await generateChallenges('user-1');

      const consistency = result.challenges.find(c => c.category === 'consistency');
      expect(consistency?.targetDays).toBe(14);
    });

    test('all other challenges have 7-day target', async () => {
      (getCheckinHistory as jest.Mock).mockResolvedValueOnce([]);

      const result = await generateChallenges('user-1');

      const nonConsistency = result.challenges.filter(c => c.category !== 'consistency');
      nonConsistency.forEach(c => {
        expect(c.targetDays).toBe(7);
      });
    });
  });

  describe('getChallengeColor', () => {
    test('returns color for each category', () => {
      expect(getChallengeColor('sleep')).toBe('#6366F1');
      expect(getChallengeColor('social')).toBe('#10B981');
      expect(getChallengeColor('activity')).toBe('#F59E0B');
      expect(getChallengeColor('mindfulness')).toBe('#8B5CF6');
      expect(getChallengeColor('mood')).toBe('#EC4899');
      expect(getChallengeColor('consistency')).toBe('#EF4444');
    });

    test('returns default for unknown category', () => {
      expect(getChallengeColor('unknown' as any)).toBe('#6B7280');
    });
  });

  describe('getChallengeIcon', () => {
    test('returns emoji for each category', () => {
      expect(getChallengeIcon('sleep')).toBe('🌙');
      expect(getChallengeIcon('social')).toBe('👥');
      expect(getChallengeIcon('activity')).toBe('🏃');
      expect(getChallengeIcon('mindfulness')).toBe('🧘');
      expect(getChallengeIcon('mood')).toBe('💖');
      expect(getChallengeIcon('consistency')).toBe('🔥');
    });

    test('returns default for unknown category', () => {
      expect(getChallengeIcon('unknown' as any)).toBe('⭐');
    });
  });
});
