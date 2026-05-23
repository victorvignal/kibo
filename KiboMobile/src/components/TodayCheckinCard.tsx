import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckinData } from '../services/checkins';

interface TodayCheckinCardProps {
  todayCheckin: CheckinData | null;
  onCheckinPress: () => void;
  onColorCheckinPress: () => void;
}

function getMoodEmoji(mood: number): string {
  if (mood >= 8) return '😊';
  if (mood >= 6) return '🙂';
  if (mood >= 4) return '😐';
  if (mood >= 2) return '😔';
  return '😢';
}

function getMoodLabel(mood: number): string {
  if (mood >= 8) return 'Excelente';
  if (mood >= 6) return 'Bom';
  if (mood >= 4) return 'Regular';
  if (mood >= 2) return 'Ruim';
  return 'Muito ruim';
}

export default function TodayCheckinCard({
  todayCheckin,
  onCheckinPress,
  onColorCheckinPress,
}: TodayCheckinCardProps) {
  // Already checked in today
  if (todayCheckin) {
    return (
      <View style={styles.doneCard}>
        <View style={styles.doneHeader}>
          <Text style={styles.doneEmoji}>{getMoodEmoji(todayCheckin.mood)}</Text>
          <View style={styles.doneInfo}>
            <Text style={styles.doneTitle}>Check-in de hoje ✅</Text>
            <Text style={styles.doneSubtitle}>
              Humor {getMoodLabel(todayCheckin.mood).toLowerCase()} · {todayCheckin.mood}/10
            </Text>
          </View>
        </View>
        <View style={styles.doneMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricEmoji}>😴</Text>
            <Text style={styles.metricValue}>{todayCheckin.sleep}/10</Text>
            <Text style={styles.metricLabel}>Sono</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricEmoji}>😰</Text>
            <Text style={styles.metricValue}>{todayCheckin.anxiety}/10</Text>
            <Text style={styles.metricLabel}>Ansiedade</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricEmoji}>🏃</Text>
            <Text style={styles.metricValue}>{todayCheckin.activity}/10</Text>
            <Text style={styles.metricLabel}>Atividade</Text>
          </View>
        </View>
        {todayCheckin.notes ? (
          <Text style={styles.notesPreview}>" {todayCheckin.notes.slice(0, 80)}... "</Text>
        ) : null}
        <TouchableOpacity style={styles.colorCheckinBtn} onPress={onColorCheckinPress}>
          <Text style={styles.colorCheckinBtnText}>🎨 Fazer check-in emocional</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Not checked in today - show prompt
  const hour = new Date().getHours();
  let greeting = 'Bom dia';
  if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
  else if (hour >= 18) greeting = 'Boa noite';

  return (
    <View style={styles.promptCard}>
      <View style={styles.promptHeader}>
        <Text style={styles.promptEmoji}>📋</Text>
        <Text style={styles.promptTitle}>{greeting}! Como você está?</Text>
      </View>
      <Text style={styles.promptText}>
        Reserve um minuto para fazer seu check-in diário. Ajuda você a acompanhar seu bem-estar.
      </Text>
      <TouchableOpacity style={styles.checkinBtn} onPress={onCheckinPress}>
        <Text style={styles.checkinBtnText}>Fazer Check-in Agora</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.colorBtn} onPress={onColorCheckinPress}>
        <Text style={styles.colorBtnText}>🎨 Ou escolha por cores</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Done state
  doneCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  doneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  doneEmoji: {
    fontSize: 40,
  },
  doneInfo: {
    flex: 1,
  },
  doneTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  doneSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  doneMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  metricEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  notesPreview: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 16,
  },
  colorCheckinBtn: {
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  colorCheckinBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  // Prompt state
  promptCard: {
    marginHorizontal: 20,
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  promptEmoji: {
    fontSize: 32,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  promptText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  checkinBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  checkinBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  colorBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  colorBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
