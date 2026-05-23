import { Accelerometer, Gyroscope, Magnetometer, AccelerometerMeasurement, GyroscopeMeasurement, MagnetometerMeasurement } from 'expo-sensors';
import { useState, useEffect, useCallback } from 'react';

export interface WearableData {
  accelerometer: AccelerometerMeasurement | null;
  gyroscope: GyroscopeMeasurement | null;
  magnetometer: MagnetometerMeasurement | null;
  hrv: number; // Simulated HRV (Heart Rate Variability)
  steps: number;
  timestamp: Date;
}

export interface MotionCorrelation {
  activityLevel: number; // 0-100
  movementIntensity: 'low' | 'moderate' | 'high';
  orientation: string;
  tremorScore: number; // 0-100, simulated
  correlationToMood: string;
}

// Calculate steps from accelerometer data (simplified simulation)
function calculateStepsFromAccelerometer(data: AccelerometerMeasurement): number {
  const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
  // Normal walking produces ~1g constant + ~0.3g oscillation
  // Count peaks above threshold as steps
  const stepThreshold = 1.3;
  return magnitude > stepThreshold ? 1 : 0;
}

// Simulate HRV based on accelerometer variability
function simulateHRV(accelerometerData: AccelerometerMeasurement[]): number {
  if (accelerometerData.length < 10) return 50; // Default

  // Calculate variance in accelerometer readings
  const magnitudes = accelerometerData.map(d => Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z));
  const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  const variance = magnitudes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / magnitudes.length;

  // Lower variance typically indicates calmer state (higher HRV)
  // Higher variance indicates more movement/anxiety (lower HRV)
  const normalizedVariance = Math.min(100, variance * 100);
  const hrv = Math.max(20, Math.min(100, 80 - normalizedVariance));

  return Math.round(hrv);
}

// Determine movement intensity
function getMovementIntensity(data: AccelerometerMeasurement): 'low' | 'moderate' | 'high' {
  const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
  const deviation = Math.abs(magnitude - 9.8); // 9.8 m/s² is resting

  if (deviation < 0.5) return 'low';
  if (deviation < 1.5) return 'moderate';
  return 'high';
}

// Determine device orientation from magnetometer
function getOrientationFromMagnetometer(data: MagnetometerMeasurement): string {
  const { x, y } = data;
  const angle = Math.atan2(y, x) * (180 / Math.PI);

  if (angle > -22.5 && angle <= 22.5) return 'Norte';
  if (angle > 22.5 && angle <= 67.5) return 'Nordeste';
  if (angle > 67.5 && angle <= 112.5) return 'Leste';
  if (angle > 112.5 && angle <= 157.5) return 'Sudeste';
  if (angle > 157.5 || angle <= -157.5) return 'Sul';
  if (angle > -157.5 && angle <= -112.5) return 'Sudoeste';
  if (angle > -112.5 && angle <= -67.5) return 'Oeste';
  return 'Noroeste';
}

