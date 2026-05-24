/**
 * useSensorTracking Hook
 * Manages sensor lifecycle tied to user authentication state.
 * Starts sensors on login, stops on logout.
 */

import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sensorService } from '../services/sensors';
import { sensorAnalysisService } from '../services/sensorAnalysis';
import { onAuthChange } from '../services/firebase';

const SENSOR_ENABLED_KEY = '@kibo_sensor_enabled';

export function useSensorTracking() {
  const startedRef = useRef(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      // Check user preference
      const enabled = await AsyncStorage.getItem(SENSOR_ENABLED_KEY);
      if (enabled === 'false') {
        console.log('[useSensorTracking] Sensors disabled by user preference');
        return;
      }

      // Wait for auth state to resolve, then start sensors
      unsubscribe = onAuthChange(async (user) => {
        if (user && !startedRef.current) {
          console.log('[useSensorTracking] Starting sensor tracking for user:', user.uid);
          startedRef.current = true;

          try {
            // Start sensor analysis service
            sensorAnalysisService.start();

            // Start sensor data collection
            await sensorService.startTracking();

            console.log('[useSensorTracking] Sensors started successfully');
          } catch (error) {
            console.error('[useSensorTracking] Failed to start sensors:', error);
            startedRef.current = false;
          }
        } else if (!user) {
          console.log('[useSensorTracking] User logged out, stopping sensors');
          startedRef.current = false;
          sensorService.stopTracking();
          sensorAnalysisService.stop();
        }
      });
    };

    init();

    return () => {
      unsubscribe?.();
      sensorService.stopTracking();
      sensorAnalysisService.stop();
      startedRef.current = false;
    };
  }, []);
}

/**
 * Request sensor permissions and enable tracking.
 * Call this when the user explicitly enables sensors in settings.
 */
export async function enableSensors(): Promise<{ success: boolean; error?: string }> {
  try {
    await AsyncStorage.setItem(SENSOR_ENABLED_KEY, 'true');
    const { onAuthChange } = await import('../services/firebase');
    
    // Get current user
    const { getCurrentUser } = await import('../services/firebase');
    const user = getCurrentUser();
    
    if (user) {
      sensorAnalysisService.start();
      await sensorService.startTracking();
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to enable sensors' };
  }
}

/**
 * Disable sensor tracking.
 * Call this when the user disables sensors in settings.
 */
export async function disableSensors(): Promise<void> {
  await AsyncStorage.setItem(SENSOR_ENABLED_KEY, 'false');
  sensorService.stopTracking();
  sensorAnalysisService.stop();
}

/**
 * Check if sensors are enabled by user preference.
 */
export async function areSensorsEnabled(): Promise<boolean> {
  const enabled = await AsyncStorage.getItem(SENSOR_ENABLED_KEY);
  // Default to enabled if never set
  return enabled !== 'false';
}
