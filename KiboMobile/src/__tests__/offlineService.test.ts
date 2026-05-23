/**
 * Tests for Offline Service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: jest.fn(async (key: string) => { delete mockStorage[key]; }),
  clear: jest.fn(async () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
}));

// Mock firebase (saveCheckin, saveMessage)
jest.mock('../services/firebase', () => ({
  saveCheckin: jest.fn(async () => {}),
  saveMessage: jest.fn(async () => {}),
}));

// Must import AFTER mocks
import {
  savePendingCheckin,
  getPendingCheckins,
  markCheckinSynced,
  savePendingMessage,
  getPendingMessages,
  markMessageSynced,
  getSyncState,
  offlineFirstSaveCheckin,
  offlineFirstSaveMessage,
  syncPendingData,
  isOnline,
} from '../services/offlineService';
import { saveCheckin, saveMessage } from '../services/firebase';

describe('OfflineService - Check-ins', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('savePendingCheckin', () => {
    it('should save a checkin to AsyncStorage', async () => {
      const id = await savePendingCheckin({
        patientId: 'user-123',
        mood: 7,
        sleep: 6,
        anxiety: 3,
        activity: 5,
        social: 4,
        notes: 'Feeling better',
        timestamp: new Date().toISOString(),
      });

      expect(id).toMatch(/^pending_/);
      const stored = await getPendingCheckins();
      expect(stored).toHaveLength(1);
      expect(stored[0].patientId).toBe('user-123');
      expect(stored[0].mood).toBe(7);
      expect(stored[0].synced).toBe(false);
    });

    it('should generate unique IDs for each checkin', async () => {
      const id1 = await savePendingCheckin({
        patientId: 'user-123',
        mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 5,
        timestamp: new Date().toISOString(),
      });
      const id2 = await savePendingCheckin({
        patientId: 'user-123',
        mood: 5, sleep: 5, anxiety: 5, activity: 5, social: 5,
        timestamp: new Date().toISOString(),
      });
      expect(id1).not.toBe(id2);
    });

    it('should handle multiple checkins', async () => {
      await savePendingCheckin({
        patientId: 'user-123',
        mood: 7, sleep: 6, anxiety: 3, activity: 5, social: 4,
        timestamp: new Date().toISOString(),
      });
      await savePendingCheckin({
        patientId: 'user-123',
        mood: 8, sleep: 7, anxiety: 2, activity: 6, social: 5,
        timestamp: new Date().toISOString(),
      });
      const stored = await getPendingCheckins();
      expect(stored).toHaveLength(2);
    });
  });

  describe('markCheckinSynced', () => {
    it('should remove synced checkin from pending list', async () => {
      const id = await savePendingCheckin({
        patientId: 'user-123',
        mood: 7, sleep: 6, anxiety: 3, activity: 5, social: 4,
        timestamp: new Date().toISOString(),
      });
      await markCheckinSynced(id);
      const stored = await getPendingCheckins();
      expect(stored).toHaveLength(0);
    });

    it('should only remove the specified checkin', async () => {
      const id1 = await savePendingCheckin({
        patientId: 'user-123',
        mood: 7, sleep: 6, anxiety: 3, activity: 5, social: 4,
        timestamp: new Date().toISOString(),
      });
      await savePendingCheckin({
        patientId: 'user-123',
        mood: 8, sleep: 7, anxiety: 2, activity: 6, social: 5,
        timestamp: new Date().toISOString(),
      });
      await markCheckinSynced(id1);
      const stored = await getPendingCheckins();
      expect(stored).toHaveLength(1);
    });
  });
});

describe('OfflineService - Messages', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('savePendingMessage', () => {
    it('should save a message to AsyncStorage', async () => {
      const id = await savePendingMessage({
        patientId: 'user-123',
        role: 'user',
        content: 'Hello Kibo',
        type: 'chat',
        timestamp: new Date().toISOString(),
      });

      expect(id).toMatch(/^pending_msg_/);
      const stored = await getPendingMessages();
      expect(stored).toHaveLength(1);
      expect(stored[0].content).toBe('Hello Kibo');
      expect(stored[0].synced).toBe(false);
    });
  });

  describe('markMessageSynced', () => {
    it('should remove synced message from pending list', async () => {
      const id = await savePendingMessage({
        patientId: 'user-123',
        role: 'user',
        content: 'Hello Kibo',
        type: 'chat',
        timestamp: new Date().toISOString(),
      });
      await markMessageSynced(id);
      const stored = await getPendingMessages();
      expect(stored).toHaveLength(0);
    });
  });
});

describe('OfflineService - Sync State', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('getSyncState', () => {
    it('should return synced state when nothing is pending', async () => {
      const state = await getSyncState();
      expect(state.status).toBe('synced');
      expect(state.pendingCount).toBe(0);
      expect(state.isOnline).toBe(true); // starts online by default
    });

    it('should return pending count when items are pending', async () => {
      await savePendingCheckin({
        patientId: 'user-123',
        mood: 7, sleep: 6, anxiety: 3, activity: 5, social: 4,
        timestamp: new Date().toISOString(),
      });
      await savePendingMessage({
        patientId: 'user-123',
        role: 'user',
        content: 'Hello',
        timestamp: new Date().toISOString(),
      });

      const state = await getSyncState();
      expect(state.pendingCount).toBe(2);
      expect(state.status).toBe('pending');
    });
  });
});

describe('OfflineService - Offline-first wrappers', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('offlineFirstSaveCheckin', () => {
    it('should save locally and mark as synced when online', async () => {
      const result = await offlineFirstSaveCheckin('user-123', {
        mood: 7,
        sleep: 6,
        anxiety: 3,
        activity: 5,
        social: 4,
        notes: 'Great day',
      });

      // When online, sync runs immediately and clears pending list
      expect(result.savedLocally).toBe(true);
      expect(result.synced).toBe(true);
      const pending = await getPendingCheckins();
      expect(pending).toHaveLength(0); // synced and removed
      expect(saveCheckin).toHaveBeenCalledWith('user-123', expect.objectContaining({ mood: 7 }));
    });
  });

  describe('offlineFirstSaveMessage', () => {
    it('should save locally and mark as synced when online', async () => {
      const result = await offlineFirstSaveMessage('user-123', {
        role: 'user',
        content: 'Olá Kibo',
        type: 'chat',
      });

      // When online, sync runs immediately and clears pending list
      expect(result.savedLocally).toBe(true);
      expect(result.synced).toBe(true);
      const pending = await getPendingMessages();
      expect(pending).toHaveLength(0); // synced and removed
      expect(saveMessage).toHaveBeenCalledWith('user-123', expect.objectContaining({ content: 'Olá Kibo' }));
    });
  });
});
