/**
 * Mock for sensorManager
 */

const mockBuffer: any[] = [];

export const subscribeToSensors = jest.fn((callback: (reading: any) => void) => {
  return () => {};
});

export const startSensorTracking = jest.fn();
export const stopSensorTracking = jest.fn();
export const isSensorTracking = jest.fn(() => false);
export const getLatestReading = jest.fn(() => null);
export const getBufferSize = jest.fn(() => mockBuffer.length);
export const getGlobalBuffer = jest.fn(() => [...mockBuffer]);
export const clearGlobalBuffer = jest.fn(() => mockBuffer.length = 0);
export const getLastLocation = jest.fn(() => null);

export type SensorReading = {
  accelerometer: { x: number; y: number; z: number } | null;
  gyroscope: { x: number; y: number; z: number } | null;
  magnetometer: { x: number; y: number; z: number } | null;
  location: { latitude: number; longitude: number; altitude: number | null } | null;
  timestamp: Date;
};