export function useWearableData() {
  const [accelerometer, setAccelerometer] = useState<AccelerometerMeasurement[]>([]);
  const [gyroscope, setGyroscope] = useState<GyroscopeMeasurement | null>(null);
  const [magnetometer, setMagnetometer] = useState<MagnetometerMeasurement | null>(null);
  const [hrv, setHrv] = useState(50);
  const [steps, setSteps] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  // Keep a rolling buffer of accelerometer readings for HRV calculation
  const [accelBuffer, setAccelBuffer] = useState<AccelerometerMeasurement[]>([]);

  useEffect(() => {
    // Set update intervals
    Accelerometer.setUpdateInterval(100); // 10Hz
    Gyroscope.setUpdateInterval(100);
    Magnetometer.setUpdateInterval(100);

    // Subscribe to accelerometer
    const accelSubscription = Accelerometer.addListener((data) => {
      setAccelerometer(prev => {
        const newBuffer = [...prev, data].slice(-50); // Keep last 50 readings
        setAccelBuffer(newBuffer);
        return newBuffer;
      });
      // Count step
      setSteps(prev => prev + calculateStepsFromAccelerometer(data));
    });

    // Subscribe to gyroscope
    const gyroSubscription = Gyroscope.addListener((data) => {
      setGyroscope(data);
    });

    // Subscribe to magnetometer
    const magSubscription = Magnetometer.addListener((data) => {
      setMagnetometer(data);
    });

    setIsTracking(true);

    // Simulate HRV updates every 5 seconds
    const hrvInterval = setInterval(() => {
      setAccelBuffer(current => {
        const simulatedHrv = simulateHRV(current);
        setHrv(simulatedHrv);
        return current;
      });
    }, 5000);

    return () => {
      accelSubscription.remove();
      gyroSubscription.remove();
      magSubscription.remove();
      clearInterval(hrvInterval);
      setIsTracking(false);
    };
  }, []);

  // Get correlation to mood
  const getCorrelationToMood = useCallback((activityLevel: number): string => {
    if (activityLevel > 70) {
      return 'Alta correlação: atividade física elevada está associada a melhora de humor.';
    }
    if (activityLevel > 40) {
      return 'Correlação moderada: movimento regular pode ajudar no bem-estar.';
    }
    if (activityLevel > 20) {
      return 'Atividade baixa detectada. Tente incorporar mais movimento no dia.';
    }
    return 'Monitorando padrão de movimento...';
  }, []);

  // Calculate activity level from accelerometer
  const getActivityLevel = useCallback((): number => {
    if (accelerometer.length === 0) return 0;
    const recent = accelerometer.slice(-10);
    const avgMagnitude = recent.reduce((sum, d) => sum + Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z), 0) / recent.length;
    // Normalize: 9.8 (resting) = 0, 11+ (moving) = 100
    const activity = Math.min(100, Math.max(0, (avgMagnitude - 9.8) * 50));
    return Math.round(activity);
  }, [accelerometer]);

  // Get motion correlation
  const getMotionCorrelation = useCallback((): MotionCorrelation => {
    const activityLevel = getActivityLevel();
    const intensity = accelerometer.length > 0 ? getMovementIntensity(accelerometer[accelerometer.length - 1]) : 'low';
    const orientation = magnetometer ? getOrientationFromMagnetometer(magnetometer) : 'Calculando...';

    // Simulate tremor score based on gyroscope magnitude
    let tremorScore = 0;
    if (gyroscope) {
      const gyroMag = Math.sqrt(gyroscope.x * gyroscope.x + gyroscope.y * gyroscope.y + gyroscope.z * gyroscope.z);
      tremorScore = Math.min(100, Math.round(gyroMag * 100));
    }

    return {
      activityLevel,
      movementIntensity: intensity,
      orientation,
      tremorScore,
      correlationToMood: getCorrelationToMood(activityLevel),
    };
  }, [accelerometer, gyroscope, magnetometer, getActivityLevel, getCorrelationToMood]);

  return {
    accelerometer: accelerometer.length > 0 ? accelerometer[accelerometer.length - 1] : null,
    gyroscope,
    magnetometer,
    hrv,
    steps,
    isTracking,
    activityLevel: getActivityLevel(),
    motionCorrelation: getMotionCorrelation(),
    allAccelerometerReadings: accelerometer,
    resetSteps: () => setSteps(0),
  };
}

// Format accelerometer reading for display
export function formatAccelerometer(data: AccelerometerMeasurement): string {
  return `X: ${data.x.toFixed(2)} m/s²\nY: ${data.y.toFixed(2)} m/s²\nZ: ${data.z.toFixed(2)} m/s²`;
}

// Format gyroscope reading for display
export function formatGyroscope(data: GyroscopeMeasurement): string {
  return `X: ${data.x.toFixed(2)} rad/s\nY: ${data.y.toFixed(2)} rad/s\nZ: ${data.z.toFixed(2)} rad/s`;
}

// Format magnetometer reading for display
export function formatMagnetometer(data: MagnetometerMeasurement): string {
  return `X: ${data.x.toFixed(2)} μT\nY: ${data.y.toFixed(2)} μT\nZ: ${data.z.toFixed(2)} μT`;
}

// Get HRV status description
export function getHrvStatus(hrv: number): { label: string; description: string; color: string } {
  if (hrv >= 70) {
    return {
      label: 'Excelente',
      description: 'Sistema nervoso relaxado e resistente ao estresse',
      color: '#059669',
    };
  }
  if (hrv >= 50) {
    return {
      label: 'Bom',
      description: 'Variabilidade saudável, bom equilíbrio autonômico',
      color: '#10B981',
    };
  }
  if (hrv >= 30) {
    return {
      label: 'Moderado',
      description: 'Alguns sinais de tensão ou fadiga',
      color: '#D97706',
    };
  }
  return {
    label: 'Atenção',
    description: 'Pode indicar alto nível de estresse ou fadiga',
    color: '#DC2626',
  };
}
