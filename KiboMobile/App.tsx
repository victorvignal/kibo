import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import { onAuthChange, savePushToken } from './src/services/firebase';
import { sensorService } from './src/services/sensors';
import { notificationService } from './src/services/notifications';
import { authenticateWithBiometrics, isBiometricAvailable } from './src/services/biometric';

const BIOMETRIC_LOCK_KEY = 'biometric_lock';

function BiometricLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
    // Auto-prompt on mount
    setTimeout(() => promptBiometric(), 500);
  }, []);

  const promptBiometric = async () => {
    setError(null);
    const result = await authenticateWithBiometrics('Desbloqueie para acessar o Kibo');
    if (result.success) {
      onUnlock();
    } else if (result.error && !result.error.includes('cancelada')) {
      setError(result.error);
    }
  };

  return (
    <View style={styles.lockScreen}>
      <Text style={styles.lockLogo}>🐱</Text>
      <Text style={styles.lockTitle}>Kibo</Text>
      <Text style={styles.lockSubtitle}>Autenticação necessária</Text>
      
      {error && (
        <View style={styles.lockError}>
          <Text style={styles.lockErrorText}>{error}</Text>
        </View>
      )}
      
      <TouchableOpacity style={styles.lockButton} onPress={promptBiometric}>
        <Text style={styles.lockButtonEmoji}>
          {biometricAvailable ? '👆' : '🔐'}
        </Text>
        <Text style={styles.lockButtonText}>
          {biometricAvailable ? 'Tentar novamente' : 'Autenticar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let sensorUnsubscribe: (() => void) | null = null;

    const init = async () => {
      try {
        // Initialize notification service
        await notificationService.initialize();

        // Initialize sensor service (subscribes to auth changes internally)
        sensorUnsubscribe = await sensorService.initialize();

        // Auto-schedule default notifications (harmless if already scheduled)
        await notificationService.scheduleDailyReminder(9, 0);
        await notificationService.scheduleWeeklyReport(1, 10, 0);

        // Register Expo push token in Firestore (for server-side push notifications)
        const pushToken = notificationService.getToken();
        if (pushToken) {
          try {
            const { getCurrentUser } = await import('./src/services/firebase');
            const user = getCurrentUser();
            if (user) {
              await savePushToken(user.uid, pushToken);
              console.log('Push token registered for user:', user.uid);
            }
          } catch (e) {
            console.warn('Could not register push token (no user yet):', e);
          }
        }

        if (isMounted) {
          setIsReady(true);
        }
      } catch (error) {
        console.error('App initialization error:', error);
        if (isMounted) {
          setInitError('Erro ao inicializar. Tente novamente.');
        }
      }
    };

    init();

    // Start sensor tracking when user logs in
    const authUnsubscribe = onAuthChange(async (user) => {
      if (user) {
        sensorService.startTracking();
        console.log('Sensor tracking started for user:', user.uid);

        // Register Expo push token in Firestore for this user
        const pushToken = notificationService.getToken();
        if (pushToken) {
          try {
            await savePushToken(user.uid, pushToken);
            console.log('Push token registered for user:', user.uid);
          } catch (e) {
            console.warn('Failed to register push token:', e);
          }
        }
      } else {
        sensorService.stopTracking();
        console.log('Sensor tracking stopped');
      }
    });

    return () => {
      isMounted = false;
      authUnsubscribe();
      if (sensorUnsubscribe) sensorUnsubscribe();
    };
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingLogo}>🐱</Text>
        <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 16 }} />
        <Text style={styles.loadingText}>
          {initError || 'Inicializando Kibo...'}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

function BiometricGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [locked, setLocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check biometric lock preference
        try {
          const lockEnabled = await AsyncStorage.getItem(BIOMETRIC_LOCK_KEY);
          if (lockEnabled === 'true') {
            setLocked(true);
          }
        } catch {
          // Ignore
        }
      }
      setChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Show nothing while checking auth state
  if (!checked) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingLogo}>🐱</Text>
        <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 16 }} />
      </View>
    );
  }

  // If user is not logged in, don't lock (LoginScreen handles auth)
  if (!user) {
    return <>{children}</>;
  }

  // If locked, show biometric prompt
  if (locked) {
    return (
      <BiometricLockScreen onUnlock={() => setLocked(false)} />
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppInitializer>
        <BiometricGate>
          <AppNavigator />
        </BiometricGate>
      </AppInitializer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingLogo: {
    fontSize: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  // Biometric lock screen
  lockScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 32,
  },
  lockLogo: {
    fontSize: 80,
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7C3AED',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 40,
    textAlign: 'center',
  },
  lockError: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    maxWidth: 280,
  },
  lockErrorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  lockButtonEmoji: {
    fontSize: 24,
  },
  lockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
