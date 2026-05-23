import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface WellnessScoresSectionProps {
  mood: number;
  sleep: number;
  social: number;
  checkinCount: number;
  onCheckinPress: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 7) return '#059669';
  if (score >= 4) return '#D97706';
  return '#DC2626';
}

export default function WellnessScoresSection({
  mood,
  sleep,
  social,
  checkinCount,
  onCheckinPress,
}: WellnessScoresSectionProps) {
  if (checkinCount === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyText}>
          Você ainda não fez nenhum check-in.{'\n'}
          Faça seu primeiro check-in para ver seus indicadores!
        </Text>
        <TouchableOpacity style={styles.emptyButton} onPress={onCheckinPress}>
          <Text style={styles.emptyButtonText}>Fazer Check-in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scores = [
    { label: 'Humor', value: mood, max: 10, emoji: '😊' },
    { label: 'Sono', value: sleep, max: 10, emoji: '😴' },
    { label: 'Social', value: social, max: 10, emoji: '💬' },
  ];

  return (
    <View style={styles.grid}>
      {scores.map((item) => (
        <View key={item.label} style={styles.card}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <View style={styles.info}>
            <Text style={styles.label}>{item.label}</Text>
            <View style={styles.bar}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${(item.value / item.max) * 100}%`,
                    backgroundColor: getScoreColor(item.value),
                  },
                ]}
              />
            </View>
            <Text style={styles.value}>
              {item.value}/{item.max}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: {
    fontSize: 32,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  bar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'right',
  },
  emptyState: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
