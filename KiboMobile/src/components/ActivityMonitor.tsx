import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';
import { sensorService } from '../services/sensors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 72;
const MAX_POINTS = 50;

interface DataPoint {
  x: number;
  y: number;
  z: number;
  magnitude: number;
}

export default function ActivityMonitor() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [currentMagnitude, setCurrentMagnitude] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);

  useEffect(() => {
    // Use sensorService's tracking state
    const checkTracking = setInterval(() => {
      const tracking = sensorService.getIsTracking();
      setIsListening(tracking);
    }, 1000);

    // Also subscribe to accelerometer directly for visualization
    Accelerometer.setUpdateInterval(200); // 5 Hz for chart

    const listener = Accelerometer.addListener((measurement: AccelerometerMeasurement) => {
      const { x, y, z } = measurement;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      setCurrentMagnitude(Math.round(magnitude * 100) / 100);

      setData(prev => {
        const newPoint: DataPoint = { x, y, z, magnitude };
        const updated = [...prev, newPoint];
        // Keep last MAX_POINTS
        if (updated.length > MAX_POINTS) {
          return updated.slice(-MAX_POINTS);
        }
        return updated;
      });
    });

    subscriptionRef.current = listener;

    return () => {
      clearInterval(checkTracking);
      listener.remove();
    };
  }, []);

  const getMagnitudeColor = (mag: number) => {
    const delta = Math.abs(mag - 1); // 1g = stationary
    if (delta < 0.1) return '#10B981'; // Almost still - green
    if (delta < 0.3) return '#F59E0B'; // Low activity - amber
    if (delta < 0.6) return '#F97316'; // Medium activity - orange
    return '#EF4444'; // High activity - red
  };

  const getActivityLabel = (mag: number) => {
    const delta = Math.abs(mag - 1);
    if (delta < 0.1) return 'Parado';
    if (delta < 0.3) return 'Leve';
    if (delta < 0.6) return 'Moderado';
    return 'Intenso';
  };

  const getActivityBgColor = (mag: number) => {
    const delta = Math.abs(mag - 1);
    if (delta < 0.1) return 'rgba(16, 185, 129, 0.15)';
    if (delta < 0.3) return 'rgba(245, 158, 11, 0.15)';
    if (delta < 0.6) return 'rgba(249, 115, 22, 0.15)';
    return 'rgba(239, 68, 68, 0.15)';
  };

  // Scale for visualization (center around 0, range -2 to +2)
  const scaleY = (value: number, min: number, max: number, chartHeight: number) => {
    const range = max - min || 1;
    return chartHeight - ((value - min) / range) * chartHeight;
  };

  const chartHeight = 60;

  // Calculate Y-axis bounds from data
  const allValues = data.flatMap(d => [d.x, d.y, d.z]);
  const minVal = allValues.length > 0 ? Math.min(...allValues) : -1;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 1;
  const padding = 0.2;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📈 Atividade em Tempo Real</Text>
        <View style={[styles.statusBadge, isListening ? styles.statusOnline : styles.statusOffline]}>
          <View style={[styles.statusDot, isListening ? styles.dotOnline : styles.dotOffline]} />
          <Text style={[styles.statusText, isListening ? styles.textOnline : styles.textOffline]}>
            {isListening ? 'Ativo' : 'Inativo'}
          </Text>
        </View>
      </View>

      {/* Activity indicator */}
      <View style={[styles.activityCard, { backgroundColor: getActivityBgColor(currentMagnitude) }]}>
        <View style={styles.activityRow}>
          <View style={styles.activityInfo}>
            <Text style={styles.activityValue}>
              {currentMagnitude.toFixed(2)}
              <Text style={styles.activityUnit}> g</Text>
            </Text>
            <Text style={[styles.activityLabel, { color: getMagnitudeColor(currentMagnitude) }]}>
              {getActivityLabel(currentMagnitude)}
            </Text>
          </View>
          <View style={styles.gaugeContainer}>
            {/* Simple gauge visualization */}
            <View style={styles.gauge}>
              <View
                style={[
                  styles.gaugeNeedle,
                  {
                    transform: [
                      {
                        rotate: `${Math.min(90, Math.max(-90, (currentMagnitude - 1) * 150))}deg`,
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.gaugeCenter} />
            </View>
          </View>
        </View>

        {/* X axis bar */}
        <View style={styles.axisRow}>
          <Text style={styles.axisLabel}>X</Text>
          <View style={styles.axisBarContainer}>
            <View
              style={[
                styles.axisBar,
                {
                  width: `${Math.min(100, Math.abs(currentMagnitude > 1 ? (currentMagnitude - 1) * 50 : (1 - currentMagnitude) * 50))}%`,
                  backgroundColor: '#EF4444',
                  marginLeft: currentMagnitude >= 1 ? '50%' : `${50 - Math.min(50, (1 - currentMagnitude) * 50)}%`,
                },
              ]}
            />
            <View style={[styles.axisCenterLine]} />
          </View>
        </View>
      </View>

      {/* Mini line chart for X, Y, Z */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Aceleração por eixo</Text>
        <View style={styles.chart}>
          {/* Y axis */}
          <View style={styles.chartYAxis}>
            <Text style={styles.chartAxisLabel}>+2</Text>
            <Text style={styles.chartAxisLabel}> 0</Text>
            <Text style={styles.chartAxisLabel}>-2</Text>
          </View>

          {/* Chart area */}
          <View style={[styles.chartArea, { height: chartHeight }]}>
            {/* Zero line */}
            <View
              style={[
                styles.zeroLine,
                { top: scaleY(0, yMin, yMax, chartHeight) },
              ]}
            />

            {/* X line (red) */}
            {data.length > 1 && (
              <View style={styles.chartLine}>
                {data.map((point, i) => {
                  const xPos = (i / (MAX_POINTS - 1)) * CHART_WIDTH * 0.95;
                  const yPos = scaleY(point.x, yMin, yMax, chartHeight);
                  return (
                    <View
                      key={`x-${i}`}
                      style={[
                        styles.chartDot,
                        {
                          left: xPos,
                          top: yPos - 1,
                          backgroundColor: '#EF4444',
                        },
                      ]}
                    />
                  );
                })}
              </View>
            )}

            {/* Y line (green) */}
            {data.length > 1 && (
              <View style={styles.chartLine}>
                {data.map((point, i) => {
                  const xPos = (i / (MAX_POINTS - 1)) * CHART_WIDTH * 0.95;
                  const yPos = scaleY(point.y, yMin, yMax, chartHeight);
                  return (
                    <View
                      key={`y-${i}`}
                      style={[
                        styles.chartDot,
                        {
                          left: xPos,
                          top: yPos - 1,
                          backgroundColor: '#10B981',
                        },
                      ]}
                    />
                  );
                })}
              </View>
            )}

            {/* Z line (blue) */}
            {data.length > 1 && (
              <View style={styles.chartLine}>
                {data.map((point, i) => {
                  const xPos = (i / (MAX_POINTS - 1)) * CHART_WIDTH * 0.95;
                  const yPos = scaleY(point.z, yMin, yMax, chartHeight);
                  return (
                    <View
                      key={`z-${i}`}
                      style={[
                        styles.chartDot,
                        {
                          left: xPos,
                          top: yPos - 1,
                          backgroundColor: '#3B82F6',
                        },
                      ]}
                    />
                  );
                })}
              </View>
            )}

            {/* Empty state */}
            {data.length === 0 && (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>Aguardando dados...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>X</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Y</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Z</Text>
          </View>
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
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textOnline: {
    color: '#10B981',
  },
  textOffline: {
    color: '#EF4444',
  },
  activityCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityInfo: {
    flex: 1,
  },
  activityValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  activityUnit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6B7280',
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gauge: {
    width: 50,
    height: 30,
    position: 'relative',
  },
  gaugeNeedle: {
    position: 'absolute',
    width: 2,
    height: 22,
    backgroundColor: '#7C3AED',
    borderRadius: 1,
    bottom: 14,
    left: 24,
    transformOrigin: 'bottom center',
  },
  gaugeCenter: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
    bottom: 11,
    left: 21,
  },
  axisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  axisLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#EF4444',
    width: 12,
  },
  axisBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  axisBar: {
    position: 'absolute',
    height: '100%',
    borderRadius: 4,
    minWidth: 2,
  },
  axisCenterLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: '#6B7280',
    left: '50%',
    marginLeft: -1,
  },
  chartContainer: {
    marginTop: 4,
  },
  chartTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  chart: {
    flexDirection: 'row',
    gap: 6,
  },
  chartYAxis: {
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  chartAxisLabel: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  chartArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  zeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  chartLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chartDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  chartEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
});
