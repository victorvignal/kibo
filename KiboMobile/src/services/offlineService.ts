/**
 * Offline-First Service for KiboMobile
 * Handles local persistence with AsyncStorage and connectivity detection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveCheckin, saveMessage } from './firebase';

const PENDING_CHECKINS_KEY = '@kibo_pending_checkins';
const PENDING_MESSAGES_KEY = '@kibo_pending_messages';
const SYNC_STATUS_KEY = '@kibo_sync_status';
const LAST_SYNC_KEY = '@kibo_last_sync';

export type SyncStatus = 'synced' | 'pending' | 'offline';

export interface PendingCheckin {
  id: string;
  patientId: string;
  mood: number;
  sleep: number;
  anxiety: number;
  activity: number;
  social: number;
  notes?: string;
  timestamp: string; // ISO string
  synced: boolean;
}

export interface PendingMessage {
  id: string;
  patientId: string;
  role: string;
  content: string;
  type?: string;
  timestamp: string;
  synced: boolean;
}

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSync: string | null;
  isOnline: boolean;
}

// ─── Connectivity ────────────────────────────────────────────────────────────

let _isOnline = true;
let _connectivityListeners: Array<(online: boolean) => void> = [];

export function startConnectivityMonitor() {
  // NetInfo is available via expo or we can use a simple fetch approach
  // Using a lightweight polling approach with fetch
  const checkConnectivity = async () => {
    try {
      // Try a lightweight fetch to check internet
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const wasOnline = _isOnline;
      _isOnline = response.ok;
      if (!wasOnline && _isOnline) {
        _connectivityListeners.forEach(cb => cb(true));
        // Trigger sync when coming back online
        syncPendingData();
      } else if (wasOnline && !_isOnline) {
        _isOnline = false;
        _connectivityListeners.forEach(cb => cb(false));
      }
    } catch {
      if (_isOnline) {
        _isOnline = false;
        _connectivityListeners.forEach(cb => cb(false));
      }
    }
  };

  // Initial check
  checkConnectivity();

  // Poll every 30 seconds
  const interval = setInterval(checkConnectivity, 30000);
  return () => clearInterval(interval);
}

export function isOnline(): boolean {
  return _isOnline;
}

export function onConnectivityChange(callback: (online: boolean) => void): () => void {
  _connectivityListeners.push(callback);
  return () => {
    _connectivityListeners = _connectivityListeners.filter(cb => cb !== callback);
  };
}

// ─── Pending Check-ins ────────────────────────────────────────────────────────

export async function savePendingCheckin(checkin: Omit<PendingCheckin, 'id' | 'synced'>): Promise<string> {
  const pending = await getPendingCheckins();
  const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const item: PendingCheckin = { ...checkin, id, synced: false };
  pending.push(item);
  await AsyncStorage.setItem(PENDING_CHECKINS_KEY, JSON.stringify(pending));
  await updateSyncStatus();
  return id;
}

export async function getPendingCheckins(): Promise<PendingCheckin[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_CHECKINS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function markCheckinSynced(id: string): Promise<void> {
  const pending = await getPendingCheckins();
  const updated = pending.filter(c => c.id !== id);
  await AsyncStorage.setItem(PENDING_CHECKINS_KEY, JSON.stringify(updated));
  await updateSyncStatus();
}

// ─── Pending Messages ─────────────────────────────────────────────────────────

export async function savePendingMessage(message: Omit<PendingMessage, 'id' | 'synced'>): Promise<string> {
  const pending = await getPendingMessages();
  const id = `pending_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const item: PendingMessage = { ...message, id, synced: false };
  pending.push(item);
  await AsyncStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(pending));
  await updateSyncStatus();
  return id;
}

export async function getPendingMessages(): Promise<PendingMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function markMessageSynced(id: string): Promise<void> {
  const pending = await getPendingMessages();
  const updated = pending.filter(m => m.id !== id);
  await AsyncStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(updated));
  await updateSyncStatus();
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export async function syncPendingData(): Promise<{ checkins: number; messages: number }> {
  if (!isOnline()) return { checkins: 0, messages: 0 };

  let syncedCheckins = 0;
  let syncedMessages = 0;

  // Sync pending check-ins
  const pendingCheckins = await getPendingCheckins();
  for (const checkin of pendingCheckins) {
    if (checkin.synced) continue;
    try {
      await saveCheckin(checkin.patientId, {
        mood: checkin.mood,
        sleep: checkin.sleep,
        anxiety: checkin.anxiety,
        activity: checkin.activity,
        social: checkin.social,
        notes: checkin.notes,
      });
      await markCheckinSynced(checkin.id);
      syncedCheckins++;
    } catch (err) {
      console.warn('Failed to sync checkin:', err);
    }
  }

  // Sync pending messages
  const pendingMessages = await getPendingMessages();
  for (const message of pendingMessages) {
    if (message.synced) continue;
    try {
      await saveMessage(message.patientId, {
        role: message.role,
        content: message.content,
        type: message.type as any,
      });
      await markMessageSynced(message.id);
      syncedMessages++;
    } catch (err) {
      console.warn('Failed to sync message:', err);
    }
  }

  if (syncedCheckins > 0 || syncedMessages > 0) {
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  }

  await updateSyncStatus();
  return { checkins: syncedCheckins, messages: syncedMessages };
}

export async function getSyncState(): Promise<SyncState> {
  const pendingCheckins = await getPendingCheckins();
  const pendingMessages = await getPendingMessages();
  const pendingCount = pendingCheckins.filter(c => !c.synced).length + pendingMessages.filter(m => !m.synced).length;
  const lastSyncRaw = await AsyncStorage.getItem(LAST_SYNC_KEY);

  let status: SyncStatus = 'synced';
  if (!_isOnline) {
    status = 'offline';
  } else if (pendingCount > 0) {
    status = 'pending';
  }

  return {
    status,
    pendingCount,
    lastSync: lastSyncRaw,
    isOnline: _isOnline,
  };
}

async function updateSyncStatus(): Promise<void> {
  const state = await getSyncState();
  await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(state));
}

// ─── Offline-First Check-in Wrapper ─────────────────────────────────────────

export async function offlineFirstSaveCheckin(
  patientId: string,
  checkin: {
    mood: number;
    sleep: number;
    anxiety: number;
    activity: number;
    social: number;
    notes?: string;
  }
): Promise<{ savedLocally: boolean; synced: boolean }> {
  // Always save locally first
  await savePendingCheckin({
    patientId,
    ...checkin,
    timestamp: new Date().toISOString(),
  });

  // Try to sync immediately if online
  if (isOnline()) {
    try {
      await syncPendingData();
      return { savedLocally: true, synced: true };
    } catch {
      return { savedLocally: true, synced: false };
    }
  }

  return { savedLocally: true, synced: false };
}

// ─── Offline-First Message Wrapper ──────────────────────────────────────────

export async function offlineFirstSaveMessage(
  patientId: string,
  message: { role: string; content: string; type?: string }
): Promise<{ savedLocally: boolean; synced: boolean }> {
  // Always save locally first
  await savePendingMessage({
    patientId,
    ...message,
    timestamp: new Date().toISOString(),
  });

  // Try to sync immediately if online
  if (isOnline()) {
    try {
      await syncPendingData();
      return { savedLocally: true, synced: true };
    } catch {
      return { savedLocally: true, synced: false };
    }
  }

  return { savedLocally: true, synced: false };
}
