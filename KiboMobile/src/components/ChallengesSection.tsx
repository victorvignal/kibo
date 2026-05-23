import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Challenge, getChallengeColor } from '../services/challenges';

interface ChallengesSectionProps {
  challenges: Challenge[];
  recommendedChallengeId: string | null;
}

export default function ChallengesSection({
  challenges,
  recommendedChallengeId,
}: ChallengesSectionProps) {
  if (challenges.length === 0) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>🏆 Desafios do Dia</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}
      >
        {challenges.map((challenge) => {
          const isRecommended = challenge.id === recommendedChallengeId;
          return (
            <View
              key={challenge.id}
              style={[
                styles.card,
                { borderLeftColor: getChallengeColor(challenge.category) },
                challenge.status === 'completed' && styles.completed,
                isRecommended && styles.recommended,
              ]}
            >
              <View style={styles.header}>
                <Text style={styles.emoji}>{challenge.emoji}</Text>
                {isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>⭐ Recomendado</Text>
                  </View>
                )}
              </View>
              <Text style={styles.title}>{challenge.title}</Text>
              <Text style={styles.description}>{challenge.description}</Text>
              <View style={styles.progress}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${challenge.progressPercent}%`,
                        backgroundColor: getChallengeColor(challenge.category),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {challenge.currentProgress}/{challenge.targetDays} dias
                </Text>
              </View>
              {challenge.status === 'completed' && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>✅ Concluído!</Text>
                </View>
              )}
              <Text style={styles.insight}>{challenge.insight}</Text>
            </View>
          );
        })}
      </ScrollView>
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
  scroll: {
    marginLeft: 0,
  },
  row: {
    paddingHorizontal: 20,
    gap: 12,
    flexDirection: 'row',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: 200,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  completed: {
    opacity: 0.7,
  },
  recommended: {
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 28,
  },
  recommendedBadge: {
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recommendedBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#7C3AED',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 16,
  },
  progress: {
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
  },
  completedBadge: {
    backgroundColor: '#D4EDDA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#155724',
  },
  insight: {
    fontSize: 11,
    color: '#7C3AED',
    fontStyle: 'italic',
    lineHeight: 14,
  },
});
