/**
 * Stress Detection Service
 * 
 * Analyzes sensor patterns to detect potential stress indicators:
 * - High frequency movements (restlessness)
 * - Irregular activity patterns
 * - Sleep disruption patterns
 * - Low activity during usual active hours
 */

import { sensorAnalysisService, ActivitySample } from './sensorAnalysis';

export interface StressIndicator {
  type: 'restlessness' | 'sleep_disruption' | 'low_activity' | 'irregular_pattern' | 'high_anxiety';
  severity: 'low' | 'medium' | 'high';
  score: number; // 0-100
  description: string;
  recommendation: string;
}

export interface StressAssessment {
  overallScore: number; // 0-100 (higher = more stressed)
  level: 'relaxed' | 'moderate' | 'stressed' | 'highly_stressed';
  indicators: StressIndicator[];
  timestamp: Date;
  factors: string[];
}

export class StressDetectionService {
  private readonly RESTLESSNESS_THRESHOLD = 0.3; // variance threshold for restlessness
  private readonly LOW_ACTIVITY_THRESHOLD = 0.1; // activity level below this is "low"
  private readonly SLEEP_DISRUPTION_THRESHOLD = 5; // number of wake-ups indicating poor sleep
  private readonly HIGH_ANXIETY_CADENCE = 180; // steps/min above this may indicate anxiety-driven movement

  /**
   * Analyzes recent activity to detect stress patterns
   */
  analyze(currentActivity: ActivitySample, recentActivity: { steps: number; activityLevel: number; avgMagnitude: number }): StressAssessment {
    const indicators: StressIndicator[] = [];
    const factors: string[] = [];

    // 1. Restlessness Detection
    // High variance in movement patterns suggests restlessness
    const restlessnessScore = Math.min(100, Math.max(0, 
      (recentActivity.avgMagnitude - 1) * 200 // deviation from 1g baseline
    ));
    
    if (restlessnessScore > 30) {
      const severity = restlessnessScore > 60 ? 'high' : restlessnessScore > 45 ? 'medium' : 'low';
      indicators.push({
        type: 'restlessness',
        severity,
        score: restlessnessScore,
        description: 'Padrões de movimento irregulares detectados',
        recommendation: severity === 'high' 
          ? 'Tente técnicas de respiração profunda. Parar por alguns minutos pode ajudar.'
          : 'Considere uma pausa breve para relaxar.',
      });
      if (severity !== 'low') factors.push('restlessness');
    }

    // 2. Sleep Disruption
    // This would be connected to actual sleep data in production
    // For now, we estimate from activity patterns after "bed time"
    const hour = new Date().getHours();
    const isLikelySleeping = hour >= 23 || hour < 6;
    
    if (isLikelySleeping && recentActivity.activityLevel > 20) {
      const sleepDisruptionScore = Math.min(100, recentActivity.activityLevel * 3);
      indicators.push({
        type: 'sleep_disruption',
        severity: sleepDisruptionScore > 50 ? 'high' : 'medium',
        score: sleepDisruptionScore,
        description: 'Movimentação detectada durante horário de sono',
        recommendation: 'Se não conseguir dormir, tente técnicas de relaxamento. Evite telas.',
      });
      factors.push('sleep_disruption');
    }

    // 3. Low Activity During Active Hours
    // If it's during the day (10am-8pm) and activity is very low
    if (hour >= 10 && hour <= 20 && recentActivity.activityLevel < 5 && recentActivity.steps < 50) {
      const lowActivityScore = Math.min(100, 50 - recentActivity.activityLevel * 2 + (50 - recentActivity.steps / 2));
      indicators.push({
        type: 'low_activity',
        severity: 'medium',
        score: lowActivityScore,
        description: 'Baixo nível de atividade durante horário ativo',
        recommendation: 'Levantar e se mover um pouco pode ajudar a melhorar o humor. Tente uma caminhada curta.',
      });
      factors.push('low_activity');
    }

    // 4. High Anxiety Movement Pattern
    // Very high cadence without running pattern = potentially anxious pacing
    if (currentActivity.cadence && currentActivity.cadence > this.HIGH_ANXIETY_CADENCE && currentActivity.type !== 'running') {
      const anxietyScore = Math.min(100, ((currentActivity.cadence - this.HIGH_ANXIETY_CADENCE) / 40) * 100);
      indicators.push({
        type: 'high_anxiety',
        severity: anxietyScore > 60 ? 'high' : 'medium',
        score: anxietyScore,
        description: 'Padrão de movimento consistente com ansiedade',
        recommendation: 'Pause e pratique a respiração 4-7-8. Inspire por 4s, segure por 7s, expire por 8s.',
      });
      factors.push('high_anxiety');
    }

    // 5. Irregular Pattern
    // No steps for extended period followed by sudden burst
    // This is harder to detect without historical data, but we can use variance
    const patternVariance = Math.abs(recentActivity.avgMagnitude - 1);
    if (patternVariance > 0.4) {
      indicators.push({
        type: 'irregular_pattern',
        severity: 'low',
        score: Math.min(100, patternVariance * 150),
        description: 'Padrão de atividade irregular detectado',
        recommendation: 'Tente manter uma rotina de atividades mais consistente.',
      });
    }

    // Calculate overall stress score
    const weightedScore = indicators.reduce((sum, ind) => {
      const weight = ind.severity === 'high' ? 1.5 : ind.severity === 'medium' ? 1.0 : 0.5;
      return sum + ind.score * weight;
    }, 0);
    
    const normalizedScore = indicators.length > 0 
      ? Math.min(100, weightedScore / indicators.length * (1 + indicators.length * 0.1))
      : 0;

    const overallScore = Math.round(normalizedScore);

    let level: 'relaxed' | 'moderate' | 'stressed' | 'highly_stressed';
    if (overallScore < 20) level = 'relaxed';
    else if (overallScore < 45) level = 'moderate';
    else if (overallScore < 70) level = 'stressed';
    else level = 'highly_stressed';

    return {
      overallScore,
      level,
      indicators,
      timestamp: new Date(),
      factors,
    };
  }

