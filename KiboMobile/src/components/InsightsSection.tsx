import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WeeklyInsight } from '../services/insights';

interface InsightsSectionProps {
  insights: WeeklyInsight[];
}

export default function InsightsSection({ insights }: InsightsSectionProps) {
  if (insights.length === 0) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>Insights da Semana</Text>
      <View style={styles.container}>
        {insights.map((insight, index) => (
          <View
            key={index}
            style={[
              styles.card,
              insight.type === 'success' && styles.success,
              insight.type === 'warning' && styles.warning,
              insight.type === 'tip' && styles.tip,
            ]}
          >
            <Text style={styles.emoji}>{insight.emoji}</Text>
            <View style={styles.content}>
              <Text style={styles.title}>{insight.title}</Text>
              <Text style={styles.description}>{insight.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  container: {
    paddingHorizontal: 20,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
  },
  success: {
    backgroundColor: '#D4EDDA',
    borderLeftColor: '#059669',
  },
  warning: {
    backgroundColor: '#FFF3CD',
    borderLeftColor: '#D97706',
  },
  tip: {
    backgroundColor: '#F3E8FF',
    borderLeftColor: '#7C3AED',
  },
  emoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});
