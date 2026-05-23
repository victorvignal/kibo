import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSensorAnalysis } from '../hooks/useSensorAnalysis';

interface StepActivityCardProps {
  compact?: boolean;
}

export function StepActivityCard({ compact = false }: StepActivityCardProps) {
  const { steps, cadence, currentActivity, activityLevel, isTracking } = useSensorAnalysis(3000);

  const getActivityEmoji = (type: string) => {
    switch (type) {
      case 'walking': return '🚶';
      case 'running': return '🏃';
      case 'stationary': return '🧘';
      case 'cycling': return '🚴';
      default: return '❓';
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'walking': return 'Caminhando';
      case 'running': return 'Correndo';
      case 'stationary': return 'Parado';
      case 'cycling': return 'Pedalando';
      default: return 'Desconhecido';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'walking': return '#059669';
      case 'running': return '#DC2626';
      case 'stationary': return '#6B7280';
      case 'cycling': return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  const activityColor = getActivityColor(currentActivity.type);

  if (compact) {
    return (
      <View style={styles.compactCard}>
        <View style={styles.compactRow}>
          <Text style={styles.compactEmoji}>👣</Text>
          <View style={styles.compactInfo}>
            <Text style={styles.compactValue}>{steps}</Text>
            <Text style={styles.compactLabel}>passos</Text>
          </View>
        </View>
        <View style={[styles.compactIndicator, { backgroundColor: activityColor }]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👣 Atividade Física</Text>
        <View style={[styles.statusBadge, isTracking ? styles.statusActive : styles.statusInactive]}>
          <View style={[styles.statusDot, isTracking ? styles.dotActive : styles.dotInactive]} />
          <Text style={[styles.statusText, isTracking ? styles.textActive : styles.textInactive]}>
            {isTracking ? 'Monitorando' : 'Aguardando'}
          </Text>
        </View>
      </View>

      <View style={styles.mainStats}>
        <View style={styles.statBlock}>
          <Text style={styles.statEmoji}>👣</Text>
          <Text style={styles.statValue}>{steps}</Text>
          <Text style={styles.statLabel}>passos hoje</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBlock}>
          <Text style={styles.statEmoji}>⏱️</Text>
          <Text style={styles.statValue}>{cadence || '—'}</Text>
          <Text style={styles.statLabel}>passos/min</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBlock}>
          <Text style={styles.statEmoji}>{getActivityEmoji(currentActivity.type)}</Text>
          <Text style={[styles.statValue, { color: activityColor }]}>
            {getActivityLabel(currentActivity.type)}
          </Text>
          <Text style={styles.statLabel}>atividade atual</Text>
        </View>
      </View>

      {/* Activity level bar */}
      <View style={styles.activityBarContainer}>
        <Text style={styles.activityBarLabel}>Nível de atividade</Text>
        <View style={styles.activityBarTrack}>
          <View
            style={[
              styles.activityBarFill,
              { width: `${activityLevel}%`, backgroundColor: activityColor }
            ]}
          />
        </View>
        <Text style={styles.activityBarValue}>{activityLevel}%</Text>
      </View>

      {/* Confidence indicator */}
      {currentActivity.confidence > 0 && (
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Confiança da classificação:</Text>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                { width: `${Math.round(currentActivity.confidence * 100)}%` }
              ]}
            />
          </View>
          <Text style={styles.confidenceValue}>
            {Math.round(currentActivity.confidence * 100)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  statusInactive: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#059669',
  },
  dotInactive: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textActive: {
    color: '#059669',
  },
  textInactive: {
    color: '#6B7280',
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  statBlock: {
    alignItems: 'center',
    flex: 1,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  activityBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityBarLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 100,
  },
  activityBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  activityBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  activityBarValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    width: 36,
    textAlign: 'right',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  confidenceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 2,
  },
  confidenceValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
    width: 36,
    textAlign: 'right',
  },
  // Compact styles
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactEmoji: {
    fontSize: 24,
  },
  compactInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  compactValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  compactLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  compactIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
