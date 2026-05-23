/**
 * Sensor Manager - Single source of truth for sensor data
 *
 * Coordinates all sensor subscriptions to avoid duplicate listeners.
 * Routes data to:
 * 1. SensorService (Firebase storage)
 * 2. SensorAnalysisService (real-time analysis)
 *
 * Architecture: Each accelerometer event creates ONE new reading in the buffer.
 * Gyroscope/magnetometer data is MERGED into the latest reading (not a new one).
 * This prevents buffer flooding at 10Hz x 3 sensors = 30 partial readings/sec.
 */

import { Accelerometer, Gyroscope, Magnetometer, AccelerometerMeasurement } from 'expo-sensors';
import * as Location from 'expo-location';

export interface SensorReading {
  accelerometer: AccelerometerMeasurement | null;
  gyroscope: { x: number; y: number; z: number } | null;
  magnetometer: { x: number; y: number; z: number } | null;
  location: { latitude: number; longitude: number; altitude: number | null } | null;
  timestamp: Date;
}

// Global sensor data buffer for sharing between services
const globalBuffer: SensorReading[] = [];
const MAX_GLOBAL_BUFFER = 200;

// Callbacks for other services to subscribe to sensor data
type SensorCallback = (reading: SensorReading) => void;
const subscribers: Set<SensorCallback> = new Set();

let isTracking = false;
let accelSub: { remove: () => void } | null = null;
let gyroSub: { remove: () => void } | null = null;
let magSub: { remove: () => void } | null = null;
let flushInterval: ReturnType<typeof setInterval> | null = null;
let locationInterval: ReturnType<typeof setInterval> | null = null;
let lastLocation: { latitude: number; longitude: number; altitude: number | null } | null = null;

function pushReadingToBuffer(reading: SensorReading) {
  // Enforce max buffer size (FIFO eviction)
  if (globalBuffer.length >= MAX_GLOBAL_BUFFER) {
    globalBuffer.shift();
  }
  globalBuffer.push(reading);
}

function notifySubscribers(reading: SensorReading) {
  for (const cb of subscribers) {
    try {
      cb(reading);
    } catch (e) {
      console.warn('Sensor subscriber error:', e);
    }
  }
}

export function subscribeToSensors(callback: SensorCallback): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export function getLatestReading(): SensorReading | null {
  return globalBuffer.length > 0 ? globalBuffer[globalBuffer.length - 1] : null;
}

export function getBufferSize(): number {
  return globalBuffer.length;
}

export function getGlobalBuffer(): SensorReading[] {
  return [...globalBuffer];
}

export function clearGlobalBuffer() {
  globalBuffer.length = 0;
}

async function updateLocation() {
  try {
    const location = await Location.getCurrentPositionAsync({});
    lastLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
    };
  } catch {
    // Location unavailable - silently ignore
  }
}

export async function startSensorTracking(): Promise<void> {
  if (isTracking) return;
  isTracking = true;

  // Request permissions
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('SensorManager: Location permission not granted');
    }
  } catch {
    // Platform doesn't support this permission request
  }

  // Accelerometer is the primary driver - each event creates one reading entry
  Accelerometer.setUpdateInterval(100); // 10 Hz
  accelSub = Accelerometer.addListener((accelData) => {
    const reading: SensorReading = {
      accelerometer: accelData,
      gyroscope: null,
      magnetometer: null,
      location: lastLocation,
      timestamp: new Date(),
    };
    pushReadingToBuffer(reading);
    notifySubscribers(reading);
  });

  // Gyroscope MERGES into the latest reading (no new buffer entry)
  Gyroscope.setUpdateInterval(100);
  gyroSub = Gyroscope.addListener((gyroData) => {
    if (globalBuffer.length === 0) return;
    const last = globalBuffer[globalBuffer.length - 1];
    last.gyroscope = gyroData;
    // Don't notify here - accelerometer already did
  });

  // Magnetometer MERGES into the latest reading (no new buffer entry)
  Magnetometer.setUpdateInterval(100);
  magSub = Magnetometer.addListener((magData) => {
    if (globalBuffer.length === 0) return;
    const last = globalBuffer[globalBuffer.length - 1];
    last.magnetometer = magData;
    // Don't notify here - accelerometer already did
  });

  // Initial location
  await updateLocation();

  // Update location every 30 seconds
  locationInterval = setInterval(updateLocation, 30000);
}

export function stopSensorTracking(): void {
  if (!isTracking) return;
  isTracking = false;

  accelSub?.remove();
  gyroSub?.remove();
  magSub?.remove();
  accelSub = null;
  gyroSub = null;
  magSub = null;

  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }

  if (locationInterval) {
    clearInterval(locationInterval);
    locationInterval = null;
  }
}

export function isSensorTracking(): boolean {
  return isTracking;
}

export function getLastLocation(): { latitude: number; longitude: number; altitude: number | null } | null {
  return lastLocation;
}
