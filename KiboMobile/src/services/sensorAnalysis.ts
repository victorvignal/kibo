/**
 * Sensor Analysis Service
 *
 * Advanced sensor data processing:
 * - Step counting (pedometer)
 * - Activity classification (walking, running, sitting, etc.)
 * - Sleep quality estimation
 * - Anomaly detection
 */

import { AccelerometerMeasurement } from 'expo-sensors';
import { SensorReading, subscribeToSensors } from './sensorManager';

export interface ActivitySample {
  type: 'stationary' | 'walking' | 'running' | 'cycling' | 'unknown';
  confidence: number; // 0-1
  steps?: number;
  cadence?: number; // steps per minute
  duration: number; // ms
}

export interface StepEvent {
  timestamp: Date;
  confidence: number;
}

export interface SleepQualityData {
  sleepScore: number; // 0-100
  totalBedTime: number; // minutes
  actualSleepTime: number; // minutes
  wakeUps: number;
  sleepEfficiency: number; // 0-1
  recommendation: string;
}

// ─── Step Counting ──────────────────────────────────────────────────────────

const STEP_PEAK_THRESHOLD = 1.3; // g, above this is a potential step
const STEP_VALLEY_THRESHOLD = 0.7; // g, below this completes a step cycle
const STEP_MIN_INTERVAL_MS = 250; // minimum time between steps (prevents double counting)
const STEP_MAX_INTERVAL_MS = 2000; // max time to still count as walking

class StepCounter {
  private stepEvents: StepEvent[] = [];
  private lastPeakTime = 0;
  private lastStepTime = 0;
  private magnitudeBuffer: number[] = [];
  private isRising = false;
  private peakMagnitude = 0;
  private valleyMagnitude = Infinity;
  private totalSteps = 0;
  private sessionStartTime = 0;
  private sessionSteps = 0;
  private windowStartTime = 0;
  private windowSteps = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.stepEvents = [];
    this.lastPeakTime = 0;
    this.lastStepTime = 0;
    this.magnitudeBuffer = [];
    this.isRising = false;
    this.peakMagnitude = 0;
    this.valleyMagnitude = Infinity;
    this.totalSteps = 0;
    this.sessionStartTime = Date.now();
    this.sessionSteps = 0;
    this.windowStartTime = Date.now();
    this.windowSteps = 0;
  }

  processAccelerometer(data: AccelerometerMeasurement): StepEvent | null {
    const { x, y, z } = data;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();

    this.magnitudeBuffer.push(magnitude);
    if (this.magnitudeBuffer.length > 50) {
      this.magnitudeBuffer.shift();
    }

    // Step detection using peak-valley algorithm
    if (magnitude > this.peakMagnitude) {
      this.peakMagnitude = magnitude;
    }
    if (magnitude < this.valleyMagnitude) {
      this.valleyMagnitude = magnitude;
    }

    // Rising edge detection
    if (!this.isRising && magnitude > STEP_PEAK_THRESHOLD) {
      this.isRising = true;
      this.lastPeakTime = now;
    }

    // Step confirmed when we see a valley after a peak
    if (this.isRising && magnitude < STEP_VALLEY_THRESHOLD) {
      const timeSinceLastPeak = now - this.lastPeakTime;

      if (
        timeSinceLastPeak > STEP_MIN_INTERVAL_MS &&
        now - this.lastStepTime < STEP_MAX_INTERVAL_MS
      ) {
        // Valid step detected
        const interval = now - this.lastStepTime;
        this.lastStepTime = now;
        this.sessionSteps++;
        this.windowSteps++;

        const stepEvent: StepEvent = {
          timestamp: new Date(now),
          confidence: Math.min(1, Math.abs(this.peakMagnitude - 1) / 0.5),
        };
        this.stepEvents.push(stepEvent);
        this.totalSteps++;

        // Reset peak/valley tracking
        this.peakMagnitude = 0;
        this.valleyMagnitude = Infinity;
        this.isRising = false;

        // Update window cadence every 10 steps
        if (this.windowSteps >= 10) {
          const windowDuration = now - this.windowStartTime;
          const windowCadence = (this.windowSteps / windowDuration) * 60000;
          this.windowStartTime = now;
          this.windowSteps = 0;
        }

        return stepEvent;
      }

      this.isRising = false;
    }

    return null;
  }

  getSessionSteps(): number {
    return this.sessionSteps;
  }

  getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }

  getCadence(): number {
    const duration = this.getSessionDuration();
    if (duration < 1000) return 0;
    return Math.round((this.sessionSteps / duration) * 60000);
  }

  getRecentSteps(minutes = 5): number {
    const cutoff = Date.now() - minutes * 60000;
    return this.stepEvents.filter(e => e.timestamp.getTime() > cutoff).length;
  }
}

// ─── Activity Classification ─────────────────────────────────────────────────

interface ActivityClassifier {
  name: 'stationary' | 'walking' | 'running' | 'cycling' | 'unknown';
  minMagnitude: number;
  maxMagnitude: number;
  minCadence: number;
  maxCadence: number;
  varianceThreshold: number;
}

