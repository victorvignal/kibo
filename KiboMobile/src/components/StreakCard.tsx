import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StreakCardProps {
  streak: number;
  trend: 'improving' | 'stable' | 'worsening';
}

export default function StreakCard({ streak, trend }: StreakCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'improving': return '↑ Melhorando';
      case 'worsening': return '↓ Piorando';
      default: return '→ Estável';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'improving': return { bg: '#D4EDDA', text: '#155724' };
      case 'worsening': return { bg: '#F8D7DA', text: '#721C24' };
      default: return { bg: '#FFF3CD', text: '#856404' };
    }
  };

  const color = getTrendColor();

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔥</Text>
        <View>
          <Text style={styles.number}>{streak} dias</Text>
          <Text style={styles.label}>Sequência de check-ins</Text>
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: color.bg }]}>
        <Text style={[styles.badgeText, { color: color.text }]}>{getTrendIcon()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 40,
  },
  number: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
