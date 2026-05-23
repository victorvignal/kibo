/**
 * Sensor Service
 *
 * Collects and stores sensor data to Firebase Firestore.
 * Uses the unified sensorManager to avoid duplicate subscriptions.
 */

import { onAuthChange } from './firebase';
import { saveSensorData } from './firebase';
import {
  startSensorTracking,
  stopSensorTracking,
  subscribeToSensors,
  getGlobalBuffer,
  clearGlobalBuffer,
  SensorReading,
} from './sensorManager';

export interface SensorData {
  accelerometer?: { x: number; y: number; z: number };
  gyroscope?: { x: number; y: number; z: number };
  magnetometer?: { x: number; y: number; z: number };
  location?: { latitude: number; longitude: number; altitude: number | null };
  timestamp: Date;
}

class SensorService {
  private userId: string | null = null;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private maxBufferSize = 100;
  private unsubscribe: (() => void) | null = null;

  async initialize(): Promise<() => void> {
    // Subscribe to auth changes
    const authUnsubscribe = onAuthChange((user) => {
      this.userId = user?.uid || null;
      if (!user) {
        clearGlobalBuffer();
      }
    });

    return () => {
      authUnsubscribe();
    };
  }

  async startTracking() {
    if (this.unsubscribe) return; // Already tracking

    // Subscribe to sensor data via the manager
    this.unsubscribe = subscribeToSensors((_reading: SensorReading) => {
      // Data is automatically added to the global buffer by sensorManager
      // We just need to periodically flush to Firebase
    });

    // Start the sensor manager
    await startSensorTracking();

    // Flush buffer periodically (every 30s)
    this.flushInterval = setInterval(() => {
      this.flushToFirebase();
    }, 30000);

    // Also flush when buffer gets too large
    setInterval(() => {
      const buffer = getGlobalBuffer();
      if (buffer.length >= this.maxBufferSize) {
        this.flushToFirebase();
      }
    }, 15000);
  }

  async flushToFirebase() {
    if (this.isFlushing) return;
    if (!this.userId) return;

    const dataToSave = getGlobalBuffer();
    if (dataToSave.length === 0) return;

    this.isFlushing = true;
    clearGlobalBuffer();

    try {
      await saveSensorData(this.userId, {
        type: 'sensor_batch',
        readings: dataToSave,
        count: dataToSave.length,
        flushedAt: new Date().toISOString(),
      });
      console.log(`SensorService: Flushed ${dataToSave.length} readings to Firebase`);
    } catch (error) {
      console.error('Failed to save sensor data:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  getIsTracking(): boolean {
    const { isSensorTracking } = require('./sensorManager');
    return isSensorTracking();
  }

  stopTracking() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    stopSensorTracking();

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Final flush before stopping
    this.flushToFirebase();
  }

  getLatestReading(): SensorData | null {
    const { getLatestReading: getLatest } = require('./sensorManager');
    const reading = getLatest();
    if (!reading) return null;

    return {
      accelerometer: reading.accelerometer
        ? { x: reading.accelerometer.x, y: reading.accelerometer.y, z: reading.accelerometer.z }
        : undefined,
      gyroscope: reading.gyroscope || undefined,
      magnetometer: reading.magnetometer || undefined,
      location: reading.location || undefined,
      timestamp: reading.timestamp,
    };
  }

  getActivityLevel(): number {
    const { getGlobalBuffer: getBuffer } = require('./sensorManager');
    const buffer = getBuffer();

    if (buffer.length === 0) return 0;

    let totalMagnitude = 0;
    let count = 0;

    for (const reading of buffer) {
      if (reading.accelerometer) {
        const { x, y, z } = reading.accelerometer;
        totalMagnitude += Math.sqrt(x * x + y * y + z * z);
        count++;
      }
    }

    if (count === 0) return 0;

    const avgMagnitude = totalMagnitude / count;
    // Normalize: 1g (standing still) = 0, >1.5g = 100
    const normalized = Math.min(100, Math.max(0, (avgMagnitude - 1) * 200));
    return Math.round(normalized);
  }

  getBufferCount(): number {
    const { getBufferSize } = require('./sensorManager');
    return getBufferSize();
  }
}

export const sensorService = new SensorService();
