import { useState, useEffect } from 'react';
import { isBiometricAvailable, getBiometricType, authenticateWithBiometrics, getBiometricLabel } from '../services/biometric';

/**
 * Hook for biometric authentication state and operations.
 */
export function useBiometric() {
  const [available, setAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'facial' | 'iris' | 'none'>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const avail = await isBiometricAvailable();
      setAvailable(avail);
      if (avail) {
        const type = await getBiometricType();
        setBiometricType(type);
      }
      setLoading(false);
    };
    check();
  }, []);

  const authenticate = async (reason?: string) => {
    return authenticateWithBiometrics(reason);
  };

  const label = getBiometricLabel(biometricType);

  return {
    available,
    biometricType,
    label,
    loading,
    authenticate,
  };
}
