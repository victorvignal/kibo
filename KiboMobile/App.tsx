import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { onAuthChange, savePushToken } from './src/services/firebase';
import { sensorService } from './src/services/sensors';
import { notificationService } from './src/services/notifications';

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

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppInitializer>
        <AppNavigator />
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
});
