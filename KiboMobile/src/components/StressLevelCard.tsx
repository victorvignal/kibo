import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useStressDetection } from '../hooks/useStressDetection';

export function StressLevelCard() {
  const { quickLevel, assessment, isAnalyzing, recommendations, refresh } = useStressDetection(30000);
  const [showDetails, setShowDetails] = React.useState(false);

  const getLevelDescription = (level: string) => {
    switch (level) {
      case 'Relaxado': return 'Seu padrão de atividade está calmo.';
      case 'Moderado': return 'Alguns sinais de tensão detectados.';
      case 'Estressado': return 'Níveis elevados de estresse detectados.';
      case 'Muito Estressado': return 'Sinalização forte de estresse. Considere buscar apoio.';
      default: return 'Analisando...';
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.container} 
        onPress={() => setShowDetails(true)}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.emoji}>{quickLevel.emoji}</Text>
            <View style={styles.headerText}>
              <Text style={styles.title}>🧘 Nível de Estresse</Text>
              <Text style={[styles.level, { color: quickLevel.color }]}>
                {quickLevel.level}
              </Text>
            </View>
          </View>
          <View style={[styles.indicator, { backgroundColor: quickLevel.color }]} />
        </View>

        <Text style={styles.description}>
          {getLevelDescription(quickLevel.level)}
        </Text>

        {isAnalyzing && (
          <View style={styles.analyzingRow}>
            <Text style={styles.analyzingText}>Analisando padrões...</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🧘 Análise de Estresse</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDetails(false)}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {assessment && (
              <>
                {/* Overall Score */}
                <View style={styles.scoreSection}>
                  <View style={[styles.scoreCircle, { borderColor: quickLevel.color }]}>
                    <Text style={[styles.scoreValue, { color: quickLevel.color }]}>
                      {assessment.overallScore}
                    </Text>
                    <Text style={styles.scoreLabel}>nível</Text>
                  </View>
                  <Text style={[styles.levelBadge, { backgroundColor: quickLevel.color + '20', color: quickLevel.color }]}>
                    {quickLevel.emoji} {quickLevel.level}
                  </Text>
                </View>

                {/* Indicators */}
                {assessment.indicators.length > 0 ? (
                  <View style={styles.indicatorsSection}>
                    <Text style={styles.sectionTitle}>📊 Fatores Identificados</Text>
                    {assessment.indicators.map((indicator, index) => (
                      <View key={index} style={styles.indicatorCard}>
                        <View style={styles.indicatorHeader}>
                          <View style={[
                            styles.severityBadge,
                            { 
                              backgroundColor: 
                                indicator.severity === 'high' ? '#FEE2E2' :
                                indicator.severity === 'medium' ? '#FEF3C7' : '#E0E7FF'
                            }
                          ]}>
                            <Text style={[
                              styles.severityText,
                              { 
                                color:
                                  indicator.severity === 'high' ? '#DC2626' :
                                  indicator.severity === 'medium' ? '#D97706' : '#4F46E5'
                              }
                            ]}>
                              {indicator.severity === 'high' ? '⚠️ Alto' :
                               indicator.severity === 'medium' ? '⚡ Medio' : '• Leve'}
                            </Text>
                          </View>
                          <Text style={styles.indicatorScore}>{indicator.score}%</Text>
                        </View>
                        <Text style={styles.indicatorDesc}>{indicator.description}</Text>
                        <Text style={styles.indicatorRec}>{indicator.recommendation}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noIndicators}>
                    <Text style={styles.noIndicatorsEmoji}>✨</Text>
                    <Text style={styles.noIndicatorsText}>
                      Nenhum fator de estresse significativo detectado.
                      {'\n'}Continue mantendo seus hábitos saudáveis!
                    </Text>
                  </View>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <View style={styles.recommendationsSection}>
                    <Text style={styles.sectionTitle}>💡 Recomendações</Text>
                    {recommendations.slice(0, 3).map((rec, index) => (
                      <View key={index} style={styles.recommendationItem}>
                        <Text style={styles.recommendationBullet}>•</Text>
                        <Text style={styles.recommendationText}>{rec}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Factors */}
                {assessment.factors.length > 0 && (
                  <View style={styles.factorsRow}>
                    <Text style={styles.factorsLabel}>Principais fatores:</Text>
                    {assessment.factors.map((factor, index) => (
                      <View key={index} style={styles.factorTag}>
                        <Text style={styles.factorText}>
                          {factor === 'restlessness' ? '🔄 Inquietude' :
                           factor === 'sleep_disruption' ? '😴 Sono' :
                           factor === 'low_activity' ? '🪑 Baixa Atividade' :
                           factor === 'high_anxiety' ? '😰 Ansiedade' : factor}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={() => { refresh(); }}
            >
              <Text style={styles.refreshText}>🔄 Atualizar Análise</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 36,
  },
  headerText: {
    gap: 2,
  },
  title: {
    fontSize: 14,
    color: '#6B7280',
  },
  level: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  analyzingRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  analyzingText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#6B7280',
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  levelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  indicatorsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  indicatorCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  indicatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  indicatorScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  indicatorDesc: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  indicatorRec: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  noIndicators: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    marginBottom: 20,
  },
  noIndicatorsEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  noIndicatorsText: {
    fontSize: 14,
    color: '#059669',
    textAlign: 'center',
    lineHeight: 20,
  },
  recommendationsSection: {
    marginBottom: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  recommendationBullet: {
    fontSize: 14,
    color: '#7C3AED',
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  factorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  factorsLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  factorTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  factorText: {
    fontSize: 11,
    color: '#374151',
  },
  refreshButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  refreshText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
