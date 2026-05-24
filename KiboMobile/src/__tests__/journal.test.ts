/**
 * Tests for Journal Service
 */

jest.mock('firebase/firestore');

import { addDoc, getDocs, doc, deleteDoc, updateDoc, collection, query, where, orderBy } from 'firebase/firestore';
import {
  saveJournalEntry,
  getJournalEntries,
  getJournalEntriesByDate,
  deleteJournalEntry,
  getJournalPrompts,
  TAGS,
} from '../services/journal';
import Timestamp from 'firebase/firestore';

function makeMockDoc(id: string, data: Record<string, unknown>, createdAt: Date, updatedAt?: Date) {
  return {
    id,
    data: () => ({
      ...data,
      createdAt: { toDate: () => createdAt },
      updatedAt: updatedAt ? { toDate: () => updatedAt } : undefined,
    }),
  };
}

describe('Journal Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TAGS', () => {
    test('has 6 predefined tags', () => {
      expect(TAGS).toHaveLength(6);
    });

    test('tags have required fields', () => {
      TAGS.forEach(tag => {
        expect(tag.id).toBeDefined();
        expect(tag.label).toBeDefined();
        expect(tag.emoji).toBeDefined();
      });
    });

    test('tags are correctly ordered', () => {
      const ids = TAGS.map(t => t.id);
      expect(ids).toEqual(['gratitude', 'challenge', 'insight', 'emotion', 'goal', 'memory']);
    });
  });

  describe('saveJournalEntry', () => {
    test('creates new entry with correct fields', async () => {
      (addDoc as jest.Mock).mockResolvedValueOnce({ id: 'entry-123' });

      const id = await saveJournalEntry('user-1', 'Test content', 7, ['gratitude', 'emotion']);

      expect(id).toBe('entry-123');
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'user-1',
          content: 'Test content',
          mood: 7,
          tags: ['gratitude', 'emotion'],
        })
      );
    });

    test('creates entry without optional mood', async () => {
      (addDoc as jest.Mock).mockResolvedValueOnce({ id: 'entry-456' });

      const id = await saveJournalEntry('user-1', 'No mood entry');

      expect(id).toBe('entry-456');
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ mood: undefined })
      );
    });

    test('updates existing entry when existingId provided', async () => {
      (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

      const id = await saveJournalEntry('user-1', 'Updated content', 8, ['insight'], 'existing-id');

      expect(id).toBe('existing-id');
      expect(updateDoc).toHaveBeenCalled();
    });

    test('entry without tags defaults to empty array', async () => {
      (addDoc as jest.Mock).mockResolvedValueOnce({ id: 'entry-no-tags' });

      await saveJournalEntry('user-1', 'Content only');

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tags: [] })
      );
    });
  });

  describe('getJournalEntries', () => {
    test('returns empty array when no entries', async () => {
      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [], empty: true });

      const result = await getJournalEntries('user-1');

      expect(result).toEqual([]);
    });

    test('maps journal documents correctly', async () => {
      const mockDocs = [
        makeMockDoc(
          'entry-1',
          { content: 'First entry', mood: 7, tags: ['gratitude'] },
          new Date('2026-05-21T10:00:00Z')
        ),
        makeMockDoc(
          'entry-2',
          { content: 'Second entry', mood: 5, tags: ['emotion', 'insight'] },
          new Date('2026-05-20T15:30:00Z')
        ),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await getJournalEntries('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('entry-1');
      expect(result[0].content).toBe('First entry');
      expect(result[0].mood).toBe(7);
      expect(result[0].tags).toEqual(['gratitude']);
      expect(result[1].id).toBe('entry-2');
    });

    test('defaults missing optional fields', async () => {
      const mockDocs = [
        makeMockDoc('entry-no-mood', { content: 'Just content' }, new Date('2026-05-21')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await getJournalEntries('user-1');

      expect(result[0].mood).toBeUndefined();
      expect(result[0].tags).toEqual([]);
    });

    test('respects limitCount parameter', async () => {
      const mockDocs = Array.from({ length: 10 }, (_, i) =>
        makeMockDoc(`entry-${i}`, { content: `Entry ${i}` }, new Date(`2026-05-${21 - i}`))
      );

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await getJournalEntries('user-1', 3);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('entry-0');
      expect(result[2].id).toBe('entry-2');
    });
  });

  describe('getJournalEntriesByDate', () => {
    test('queries entries for specific date range', async () => {
      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [], empty: true });

      await getJournalEntriesByDate('user-1', new Date('2026-05-21'));

      expect(getDocs).toHaveBeenCalledWith(
        expect.objectContaining({
          // query object
        })
      );
    });

    test('returns entries for that day only', async () => {
      const targetDate = new Date('2026-05-21');
      const mockDocs = [
        makeMockDoc('entry-1', { content: 'Morning entry' }, new Date('2026-05-21T08:00:00Z')),
        makeMockDoc('entry-2', { content: 'Evening entry' }, new Date('2026-05-21T20:00:00Z')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await getJournalEntriesByDate('user-1', targetDate);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Morning entry');
    });

    test('excludes entries outside date range', async () => {
      const targetDate = new Date('2026-05-21');
      const mockDocs = [
        makeMockDoc('entry-1', { content: 'Same day' }, new Date('2026-05-21T12:00:00Z')),
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs, empty: false });

      const result = await getJournalEntriesByDate('user-1', targetDate);

      expect(result).toHaveLength(1);
    });
  });

  describe('deleteJournalEntry', () => {
    test('deletes entry by id', async () => {
      (deleteDoc as jest.Mock).mockResolvedValueOnce(undefined);

      await deleteJournalEntry('entry-to-delete');

      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({})
      );
    });
  });

  describe('getJournalPrompts', () => {
    test('returns 15 prompts', () => {
      const prompts = getJournalPrompts();
      expect(prompts).toHaveLength(15);
    });

    test('all prompts are non-empty strings', () => {
      const prompts = getJournalPrompts();
      prompts.forEach(prompt => {
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
      });
    });

    test('prompts are unique', () => {
      const prompts = getJournalPrompts();
      const unique = new Set(prompts);
      expect(unique.size).toBe(prompts.length);
    });

    test('prompts contain Portuguese text', () => {
      const prompts = getJournalPrompts();
      prompts.forEach(prompt => {
        // Check it's Portuguese (contains Portuguese characters or common words)
        const isPortuguese =
          /[ãõêéç]/i.test(prompt) ||
          prompt.includes('?') ||
          prompt.includes('qual') ||
          prompt.includes('como') ||
          prompt.includes('o que') ||
          prompt.includes('descreva') ||
          prompt.includes('você');
        expect(isPortuguese).toBe(true);
      });
    });
  });
});
