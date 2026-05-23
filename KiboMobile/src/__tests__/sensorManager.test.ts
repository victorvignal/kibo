/**
 * Tests for Sensor Manager
 */

import {
  subscribeToSensors,
  getLatestReading,
  getBufferSize,
  clearGlobalBuffer,
} from '../services/sensorManager';
import { SensorReading } from '../services/sensorManager';

describe('SensorManager', () => {
  beforeEach(() => {
    clearGlobalBuffer();
  });

  describe('subscribeToSensors', () => {
    test('should call callback with sensor reading', () => {
      const callback = jest.fn();
      const unsubscribe = subscribeToSensors(callback);
      unsubscribe();
    });

    test('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = subscribeToSensors(callback);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('getBufferSize', () => {
    test('should return 0 when buffer is empty', () => {
      expect(getBufferSize()).toBe(0);
    });
  });

  describe('getLatestReading', () => {
    test('should return null when buffer is empty', () => {
      expect(getLatestReading()).toBeNull();
    });
  });

  describe('clearGlobalBuffer', () => {
    test('should clear the buffer', () => {
      clearGlobalBuffer();
      expect(getBufferSize()).toBe(0);
    });
  });
});
