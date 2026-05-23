import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { onAuthChange } from '../services/firebase';

/**
 * AuthGate renders nothing until Firebase auth is initialized.
 * Then navigates to the appropriate screen (Login or Main).
 * This prevents the flash of Login screen when user is already authenticated.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Firebase initializes async; onAuthChange fires once immediately
    // if the user is already logged in, or with null if not.
    const unsubscribe = onAuthChange(() => {
      // Give one tick for the UI to settle
      setTimeout(() => setIsReady(true), 0);
    });

    return () => unsubscribe();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <Text style={styles.logo}>🐱</Text>
        <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 16 }} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  logo: {
    fontSize: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});
