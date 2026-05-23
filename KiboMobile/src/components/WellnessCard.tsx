import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WellnessCardProps {
  label: string;
  value: number;
  maxValue?: number;
  emoji: string;
  size?: 'small' | 'medium' | 'large';
}

export function WellnessCard({ label, value, maxValue = 10, emoji, size = 'medium' }: WellnessCardProps) {
  const pct = Math.min(100, Math.max(0, (value / maxValue) * 100));

  const getColor = (v: number) => {
    if (v >= 7) return '#059669';
    if (v >= 4) return '#D97706';
    return '#DC2626';
  };

  const heights = { small: 6, medium: 10, large: 14 };
  const fontSizes = { small: 20, medium: 28, large: 36 };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.value, { fontSize: fontSizes[size] }]}>
        {value}
        <Text style={styles.max}>/{maxValue}</Text>
      </Text>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            { width: `${pct}%`, backgroundColor: getColor(value), height: heights[size] },
          ]}
        />
      </View>
    </View>
  );
}

interface WellnessMiniCardProps {
  emoji: string;
  label: string;
  value: number;
  maxValue?: number;
  trend?: 'up' | 'down' | 'stable';
}

export function WellnessMiniCard({ emoji, label, value, maxValue = 10, trend }: WellnessMiniCardProps) {
  const getColor = (v: number) => {
    if (v >= 7) return '#059669';
    if (v >= 4) return '#D97706';
    return '#DC2626';
  };

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendColor = trend === 'up' ? '#059669' : trend === 'down' ? '#DC2626' : '#6B7280';

  return (
    <View style={styles.miniCard}>
      <View style={styles.miniHeader}>
        <Text style={styles.miniEmoji}>{emoji}</Text>
        {trend && <Text style={[styles.trendIcon, { color: trendColor }]}>{trendIcon}</Text>}
      </View>
      <Text style={[styles.miniValue, { color: getColor(value) }]}>{value}/{maxValue}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  value: {
    fontWeight: 'bold',
    color: '#111827',
  },
  max: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#9CA3AF',
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 10,
  },
  barBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  miniCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  miniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniEmoji: {
    fontSize: 20,
  },
  trendIcon: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  miniLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
});
