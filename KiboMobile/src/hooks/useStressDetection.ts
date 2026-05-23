import { useState, useEffect, useCallback, useRef } from 'react';
import { stressDetectionService, StressAssessment } from '../services/stressDetection';
import { sensorAnalysisService } from '../services/sensorAnalysis';

export interface StressState {
  assessment: StressAssessment | null;
  quickLevel: { level: string; color: string; emoji: string };
  isAnalyzing: boolean;
}

export function useStressDetection(pollIntervalMs = 30000) {
  const [state, setState] = useState<StressState>({
    assessment: null,
    quickLevel: { level: 'Carregando...', color: '#6B7280', emoji: '⏳' },
    isAnalyzing: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const analyze = useCallback(() => {
    setState(prev => ({ ...prev, isAnalyzing: true }));

    const currentActivity = sensorAnalysisService.getCurrentActivity();
    const recentActivity = sensorAnalysisService.getRecentActivity(30);

    const assessment = stressDetectionService.analyze(currentActivity, recentActivity);
    const quickLevel = stressDetectionService.getQuickAssessment();

    setState({
      assessment,
      quickLevel,
      isAnalyzing: false,
    });
  }, []);

  useEffect(() => {
    // Initial analysis
    analyze();

    // Set up periodic analysis
    intervalRef.current = setInterval(analyze, pollIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [analyze, pollIntervalMs]);

  return {
    ...state,
    recommendations: state.assessment 
      ? stressDetectionService.getRecommendations(
          sensorAnalysisService.getCurrentActivity(),
          sensorAnalysisService.getRecentActivity(30)
        )
      : [],
    refresh: analyze,
  };
}
