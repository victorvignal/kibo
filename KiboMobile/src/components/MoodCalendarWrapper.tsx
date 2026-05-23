import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MoodCalendar from './MoodCalendar';
import { CheckinData } from '../services/checkins';

interface MoodCalendarWrapperProps {
  checkins: CheckinData[];
  onColorCheckinPress: () => void;
}

export default function MoodCalendarWrapper({
  checkins,
  onColorCheckinPress,
}: MoodCalendarWrapperProps) {
  if (checkins.length === 0) return null;

  return (
    <View>
      <MoodCalendar checkins={checkins} />
      <TouchableOpacity
        style={styles.quickMoodButton}
        onPress={onColorCheckinPress}
        activeOpacity={0.8}
      >
        <Text style={styles.quickMoodEmoji}>🎨</Text>
        <View style={styles.quickMoodContent}>
          <Text style={styles.quickMoodTitle}>Check-in Emocional</Text>
          <Text style={styles.quickMoodSubtitle}>Registre como se sente por cores</Text>
        </View>
        <Text style={styles.quickMoodArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  quickMoodButton: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  quickMoodEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  quickMoodContent: {
    flex: 1,
  },
  quickMoodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  quickMoodSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  quickMoodArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