  /**
   * Get a quick stress level assessment (for display on HomeScreen)
   */
  getQuickAssessment(): { level: string; color: string; emoji: string } {
    const currentActivity = sensorAnalysisService.getCurrentActivity();
    const recentActivity = sensorAnalysisService.getRecentActivity(30); // 30 min window

    const assessment = this.analyze(currentActivity, recentActivity);

    switch (assessment.level) {
      case 'relaxed':
        return { level: 'Relaxado', color: '#059669', emoji: '😌' };
      case 'moderate':
        return { level: 'Moderado', color: '#F59E0B', emoji: '😐' };
      case 'stressed':
        return { level: 'Estressado', color: '#F97316', emoji: '😰' };
      case 'highly_stressed':
        return { level: 'Muito Estressado', color: '#DC2626', emoji: '😫' };
    }
  }

  /**
   * Get personalized recommendations based on current stress assessment
   */
  getRecommendations(currentActivity: ActivitySample, recentActivity: { steps: number; activityLevel: number; avgMagnitude: number }): string[] {
    const recommendations: string[] = [];
    const assessment = this.analyze(currentActivity, recentActivity);

    // Sort indicators by severity
    const sortedIndicators = [...assessment.indicators].sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // Get top 3 recommendations
    for (const indicator of sortedIndicators.slice(0, 3)) {
      recommendations.push(indicator.recommendation);
    }

    // Always add general wellness recommendation if stress is elevated
    if (assessment.overallScore > 30) {
      recommendations.push('Lembre-se: é normal sentir estresse. Tente incorporar atividades prazerosas na sua rotina.');
    }

    return recommendations;
  }
}

export const stressDetectionService = new StressDetectionService();
