import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const QUICK_ACTIONS = [
  { emoji: '📋', label: 'Fazer Check-in', screen: 'Checkin' },
  { emoji: '💬', label: 'Conversar com Kibo', screen: 'Chat' },
  { emoji: '🌬️', label: 'Respirar', screen: 'BreathingExercise' },
  { emoji: '🎯', label: 'Metas', screen: 'Goals' },
  { emoji: '📈', label: 'Atividade', screen: 'ActivityData' },
  { emoji: '⌚', label: 'Wearables', screen: 'WearableData' },
  { emoji: '📓', label: 'Diário', screen: 'Journal' },
];

interface QuickActionsGridProps {
  onNavigate: (screen: string) => void;
}

export default function QuickActionsGrid({ onNavigate }: QuickActionsGridProps) {
  return (
    <>
      <Text style={styles.sectionTitle}>Ações rápidas</Text>
      <View style={styles.grid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.card}
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
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: {
    fontSize: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
});
