import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricResult {
  success: boolean;
  error?: string;
}

/**
 * Check if the device supports biometric authentication
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Get the type of biometric authentication available
 */
export async function getBiometricType(): Promise<'fingerprint' | 'facial' | 'iris' | 'none'> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'facial';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }
    return 'none';
  } catch {
    return 'none';
  }
}

/**
 * Authenticate using biometrics
 */
export async function authenticateWithBiometrics(
  reason: string = 'Autentique para acessar o Kibo'
): Promise<BiometricResult> {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      return { success: false, error: 'Biometria não disponível neste dispositivo' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Usar senha',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    const errorCode = (result as { success: false; error?: string }).error as string || '';
    if (errorCode === 'user_cancel') {
      return { success: false, error: 'Autenticação cancelada' };
    }
    if (errorCode === 'user_fallback') {
      return { success: false, error: 'Usuário escolheu usar senha' };
    }
    if (errorCode === 'system_cancel') {
      return { success: false, error: 'Sistema cancelou a autenticação' };
    }
    if (errorCode === 'lockout' || errorCode === 'lockout_permanent') {
      return { success: false, error: 'Muitos tentativas. Tente novamente mais tarde.' };
    }
    return { success: false, error: errorCode || 'Erro na autenticação biométrica' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro desconhecido na autenticação' };
  }
}

/**
 * Get a human-readable label for the biometric type
 */
export function getBiometricLabel(type: 'fingerprint' | 'facial' | 'iris' | 'none'): string {
  switch (type) {
    case 'facial': return 'Reconhecimento Facial';
    case 'fingerprint': return 'Impressão Digital';
    case 'iris': return 'Íris';
    default: return 'Biometria';
  }
}
