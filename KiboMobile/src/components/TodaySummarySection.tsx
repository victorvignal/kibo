import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SyncState } from '../services/offlineService';

interface TodaySummarySectionProps {
  userName: string | undefined;
  unreadNotifications: number;
  syncState: SyncState;
  onSyncPress: () => void;
  onNotificationsPress: () => void;
}

export default function TodaySummarySection({
  userName,
  unreadNotifications,
  syncState,
  onSyncPress,
  onNotificationsPress,
}: TodaySummarySectionProps) {
  const firstName = userName?.split(' ')[0] || 'Usuário';
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const syncLabel = () => {
    if (syncState.status === 'offline') return 'Offline';
    if (syncState.status === 'pending') {
      const n = syncState.pendingCount;
      return `${n} pendente${n > 1 ? 's' : ''}`;
    }
    return 'Sincronizado';
  };

  const canSync = syncState.isOnline && syncState.pendingCount > 0;

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.greetingArea}>
          <Text style={styles.greeting}>Olá, {firstName}! 👋</Text>
          <Text style={styles.date}>{today}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.syncIndicator,
            syncState.status === 'offline' && styles.syncOffline,
            syncState.status === 'pending' && styles.syncPending,
          ]}
          onPress={onSyncPress}
          disabled={!canSync}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.syncDot,
              syncState.status === 'offline' && styles.dotOffline,
              syncState.status === 'pending' && styles.dotPending,
              syncState.status === 'synced' && styles.dotSynced,
            ]}
          />
          <Text
            style={[
              styles.syncText,
              syncState.status === 'offline' && styles.syncTextOffline,
            ]}
          >
            {syncLabel()}
          </Text>
        </TouchableOpacity>

        {unreadNotifications > 0 && (
          <TouchableOpacity
            style={styles.notificationBadge}
            onPress={onNotificationsPress}
            activeOpacity={0.7}
          >
            <Text style={styles.notificationText}>
              🔔 {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingTop: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingArea: {
    flex: 1,
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
  syncOffline: {
    backgroundColor: '#FEE2E2',
  },
  syncPending: {
    backgroundColor: '#FEF3C7',
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotSynced: {
    backgroundColor: '#22C55E',
  },
  dotOffline: {
    backgroundColor: '#EF4444',
  },
  dotPending: {
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
  notificationBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 4,
    marginLeft: 6,
  },
  notificationText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
