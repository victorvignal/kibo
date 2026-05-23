/**
 * Tests for Insights Service
 */

jest.mock('firebase/firestore');

import { generateWeeklyInsights, getPersonalizedTip } from '../services/insights';
import { getDocs } from 'firebase/firestore';

function makeMockDoc(id: string, data: Record<string, unknown>, date: Date) {
  return {
    id,
    data: () => ({
      ...data,
      timestamp: { toDate: () => date },
    }),
  };
}

describe('Insights Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateWeeklyInsights', () => {
    test('returns tip to start check-ins when no history exists', async () => {
      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [], empty: true });

      const result = await generateWeeklyInsights('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('tip');
      expect(result[0].title).toBe('Comece seu check-in!');
      expect(result[0].emoji).toBe('💡');
    });

    test('generates mood success insight when avgMood >= 7', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 8, sleep: 7, anxiety: 3, activity: 6, social: 5 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 8, sleep: 7, anxiety: 3, activity: 6, social: 5 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 7, sleep: 7, anxiety: 3, activity: 6, social: 5 }, new Date('2026-05-19')),
        makeMockDoc('c4', { mood: 7, sleep: 7, anxiety: 3, activity: 6, social: 5 }, new Date('2026-05-18')),
        makeMockDoc('c5', { mood: 7, sleep: 7, anxiety: 3, activity: 6, social: 5 }, new Date('2026-05-17')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      const moodInsights = result.filter(i => i.title === 'Humor em alta!');
      expect(moodInsights.length).toBeGreaterThan(0);
      expect(moodInsights[0].type).toBe('success');
      expect(moodInsights[0].emoji).toBe('😊');
    });

    test('generates mood warning insight when avgMood < 4', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 3, sleep: 5, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 3, sleep: 5, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 3, sleep: 5, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-19')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      const moodInsights = result.filter(i => i.title === 'Humor em baixa');
      expect(moodInsights.length).toBeGreaterThan(0);
      expect(moodInsights[0].type).toBe('warning');
    });

    test('generates sleep success insight when avgSleep >= 7', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 5, sleep: 8, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 5, sleep: 7, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 5, sleep: 7, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-19')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      const sleepInsights = result.filter(i => i.title === 'Sono de qualidade!');
      expect(sleepInsights.length).toBeGreaterThan(0);
      expect(sleepInsights[0].type).toBe('success');
      expect(sleepInsights[0].emoji).toBe('😴');
    });

    test('generates sleep warning insight when avgSleep < 5', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 5, sleep: 3, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 5, sleep: 4, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 5, sleep: 4, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-19')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      const sleepInsights = result.filter(i => i.title === 'Sono precisa melhorar');
      expect(sleepInsights.length).toBeGreaterThan(0);
      expect(sleepInsights[0].type).toBe('warning');
    });

    test('generates anxiety warning insight when avgAnxiety >= 7', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 5, sleep: 5, anxiety: 8, activity: 5, social: 5 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 5, sleep: 5, anxiety: 7, activity: 5, social: 5 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 5, sleep: 5, anxiety: 7, activity: 5, social: 5 }, new Date('2026-05-19')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      const anxietyInsights = result.filter(i => i.title === 'Ansiedade elevada');
      expect(anxietyInsights.length).toBeGreaterThan(0);
      expect(anxietyInsights[0].type).toBe('warning');
    });

    test('generates anxiety success insight when avgAnxiety <= 3', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 5, sleep: 5, anxiety: 2, activity: 5, social: 5 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 5, sleep: 5, anxiety: 3, activity: 5, social: 5 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 5, sleep: 5, anxiety: 2, activity: 5, social: 5 }, new Date('2026-05-19')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      const anxietyInsights = result.filter(i => i.title === 'Ansiedade controlada');
      expect(anxietyInsights.length).toBeGreaterThan(0);
      expect(anxietyInsights[0].type).toBe('success');
    });

    test('generates activity success insight when avgActivity >= 7', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 5, sleep: 5, anxiety: 5, activity: 8, social: 5 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 5, sleep: 5, anxiety: 5, activity: 7, social: 5 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 5, sleep: 5, anxiety: 5, activity: 7, social: 5 }, new Date('2026-05-19')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      const activityInsights = result.filter(i => i.title === 'Muito ativo!');
      expect(activityInsights.length).toBeGreaterThan(0);
      expect(activityInsights[0].type).toBe('success');
    });

    test('generates activity tip insight when avgActivity < 4', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 5, sleep: 5, anxiety: 5, activity: 3, social: 5 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 5, sleep: 5, anxiety: 5, activity: 2, social: 5 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 5, sleep: 5, anxiety: 5, activity: 3, social: 5 }, new Date('2026-05-19')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      const activityInsights = result.filter(i => i.title === 'Mova-se mais');
      expect(activityInsights.length).toBeGreaterThan(0);
      expect(activityInsights[0].type).toBe('tip');
    });

    test('generates social success insight when avgSocial >= 6', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 7 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 6 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 7 }, new Date('2026-05-19')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      const socialInsights = result.filter(i => i.title === 'Socialmente ativo!');
      expect(socialInsights.length).toBeGreaterThan(0);
      expect(socialInsights[0].type).toBe('success');
    });

    test('generates social tip insight when avgSocial < 3', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 2 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 2 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 2 }, new Date('2026-05-19')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      const socialInsights = result.filter(i => i.title === 'Conexões sociais');
      expect(socialInsights.length).toBeGreaterThan(0);
      expect(socialInsights[0].type).toBe('tip');
    });

    test('generates check-in consistency insight when 5+ check-ins', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-19')),
        makeMockDoc('c4', { mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-18')),
        makeMockDoc('c5', { mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-17')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      const consistencyInsights = result.filter(i => i.title === 'Check-ins consistentes');
      expect(consistencyInsights.length).toBeGreaterThan(0);
      expect(consistencyInsights[0].type).toBe('success');
    });

    test('generates check-in reminder insight when < 3 check-ins', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 5 }, new Date('2026-05-21')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      const reminderInsights = result.filter(i => i.title === 'Faça mais check-ins');
      expect(reminderInsights.length).toBeGreaterThan(0);
      expect(reminderInsights[0].type).toBe('tip');
    });

    test('limits results to 4 insights maximum', async () => {
      // All metrics triggered except check-in count
      const mockDocs = [
        makeMockDoc('c1', { mood: 8, sleep: 8, anxiety: 2, activity: 8, social: 8 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 8, sleep: 8, anxiety: 2, activity: 8, social: 8 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 8, sleep: 8, anxiety: 2, activity: 8, social: 8 }, new Date('2026-05-19')),
        makeMockDoc('c4', { mood: 8, sleep: 8, anxiety: 2, activity: 8, social: 8 }, new Date('2026-05-18')),
        makeMockDoc('c5', { mood: 8, sleep: 8, anxiety: 2, activity: 8, social: 8 }, new Date('2026-05-17')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      expect(result.length).toBeLessThanOrEqual(4);
    });

    test('sorts insights by type order (warning first, then success, then tips)', async () => {
      // Mix of all types: warning (mood low), success (sleep good), tip (activity low)
      const mockDocs = [
        makeMockDoc('c1', { mood: 3, sleep: 8, anxiety: 5, activity: 3, social: 5 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 3, sleep: 8, anxiety: 5, activity: 3, social: 5 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 3, sleep: 8, anxiety: 5, activity: 3, social: 5 }, new Date('2026-05-19')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await generateWeeklyInsights('user-123');

      // First insight should be warning type
      const typeOrder = { warning: 0, success: 1, tip: 2 };
      for (let i = 1; i < result.length; i++) {
        expect(typeOrder[result[i - 1].type]).toBeLessThanOrEqual(typeOrder[result[i].type]);
      }
    });

    test('returns fallback insight on error', async () => {
      (getDocs as jest.Mock).mockRejectedValueOnce(new Error('Firestore error'));

      const result = await generateWeeklyInsights('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('tip');
      expect(result[0].title).toBe('Carregando insights...');
    });
  });

  describe('getPersonalizedTip', () => {
    test('returns sleep tip when sleepAvg < 5', () => {
      const tip = getPersonalizedTip(5, 4, 5);
      expect(tip).toContain('Sono');
    });

    test('returns anxiety tip when anxietyAvg > 6', () => {
      const tip = getPersonalizedTip(5, 5, 7);
      expect(tip).toContain('Ansiedade');
    });

    test('returns mood tip when moodAvg < 5', () => {
      const tip = getPersonalizedTip(4, 5, 5);
      expect(tip).toContain('Humor');
    });

    test('returns general tips when all metrics are good', () => {
      const tip = getPersonalizedTip(7, 7, 3);
      // Should contain one of the general tips
      const generalTips = ['Lembre-se', 'Manter-se ativo', 'Conexões sociais'];
      const hasGeneralTip = generalTips.some(g => tip.includes(g));
      expect(hasGeneralTip).toBe(true);
    });

    test('returns one of the applicable tips when multiple conditions apply', () => {
      const tip = getPersonalizedTip(4, 4, 7);
      // All three conditions apply (mood<5, sleep<5, anxiety>6), function randomly picks one
      const applicableTips = ['Sono', 'Ansiedade', 'Humor'];
      const hasApplicableTip = applicableTips.some(t => tip.includes(t));
      expect(hasApplicableTip).toBe(true);
    });
  });
});
