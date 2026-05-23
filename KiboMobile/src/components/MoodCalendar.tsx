import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckinData } from '../services/checkins';

interface MoodCalendarProps {
  checkins: CheckinData[];
  onDayPress?: (date: string, checkin?: CheckinData) => void;
}

export default function MoodCalendar({ checkins, onDayPress }: MoodCalendarProps) {
  // Get the last 28 days (4 weeks)
  const today = new Date();
  const days: Array<{ date: Date; dateKey: string }> = [];

  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({
      date: d,
      dateKey: d.toISOString().split('T')[0],
    });
  }

  // Create a map of date -> checkin
  const checkinMap = new Map<string, CheckinData>();
  for (const checkin of checkins) {
    if (checkin.timestamp) {
      const key = new Date(checkin.timestamp).toISOString().split('T')[0];
      // Keep the most recent checkin for each day
      if (!checkinMap.has(key) || 
          new Date(checkin.timestamp) > new Date(checkinMap.get(key)!.timestamp!)) {
        checkinMap.set(key, checkin);
      }
    }
  }

  const getMoodColor = (mood: number): string => {
    if (mood >= 8) return '#059669'; // Excellent - green
    if (mood >= 6) return '#10B981'; // Good - light green
    if (mood >= 4) return '#F59E0B'; // Okay - amber
    if (mood >= 2) return '#F97316'; // Low - orange
    return '#EF4444'; // Very low - red
  };

  const getMoodEmoji = (mood: number): string => {
    if (mood >= 8) return '😊';
    if (mood >= 6) return '🙂';
    if (mood >= 4) return '😐';
    if (mood >= 2) return '😔';
    return '😢';
  };

  const getDayLabel = (date: Date): string => {
    const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    return days[date.getDay()];
  };

  const isToday = (date: Date): boolean => {
    const todayStr = today.toISOString().split('T')[0];
    const dateStr = date.toISOString().split('T')[0];
    return todayStr === dateStr;
  };

  // Group days by week
  const weeks: Array<typeof days> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📅 Humor nos últimos 28 dias</Text>
      
      {/* Day labels */}
      <View style={styles.weekRow}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, i) => (
          <View key={i} style={styles.dayLabelCell}>
            <Text style={styles.dayLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map(({ date, dateKey }) => {
            const checkin = checkinMap.get(dateKey);
            const hasCheckin = !!checkin;
            const mood = checkin?.mood ?? 0;

            return (
              <TouchableOpacity
                key={dateKey}
                style={[
                  styles.dayCell,
                  hasCheckin && { backgroundColor: getMoodColor(mood) },
                  isToday(date) && styles.todayCell,
                ]}
                onPress={() => onDayPress?.(dateKey, checkin)}
                disabled={!hasCheckin}
              >
                <Text style={[
                  styles.dayNumber,
                  hasCheckin && styles.dayNumberWithCheckin,
                  isToday(date) && styles.todayText,
                ]}>
                  {date.getDate()}
                </Text>
                {hasCheckin && (
                  <Text style={styles.dayEmoji}>{getMoodEmoji(mood)}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Muito baixo</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Regular</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
          <Text style={styles.legendText}>Excelente</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  dayLabelCell: {
    width: 36,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  dayCell: {
    width: 36,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  dayNumber: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  dayNumberWithCheckin: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  todayText: {
    color: '#7C3AED',
    fontWeight: 'bold',
  },
  dayEmoji: {
    fontSize: 10,
    marginTop: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 10,
    color: '#6B7280',
  },
});
