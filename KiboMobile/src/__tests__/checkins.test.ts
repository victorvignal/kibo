/**
 * Tests for Check-ins Service
 */

jest.mock('firebase/firestore');

import { getCheckinHistory, getWeeklyAverage, getMoodTrend } from '../services/checkins';
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

describe('Check-ins Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCheckinHistory', () => {
    test('returns empty array when no check-ins exist', async () => {
      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [], empty: true });

      const result = await getCheckinHistory('user-123', 30);

      expect(result).toEqual([]);
      expect(getDocs).toHaveBeenCalled();
    });

    test('maps check-in documents correctly', async () => {
      const mockDocs = [
        makeMockDoc(
          'checkin-1',
          { mood: 7, sleep: 8, anxiety: 3, activity: 6, social: 5, notes: 'Good day' },
          new Date('2026-05-21T09:00:00Z')
        ),
        makeMockDoc(
          'checkin-2',
          { mood: 5, sleep: 6, anxiety: 5, activity: 4, social: 3, notes: '' },
          new Date('2026-05-20T09:00:00Z')
        ),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await getCheckinHistory('user-123', 30);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('checkin-1');
      expect(result[0].mood).toBe(7);
      expect(result[0].sleep).toBe(8);
      expect(result[0].anxiety).toBe(3);
      expect(result[0].notes).toBe('Good day');
      expect(result[1].id).toBe('checkin-2');
      expect(result[1].mood).toBe(5);
    });

    test('defaults missing fields to 5', async () => {
      const mockDocs = [
        makeMockDoc('checkin-1', {}, new Date('2026-05-21T09:00:00Z')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await getCheckinHistory('user-123', 30);

      expect(result[0].mood).toBe(5);
      expect(result[0].sleep).toBe(5);
      expect(result[0].anxiety).toBe(5);
      expect(result[0].activity).toBe(5);
      expect(result[0].social).toBe(5);
      expect(result[0].notes).toBe('');
    });
  });

  describe('getWeeklyAverage', () => {
    test('returns zeros when no check-ins', async () => {
      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [], empty: true });

      const result = await getWeeklyAverage('user-123');

      expect(result.mood).toBe(0);
      expect(result.checkinCount).toBe(0);
    });

    test('calculates correct weekly averages', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 6, sleep: 7, anxiety: 4, activity: 5, social: 4 }, new Date('2026-05-21')),
        makeMockDoc('c2', { mood: 8, sleep: 9, anxiety: 2, activity: 6, social: 5 }, new Date('2026-05-20')),
        makeMockDoc('c3', { mood: 7, sleep: 6, anxiety: 5, activity: 4, social: 3 }, new Date('2026-05-19')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await getWeeklyAverage('user-123');

      expect(result.checkinCount).toBe(3);
      expect(result.mood).toBe(7);
      expect(result.sleep).toBe(7.3);
      expect(result.anxiety).toBe(3.7);
      expect(result.activity).toBe(5);
      expect(result.social).toBe(4);
    });
  });

  describe('getMoodTrend', () => {
    test('returns empty array when no check-ins', async () => {
      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [], empty: true });

      const result = await getMoodTrend('user-123', 14);

      expect(result).toEqual([]);
    });

    test('groups multiple check-ins per day and averages mood', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 6 }, new Date('2026-05-21T09:00:00Z')),
        makeMockDoc('c2', { mood: 8 }, new Date('2026-05-21T21:00:00Z')),
        makeMockDoc('c3', { mood: 5 }, new Date('2026-05-20T09:00:00Z')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await getMoodTrend('user-123', 14);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-05-20');
      expect(result[0].mood).toBe(5);
      expect(result[1].date).toBe('2026-05-21');
      expect(result[1].mood).toBe(7);
    });

    test('sorts results by date ascending', async () => {
      const mockDocs = [
        makeMockDoc('c1', { mood: 5 }, new Date('2026-05-18T09:00:00Z')),
        makeMockDoc('c2', { mood: 7 }, new Date('2026-05-20T09:00:00Z')),
        makeMockDoc('c3', { mood: 6 }, new Date('2026-05-19T09:00:00Z')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await getMoodTrend('user-123', 14);

      expect(result[0].date).toBe('2026-05-18');
      expect(result[1].date).toBe('2026-05-19');
      expect(result[2].date).toBe('2026-05-20');
    });
  });
});