const ACTIVITY_PROFILES: ActivityClassifier[] = [
  {
    name: 'stationary',
    minMagnitude: 0.95,
    maxMagnitude: 1.05,
    minCadence: 0,
    maxCadence: 10,
    varianceThreshold: 0.02,
  },
  {
    name: 'walking',
    minMagnitude: 0.5,
    maxMagnitude: 2.0,
    minCadence: 40,
    maxCadence: 130,
    varianceThreshold: 0.1,
  },
  {
    name: 'running',
    minMagnitude: 0.3,
    maxMagnitude: 3.0,
    minCadence: 130,
    maxCadence: 220,
    varianceThreshold: 0.3,
  },
  {
    name: 'cycling',
    minMagnitude: 0.8,
    maxMagnitude: 1.2,
    minCadence: 40,
    maxCadence: 120,
    varianceThreshold: 0.05,
  },
];

function classifyActivity(
  avgMagnitude: number,
  variance: number,
  cadence: number
): { type: 'stationary' | 'walking' | 'running' | 'cycling' | 'unknown'; confidence: number } {
  let bestMatch: { type: 'stationary' | 'walking' | 'running' | 'cycling' | 'unknown'; confidence: number } = { type: 'unknown', confidence: 0 };

  for (const profile of ACTIVITY_PROFILES) {
    const magnitudeInRange =
      avgMagnitude >= profile.minMagnitude &&
      avgMagnitude <= profile.maxMagnitude;
    const cadenceInRange =
      cadence >= profile.minCadence && cadence <= profile.maxCadence;
    const varianceMatches =
      variance >= profile.varianceThreshold * 0.5 &&
      variance <= profile.varianceThreshold * 3;

    if (magnitudeInRange && cadenceInRange) {
      let confidence = 0.5;
      if (magnitudeInRange) confidence += 0.2;
      if (cadenceInRange) confidence += 0.2;
      if (varianceMatches) confidence += 0.1;

      if (confidence > bestMatch.confidence) {
        bestMatch = { type: profile.name, confidence };
      }
    }
  }

  return { type: bestMatch.type, confidence: bestMatch.confidence };
}

// ─── Sleep Quality Estimation ───────────────────────────────────────────────

export interface MotionSample {
  timestamp: Date;
  magnitude: number;
}

export function estimateSleepQuality(
  motionSamples: MotionSample[],
  bedtime: Date,
  wakeTime: Date
): SleepQualityData {
  if (motionSamples.length < 10) {
    return {
      sleepScore: 0,
      totalBedTime: 0,
      actualSleepTime: 0,
      wakeUps: 0,
      sleepEfficiency: 0,
      recommendation: 'Dados insuficientes para análise de sono.',
    };
  }

  const totalBedTime = (wakeTime.getTime() - bedtime.getTime()) / 60000; // minutes

  // Motion thresholds
  const SLEEP_THRESHOLD = 1.02; // magnitude below this = sleeping
  const WAKE_THRESHOLD = 1.05; // magnitude above this = awake

  let asleepTime = 0;
  let wakeUps = 0;
  let inSleepPhase = false;
  let consecutiveWakeSamples = 0;
  const WAKE_MIN_SAMPLES = 6; // at least 6 consecutive samples (~30s) to count as wake-up

  // Sort by timestamp
  const sorted = [...motionSamples].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  for (let i = 0; i < sorted.length; i++) {
    const sample = sorted[i];
    const isMoving = sample.magnitude > WAKE_THRESHOLD;
    const isDefinitelySleeping = sample.magnitude < SLEEP_THRESHOLD;

    if (isMoving) {
      consecutiveWakeSamples++;
      if (consecutiveWakeSamples >= WAKE_MIN_SAMPLES && inSleepPhase) {
        wakeUps++;
        inSleepPhase = false;
      }
    } else {
      if (isDefinitelySleeping && consecutiveWakeSamples > 0) {
        // Transitioning back to sleep
      }
      if (consecutiveWakeSamples > 0) {
        consecutiveWakeSamples--;
      }
      asleepTime += 30; // Assume 30s sample intervals
      inSleepPhase = true;
    }
  }

  const actualSleepTime = motionSamples.filter(
    s => s.magnitude < SLEEP_THRESHOLD
  ).length * 0.5; // rough estimate in minutes

  const sleepEfficiency = Math.min(1, actualSleepTime / totalBedTime);
  const sleepScore = Math.round(sleepEfficiency * 100);

  let recommendation: string;
  if (sleepScore >= 85) {
    recommendation =
      'Sono excelente! Continue mantendo seus hábitos atuais. 😴✨';
  } else if (sleepScore >= 70) {
    recommendation =
      'Sono razoável. Tente manter horários mais regulares de sono.';
  } else if (sleepScore >= 50) {
    recommendation =
      'Sono abaixo do ideal. Evite telas antes de dormir e reduza a cafeína à tarde.';
  } else {
    recommendation =
      'Sono comprometido. Procure manter um ambiente escuro e fresco no quarto. Se persistir, considere consultar um profissional.';
  }

  return {
    sleepScore,
    totalBedTime: Math.round(totalBedTime),
    actualSleepTime: Math.round(actualSleepTime),
    wakeUps,
    sleepEfficiency: Math.round(sleepEfficiency * 100) / 100,
    recommendation,
  };
}

