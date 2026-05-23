import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const QUICK_ACTIONS = [
  { emoji: '📋', label: 'Check-in', screen: 'Checkin', color: '#7C3AED' },
  { emoji: '💬', label: 'Kibo Chat', screen: 'Chat', color: '#10B981' },
  { emoji: '🌬️', label: 'Respirar', screen: 'BreathingExercise', color: '#3B82F6' },
  { emoji: '🎯', label: 'Metas', screen: 'Goals', color: '#F59E0B' },
  { emoji: '📊', label: 'Insights', screen: 'Insights', color: '#EC4899' },
  { emoji: '📓', label: 'Diário', screen: 'Journal', color: '#8B5CF6' },
  { emoji: '🆘', label: 'Ajuda', screen: 'Crisis', color: '#EF4444' },
  { emoji: '📈', label: 'Atividade', screen: 'ActivityData', color: '#06B6D4' },
  { emoji: '⌚', label: 'Wearables', screen: 'WearableData', color: '#84CC16' },
];

interface QuickAction {
  emoji: string;
  label: string;
  screen: string;
  color: string;
}

interface QuickActionsGridProps {
  onNavigate: (screen: string) => void;
}

export default function QuickActionsGrid({ onNavigate }: QuickActionsGridProps) {
  return (
    <>
      <Text style={styles.sectionTitle}>Explorar</Text>
      <View style={styles.grid}>
        {QUICK_ACTIONS.map((action: QuickAction) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.card, { borderLeftWidth: 3, borderLeftColor: action.color }]}
            onPress={() => onNavigate(action.screen)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{action.emoji}</Text>
            <Text style={styles.label}>{action.label}</Text>
          </TouchableOpacity>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
});
