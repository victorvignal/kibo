import { useState, useEffect, useRef, useCallback } from 'react';
import { sensorAnalysisService, ActivitySample } from '../services/sensorAnalysis';
import { sensorService } from '../services/sensors';

export interface SensorAnalysisState {
  steps: number;
  cadence: number;
  currentActivity: ActivitySample;
  activityLevel: number;
  avgMagnitude: number;
  isTracking: boolean;
}

export function useSensorAnalysis(pollIntervalMs = 2000) {
  const [state, setState] = useState<SensorAnalysisState>({
    steps: 0,
    cadence: 0,
    currentActivity: { type: 'unknown', confidence: 0, duration: 0 },
    activityLevel: 0,
    avgMagnitude: 1,
    isTracking: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const update = useCallback(() => {
    const recentActivity = sensorAnalysisService.getRecentActivity(5);
    const currentActivity = sensorAnalysisService.getCurrentActivity();

    setState({
      steps: recentActivity.steps,
      cadence: currentActivity.cadence || 0,
      currentActivity,
      activityLevel: recentActivity.activityLevel,
      avgMagnitude: recentActivity.avgMagnitude,
      isTracking: sensorService.getIsTracking(),
    });
  }, []);

  useEffect(() => {
    // Start sensor analysis if tracking is active
    const checkAndStart = () => {
      if (sensorService.getIsTracking() && !intervalRef.current) {
        sensorAnalysisService.start();
      }
    };

    // Poll at the specified interval
    intervalRef.current = setInterval(() => {
      checkAndStart();
      update();
    }, pollIntervalMs);

    // Initial update
    update();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      sensorAnalysisService.stop();
    };
  }, [pollIntervalMs, update]);

  return state;
}