// ─── Sensor Analysis Service ─────────────────────────────────────────────────

class SensorAnalysisService {
  private stepCounter = new StepCounter();
  private magnitudeHistory: { magnitude: number; timestamp: number }[] = [];
  private unsubscribe: (() => void) | null = null;
  private lastActivity: ActivitySample = {
    type: 'unknown',
    confidence: 0,
    duration: 0,
  };
  private isListening = false;

  private readonly MAGNITUDE_WINDOW_MS = 60000; // 1 minute window for activity classification

  start() {
    if (this.isListening) return;
    this.isListening = true;
    this.stepCounter.reset();

    // Subscribe to global sensor manager instead of direct accelerometer listener
    // This avoids duplicate sensor subscriptions
    this.unsubscribe = subscribeToSensors((reading: SensorReading) => {
      if (reading.accelerometer) {
        const data = reading.accelerometer;
        // Step counting
        this.stepCounter.processAccelerometer(data);

        // Magnitude history for activity classification
        const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
        const now = Date.now();

        this.magnitudeHistory.push({ magnitude, timestamp: now });

        // Keep only last 60 seconds
        this.magnitudeHistory = this.magnitudeHistory.filter(
          m => now - m.timestamp < this.MAGNITUDE_WINDOW_MS
        );
      }
    });
  }

  stop() {
    if (!this.isListening) return;
    this.isListening = false;

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  getSteps(): number {
    return this.stepCounter.getSessionSteps();
  }

  getCadence(): number {
    return this.stepCounter.getCadence();
  }

  getCurrentActivity(): ActivitySample {
    const now = Date.now();
    const recentMagnitudes = this.magnitudeHistory
      .filter(m => now - m.timestamp < 10000) // last 10 seconds
      .map(m => m.magnitude);

    if (recentMagnitudes.length < 5) {
      return { type: 'unknown', confidence: 0, duration: 0 };
    }

    const avg = recentMagnitudes.reduce((a, b) => a + b, 0) / recentMagnitudes.length;
    const variance =
      recentMagnitudes.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) /
      recentMagnitudes.length;
    const cadence = this.stepCounter.getCadence();

    const activityResult = classifyActivity(avg, variance, cadence);

    return {
      type: activityResult.type,
      confidence: activityResult.confidence,
      steps: this.stepCounter.getSessionSteps(),
      cadence,
      duration: this.stepCounter.getSessionDuration(),
    };
  }

  getRecentActivity(minutes = 5): {
    steps: number;
    avgMagnitude: number;
    activityLevel: number;
  } {
    const cutoff = Date.now() - minutes * 60000;
    const recentMagnitudes = this.magnitudeHistory
      .filter(m => m.timestamp > cutoff)
      .map(m => m.magnitude);

    if (recentMagnitudes.length === 0) {
      return { steps: this.stepCounter.getRecentSteps(minutes), avgMagnitude: 1, activityLevel: 0 };
    }

    const avg = recentMagnitudes.reduce((a, b) => a + b, 0) / recentMagnitudes.length;
    const activityLevel = Math.min(100, Math.max(0, (avg - 1) * 200));

    return {
      steps: this.stepCounter.getRecentSteps(minutes),
      avgMagnitude: Math.round(avg * 100) / 100,
      activityLevel: Math.round(activityLevel),
    };
  }

  getActivityHistory(
    intervalMinutes = 5
  ): Array<{ startTime: Date; endTime: Date; avgMagnitude: number; steps: number; activityType: string }> {
    const now = Date.now();
    const intervals: Array<{
      startTime: Date;
      endTime: Date;
      avgMagnitude: number;
      steps: number;
      activityType: string;
    }> = [];

    // Go back 24 hours in 5-minute intervals
    for (let offset = 0; offset < 24 * 60; offset += intervalMinutes) {
      const intervalEnd = now - offset * 60000;
      const intervalStart = intervalEnd - intervalMinutes * 60000;

      const intervalMagnitudes = this.magnitudeHistory
        .filter(m => m.timestamp >= intervalStart && m.timestamp < intervalEnd)
        .map(m => m.magnitude);

      if (intervalMagnitudes.length > 0) {
        const avg = intervalMagnitudes.reduce((a, b) => a + b, 0) / intervalMagnitudes.length;
        const variance =
          intervalMagnitudes.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) /
          intervalMagnitudes.length;

        // Estimate steps in this interval (rough)
        const estimatedSteps = Math.round(
          (intervalMagnitudes.length / 20) * (avg > 1.1 ? (avg - 1) * 20 : 0)
        );

        const activityResult = classifyActivity(avg, variance, 0);
    const type = activityResult.type;

        intervals.push({
          startTime: new Date(intervalStart),
          endTime: new Date(intervalEnd),
          avgMagnitude: Math.round(avg * 100) / 100,
          steps: estimatedSteps,
          activityType: type,
        });
      }
    }

    return intervals.reverse();
  }
}

export const sensorAnalysisService = new SensorAnalysisService();
