import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SensorStatusCardProps {
  activityLevel: number;
  sensorBufferSize: number;
  lastLocation: { lat: number; lng: number } | null;
  sensorOnline: boolean;
}

export default function SensorStatusCard({
  activityLevel,
  sensorBufferSize,
  lastLocation,
  sensorOnline,
}: SensorStatusCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>📡 Sensores Ativos</Text>
        <View style={[styles.badge, !sensorOnline && styles.badgeOffline]}>
          <View style={[styles.dot, !sensorOnline && styles.dotOffline]} />
          <Text style={[styles.badgeText, !sensorOnline && styles.badgeTextOffline]}>
            {sensorOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      <View style={styles.grid}>
        <View style={styles.item}>
          <Text style={styles.emoji}>🏃</Text>
          <Text style={styles.value}>{activityLevel}%</Text>
          <Text style={styles.label}>Atividade</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.emoji}>📶</Text>
          <Text style={styles.value}>{sensorBufferSize}</Text>
          <Text style={styles.label}>Buffer</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.emoji}>📍</Text>
          <Text style={styles.valueSmall}>
            {lastLocation ? `${lastLocation.lat}, ${lastLocation.lng}` : '...'}
          </Text>
          <Text style={styles.label}>Localização</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 0,
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E7FF',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: '#EF4444',
  },
  badgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  badgeTextOffline: {
    color: '#EF4444',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  item: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  valueSmall: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 10,
    color: '#A5B4FC',
    marginTop: 2,
  },
});
