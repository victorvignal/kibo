import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useWearableData, getHrvStatus, formatAccelerometer, formatGyroscope, formatMagnetometer } from '../services/wearableService';
import { useNavigation } from '@react-navigation/native';

export default function WearableDataScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const {
    accelerometer,
    gyroscope,
    magnetometer,
    hrv,
    steps,
    isTracking,
    activityLevel,
    motionCorrelation,
    resetSteps,
  } = useWearableData();

  const [hrvStatus, setHrvStatus] = useState(getHrvStatus(50));
  const navigation = useNavigation();

  useEffect(() => {
    setHrvStatus(getHrvStatus(hrv));
  }, [hrv]);

  const onRefresh = () => {
    setRefreshing(true);
    resetSteps();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'low': return '#10B981';
      case 'moderate': return '#F59E0B';
      case 'high': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>⌚ Dados do Relógio</Text>
        <View style={[styles.trackingBadge, isTracking && styles.trackingBadgeActive]}>
          <View style={[styles.trackingDot, isTracking && styles.trackingDotActive]} />
          <Text style={[styles.trackingText, isTracking && styles.trackingTextActive]}>
            {isTracking ? 'Conectado' : 'Desconectado'}
          </Text>
        </View>
      </View>

      {/* HRV Card (Simulated) */}
      <View style={styles.hrvCard}>
        <View style={styles.hrvHeader}>
          <Text style={styles.hrvEmoji}>❤️</Text>
          <View>
            <Text style={styles.hrvTitle}>HRV (Variabilidade Cardíaca)</Text>
            <Text style={styles.hrvSubtitle}>Estimado via sensores de movimento</Text>
          </View>
        </View>
        <View style={styles.hrvContent}>
          <Text style={[styles.hrvValue, { color: hrvStatus.color }]}>{hrv}</Text>
          <Text style={styles.hrvUnit}>ms</Text>
        </View>
        <View style={[styles.hrvBadge, { backgroundColor: hrvStatus.color + '20' }]}>
          <Text style={[styles.hrvBadgeText, { color: hrvStatus.color }]}>
            {hrvStatus.label}
          </Text>
        </View>
        <Text style={styles.hrvDescription}>{hrvStatus.description}</Text>
      </View>

      {/* Steps Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>👟</Text>
          <Text style={styles.cardTitle}>Passos</Text>
        </View>
        <Text style={styles.stepsValue}>{steps.toLocaleString()}</Text>
        <Text style={styles.cardSubtitle}>passos detectados desde o último reset</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(100, (steps / 10000) * 100)}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {Math.round((steps / 10000) * 100)}% da meta diária (10.000 passos)
        </Text>
      </View>

      {/* Activity Level */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>🏃</Text>
          <Text style={styles.cardTitle}>Nível de Atividade</Text>
        </View>
        <View style={styles.activityRow}>
          <Text style={styles.activityValue}>{activityLevel}%</Text>
          <View style={[styles.intensityBadge, { backgroundColor: getIntensityColor(motionCorrelation.movementIntensity) + '20' }]}>
            <Text style={[styles.intensityText, { color: getIntensityColor(motionCorrelation.movementIntensity) }]}>
              {motionCorrelation.movementIntensity === 'low' ? 'Leve' : motionCorrelation.movementIntensity === 'moderate' ? 'Moderado' : 'Intenso'}
            </Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${activityLevel}%`, backgroundColor: getIntensityColor(motionCorrelation.movementIntensity) }]} />
        </View>
        <Text style={styles.correlationText}>{motionCorrelation.correlationToMood}</Text>
      </View>

      {/* Accelerometer */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>📊</Text>
          <Text style={styles.cardTitle}>Acelerômetro</Text>
        </View>
        <Text style={styles.sensorSubtitle}>Movimento e orientação do dispositivo</Text>
        {accelerometer ? (
          <View style={styles.sensorData}>
            <View style={styles.sensorAxis}>
              <Text style={[styles.axisLabel, { color: '#EF4444' }]}>X</Text>
              <Text style={styles.axisValue}>{accelerometer.x.toFixed(3)}</Text>
            </View>
            <View style={styles.sensorAxis}>
              <Text style={[styles.axisLabel, { color: '#10B981' }]}>Y</Text>
              <Text style={styles.axisValue}>{accelerometer.y.toFixed(3)}</Text>
            </View>
            <View style={styles.sensorAxis}>
              <Text style={[styles.axisLabel, { color: '#3B82F6' }]}>Z</Text>
              <Text style={styles.axisValue}>{accelerometer.z.toFixed(3)}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noData}>Aguardando dados...</Text>
        )}
        <View style={styles.unitLabel}>
          <Text style={styles.unitText}>m/s² (aceleração)</Text>
        </View>
      </View>

      {/* Gyroscope */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>🔄</Text>
          <Text style={styles.cardTitle}>Giroscópio</Text>
        </View>
        <Text style={styles.sensorSubtitle}>Velocidade angular de rotação</Text>
        {gyroscope ? (
          <View style={styles.sensorData}>
            <View style={styles.sensorAxis}>
              <Text style={[styles.axisLabel, { color: '#EF4444' }]}>X</Text>
              <Text style={styles.axisValue}>{gyroscope.x.toFixed(3)}</Text>
            </View>
            <View style={styles.sensorAxis}>
              <Text style={[styles.axisLabel, { color: '#10B981' }]}>Y</Text>
              <Text style={styles.axisValue}>{gyroscope.y.toFixed(3)}</Text>
            </View>
            <View style={styles.sensorAxis}>
              <Text style={[styles.axisLabel, { color: '#3B82F6' }]}>Z</Text>
              <Text style={styles.axisValue}>{gyroscope.z.toFixed(3)}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noData}>Aguardando dados...</Text>
        )}
        <View style={styles.unitLabel}>
          <Text style={styles.unitText}>rad/s (velocidade angular)</Text>
        </View>
        {motionCorrelation.tremorScore > 10 && (
          <View style={styles.tremorAlert}>
            <Text style={styles.tremorText}>
              ⚠️ Tremor detectado: {motionCorrelation.tremorScore}% (pode indicar tensão ou necessidade de relaxamento)
            </Text>
          </View>
        )}
      </View>

      {/* Magnetometer */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>🧭</Text>
          <Text style={styles.cardTitle}>Magnetômetro</Text>
        </View>
        <Text style={styles.sensorSubtitle}>Campo magnético terrestre (bússola)</Text>
        {magnetometer ? (
          <>
            <View style={styles.compassContainer}>
              <Text style={styles.compassDirection}>{motionCorrelation.orientation}</Text>
              <View style={styles.compassRing}>
                <View style={styles.compassNeedle} />
              </View>
            </View>
            <View style={styles.sensorData}>
              <View style={styles.sensorAxis}>
                <Text style={[styles.axisLabel, { color: '#EF4444' }]}>X</Text>
                <Text style={styles.axisValue}>{magnetometer.x.toFixed(3)}</Text>
              </View>
              <View style={styles.sensorAxis}>
                <Text style={[styles.axisLabel, { color: '#10B981' }]}>Y</Text>
                <Text style={styles.axisValue}>{magnetometer.y.toFixed(3)}</Text>
              </View>
              <View style={styles.sensorAxis}>
                <Text style={[styles.axisLabel, { color: '#3B82F6' }]}>Z</Text>
                <Text style={styles.axisValue}>{magnetometer.z.toFixed(3)}</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.noData}>Aguardando dados...</Text>
        )}
        <View style={styles.unitLabel}>
          <Text style={styles.unitText}>μT (microtesla)</Text>
        </View>
      </View>

      {/* Correlation Card */}
      <View style={styles.correlationCard}>
        <Text style={styles.correlationTitle}>📈 Correlação com Humor</Text>
        <Text style={styles.correlationDescription}>
          Seus dados de movimento são analisados em conjunto com seus check-ins de humor.
          Atividade física regular está fortemente correlacionada com melhor bem-estar emocional.
        </Text>
        <View style={styles.correlationStats}>
          <View style={styles.correlationStat}>
            <Text style={styles.correlationEmoji}>🧘</Text>
            <Text style={styles.correlationStatLabel}>Stress</Text>
            <Text style={styles.correlationStatValue}>
              {motionCorrelation.tremorScore > 30 ? '↑ Elevado' : '→ Normal'}
            </Text>
          </View>
          <View style={styles.correlationStat}>
            <Text style={styles.correlationEmoji}>⚡</Text>
            <Text style={styles.correlationStatLabel}>Energia</Text>
            <Text style={styles.correlationStatValue}>
              {activityLevel > 50 ? '↑ Alta' : '→ Regular'}
            </Text>
          </View>
          <View style={styles.correlationStat}>
            <Text style={styles.correlationEmoji}>💤</Text>
            <Text style={styles.correlationStatLabel}>Sonolência</Text>
            <Text style={styles.correlationStatValue}>
              {activityLevel < 20 && hrv > 60 ? '↑ Pode estar cansado' : '→ Normal'}
            </Text>
          </View>
        </View>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ℹ️ Os dados de HRV são estimativas baseadas em sensores de movimento e não substituem
          dispositivos médicos. Para medições precisas de frequência cardíaca e HRV, utilize
          dispositivos específicos como smartwatches com sensor cardíaco.
        </Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  trackingBadgeActive: {
    backgroundColor: '#D4EDDA',
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  trackingDotActive: {
    backgroundColor: '#10B981',
  },
  trackingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  trackingTextActive: {
    color: '#059669',
  },
  hrvCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  hrvHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  hrvEmoji: {
    fontSize: 40,
  },
  hrvTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  hrvSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  hrvContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 8,
  },
  hrvValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  hrvUnit: {
    fontSize: 20,
    color: '#6B7280',
  },
  hrvBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  hrvBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hrvDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  stepsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  activityValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  intensityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  intensityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  sensorSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  sensorData: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  sensorAxis: {
    alignItems: 'center',
  },
  axisLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  axisValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'monospace',
  },
  noData: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  unitLabel: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  unitText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  tremorAlert: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  tremorText: {
    fontSize: 12,
    color: '#92400E',
  },
  compassContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  compassDirection: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  compassRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassNeedle: {
    width: 4,
    height: 30,
    backgroundColor: '#EF4444',
    borderRadius: 2,
  },
  correlationCard: {
    margin: 20,
    marginTop: 12,
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  correlationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  correlationDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  correlationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  correlationStat: {
    alignItems: 'center',
  },
  correlationEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  correlationStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  correlationStatValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  correlationText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  disclaimer: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },
});
