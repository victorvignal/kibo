import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { CheckinData } from '../services/checkins';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SleepAnalysisProps {
  checkins: CheckinData[];
}

interface SleepPattern {
  date: string;
  sleep: number;
  mood: number;
  anxiety: number;
}

export default function SleepAnalysis({ checkins }: SleepAnalysisProps) {
  // Build ordered data (most recent first)
  const patterns = useMemo<SleepPattern[]>(() => {
    return [...checkins]
      .filter(c => c.timestamp)
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, 14)
      .reverse()
      .map(c => ({
        date: new Date(c.timestamp!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        sleep: c.sleep,
        mood: c.mood,
        anxiety: c.anxiety,
      }));
  }, [checkins]);

  if (patterns.length < 3) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>😴 Análise de Sono</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Faça mais check-ins para ver a análise de sono
          </Text>
        </View>
      </View>
    );
  }

  const sleepValues = patterns.map(p => p.sleep);
  const moodValues = patterns.map(p => p.mood);
  const anxietyValues = patterns.map(p => p.anxiety);

  const avgSleep = sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length;
  const avgMood = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;

  // Simple correlation coefficient between two arrays
  const correlation = (arr1: number[], arr2: number[]): number => {
    const n = arr1.length;
    if (n < 2) return 0;
    const mean1 = arr1.reduce((a, b) => a + b, 0) / n;
    const mean2 = arr2.reduce((a, b) => a + b, 0) / n;
    let num = 0, den1 = 0, den2 = 0;
    for (let i = 0; i < n; i++) {
      const d1 = arr1[i] - mean1;
      const d2 = arr2[i] - mean2;
      num += d1 * d2;
      den1 += d1 * d1;
      den2 += d2 * d2;
    }
    const den = Math.sqrt(den1 * den2);
    return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
  };

  const sleepMoodCorr = correlation(sleepValues, moodValues);
  const sleepAnxietyCorr = correlation(sleepValues, anxietyValues);

  const getCorrelationLabel = (corr: number): { label: string; color: string; emoji: string; description: string } => {
    if (corr >= 0.5) {
      return {
        label: 'Forte positiva',
        color: '#059669',
        emoji: '📈',
        description: 'Quando você dorme melhor, seu humor melhora明显mente.'
      };
    }
    if (corr >= 0.2) {
      return {
        label: 'Moderada positiva',
        color: '#10B981',
        emoji: '📈',
        description: 'Há uma tendência de seu humor melhorar com melhor sono.'
      };
    }
    if (corr <= -0.5) {
      return {
        label: 'Forte negativa',
        color: '#DC2626',
        emoji: '📉',
        description: 'Quando você dorme melhor, sua ansiedade diminui.'
      };
    }
    if (corr <= -0.2) {
      return {
        label: 'Moderada negativa',
        color: '#F59E0B',
        emoji: '📉',
        description: 'Há uma tendência de sua ansiedade diminuir com melhor sono.'
      };
    }
    return {
      label: 'Fraca/neutra',
      color: '#6B7280',
      emoji: '➡️',
      description: 'Não há uma relação clara entre sono e este fator.'
    };
  };

  const sleepMoodInfo = getCorrelationLabel(sleepMoodCorr);
  const sleepAnxietyInfo = getCorrelationLabel(sleepAnxietyCorr);

  // Determine if correlation is significant enough to mention
  const sleepQuality = avgSleep >= 7 ? 'bom' : avgSleep >= 5 ? 'regular' : 'preocupante';

  // Build chart bars for sleep and mood side by side
  const maxSleep = 10;
  const maxMood = 10;
  const chartHeight = 50;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>😴 Análise de Sono e Humor</Text>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {avgSleep.toFixed(1)}
              <Text style={styles.summaryMax}>/10</Text>
            </Text>
            <Text style={styles.summaryLabel}>Sono médio (14 dias)</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {avgMood.toFixed(1)}
              <Text style={styles.summaryMax}>/10</Text>
            </Text>
            <Text style={styles.summaryLabel}>Humor médio (14 dias)</Text>
          </View>
        </View>
        <Text style={[styles.sleepQualityBadge, {
          backgroundColor: avgSleep >= 7 ? '#D1FAE5' : avgSleep >= 5 ? '#FEF3C7' : '#FEE2E2',
          color: avgSleep >= 7 ? '#065F46' : avgSleep >= 5 ? '#92400E' : '#991B1B',
        }]}>
          Sono {sleepQuality} • {sleepMoodInfo.emoji} correlação {sleepMoodInfo.label.toLowerCase()} com humor
        </Text>
      </View>

      {/* Sleep vs Mood Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Sono vs Humor (últimos 14 dias)</Text>

        {/* Legend */}
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#7C3AED' }]} />
            <Text style={styles.legendText}>Sono</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Humor</Text>
          </View>
        </View>

        {/* Bars */}
        <View style={styles.barsContainer}>
          {patterns.map((p, i) => (
            <View key={i} style={styles.barGroup}>
              <View style={styles.barColumn}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      styles.sleepBar,
                      {
                        height: (p.sleep / maxSleep) * chartHeight,
                        backgroundColor: '#7C3AED',
                      }
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      styles.moodBar,
                      {
                        height: (p.mood / maxMood) * chartHeight,
                        backgroundColor: '#F59E0B',
                      }
                    ]}
                  />
                </View>
                <Text style={styles.barDate}>{p.date.split('/')[0]}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Correlations */}
      <View style={styles.correlationsCard}>
        <Text style={styles.correlationsTitle}>🔗 Correlações Identificadas</Text>

        <View style={[styles.correlationItem, { borderLeftColor: sleepMoodInfo.color }]}>
          <View style={styles.correlationHeader}>
            <Text style={styles.correlationEmoji}>😴 → 😊</Text>
            <Text style={[styles.correlationLabel, { color: sleepMoodInfo.color }]}>
              {sleepMoodInfo.label}
            </Text>
          </View>
          <Text style={styles.correlationValue}>
            Coeficiente: <Text style={styles.correlationValueNum}>{sleepMoodCorr >= 0 ? '+' : ''}{sleepMoodCorr}</Text>
          </Text>
          <Text style={styles.correlationDesc}>{sleepMoodInfo.description}</Text>
        </View>

        <View style={[styles.correlationItem, { borderLeftColor: sleepAnxietyInfo.color }]}>
          <View style={styles.correlationHeader}>
            <Text style={styles.correlationEmoji}>😴 → 😰</Text>
            <Text style={[styles.correlationLabel, { color: sleepAnxietyInfo.color }]}>
              {sleepAnxietyInfo.label}
            </Text>
          </View>
          <Text style={styles.correlationValue}>
            Coeficiente: <Text style={styles.correlationValueNum}>{sleepAnxietyCorr >= 0 ? '+' : ''}{sleepAnxietyCorr}</Text>
          </Text>
          <Text style={styles.correlationDesc}>{sleepAnxietyInfo.description}</Text>
        </View>
      </View>

      {/* Personalized Recommendation */}
      <View style={styles.recommendationCard}>
        <Text style={styles.recommendationTitle}>💡 Recomendação</Text>
        {avgSleep < 5 ? (
          <Text style={styles.recommendationText}>
            Seu sono está abaixo do ideal. Tentar dormir pelo menos 1 hora mais cedo hoje pode melhorar significativamente seu humor amanhã. Estabelecer um ritual noturno (sem telas, luz baixa) também ajuda.
          </Text>
        ) : avgSleep >= 7 && sleepMoodCorr >= 0.3 ? (
          <Text style={styles.recommendationText}>
            O sono afeta positivamente seu humor! Continue mantendo seus bons hábitos de sono — você está no caminho certo. 😴✨
          </Text>
        ) : (
          <Text style={styles.recommendationText}>
            Continue monitorando seu sono e humor. A consistência nos horários de dormir e acordar, mesmo nos fins de semana, é uma das formas mais eficazes de melhorar a qualidade do sono.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryMax: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#9CA3AF',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  sleepQualityBadge: {
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
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
    fontSize: 12,
    color: '#6B7280',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 70,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
  },
  barColumn: {
    alignItems: 'center',
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 50,
    flexDirection: 'row',
    gap: 2,
  },
  bar: {
    width: 6,
    borderRadius: 3,
    minHeight: 3,
  },
  sleepBar: {},
  moodBar: {},
  barDate: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 4,
  },
  correlationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  correlationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  correlationItem: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    marginBottom: 12,
  },
  correlationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  correlationEmoji: {
    fontSize: 18,
  },
  correlationLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  correlationValue: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  correlationValueNum: {
    fontWeight: 'bold',
    color: '#374151',
  },
  correlationDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  recommendationCard: {
    marginHorizontal: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 12,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
});
