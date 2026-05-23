/**
 * Tests for Biometric Service
 * Tests device biometric authentication capabilities and error handling
 */

import {
  isBiometricAvailable,
  getBiometricType,
  authenticateWithBiometrics,
  getBiometricLabel,
} from '../services/biometric';

// We need to access the mock setters, but they're in the mock file.
// We control the mock by directly manipulating the exported functions.
import * as LocalAuthentication from 'expo-local-authentication';

describe('Biometric Service', () => {
  beforeEach(() => {
    // Reset mock implementations to default successful state
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    ]);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isBiometricAvailable()', () => {
    test('should return true when hardware exists and biometrics enrolled', async () => {
      const result = await isBiometricAvailable();
      expect(result).toBe(true);
    });

    test('should return false when hardware does not exist', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      const result = await isBiometricAvailable();
      expect(result).toBe(false);
    });

    test('should return false when biometrics not enrolled', async () => {
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      const result = await isBiometricAvailable();
      expect(result).toBe(false);
    });

    test('should return false when hasHardwareAsync throws', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockRejectedValue(new Error('Hardware error'));
      const result = await isBiometricAvailable();
      expect(result).toBe(false);
    });

    test('should return false when isEnrolledAsync throws', async () => {
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockRejectedValue(new Error('Enroll error'));
      const result = await isBiometricAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getBiometricType()', () => {
    test('should return fingerprint when fingerprint type is supported', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);
      const result = await getBiometricType();
      expect(result).toBe('fingerprint');
    });

    test('should return facial when facial recognition type is supported', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      const result = await getBiometricType();
      expect(result).toBe('facial');
    });

    test('should return iris when iris type is supported', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.IRIS,
      ]);
      const result = await getBiometricType();
      expect(result).toBe('iris');
    });

    test('should return facial when both fingerprint and facial are supported (facial has priority)', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      const result = await getBiometricType();
      // Facial recognition is checked first in the service
      expect(result).toBe('facial');
    });

    test('should return none when no types are supported', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([]);
      const result = await getBiometricType();
      expect(result).toBe('none');
    });

    test('should return none when supportedAuthenticationTypesAsync throws', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockRejectedValue(new Error('Types error'));
      const result = await getBiometricType();
      expect(result).toBe('none');
    });
  });

  describe('authenticateWithBiometrics()', () => {
    test('should return success when authentication succeeds', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
      const result = await authenticateWithBiometrics('Test reason');
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should return error when biometrics not available', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      const result = await authenticateWithBiometrics('Test reason');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometria não disponível neste dispositivo');
    });

    test('should return cancel error when user cancels', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });
      const result = await authenticateWithBiometrics('Test reason');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Autenticação cancelada');
    });

    test('should return fallback error when user chooses password', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'user_fallback',
      });
      const result = await authenticateWithBiometrics('Test reason');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuário escolheu usar senha');
    });

    test('should return system cancel error', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'system_cancel',
      });
      const result = await authenticateWithBiometrics('Test reason');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Sistema cancelou a autenticação');
    });

    test('should return lockout error when too many attempts', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'lockout',
      });
      const result = await authenticateWithBiometrics('Test reason');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Muitos tentativas. Tente novamente mais tarde.');
    });

    test('should return permanent lockout error', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'lockout_permanent',
      });
      const result = await authenticateWithBiometrics('Test reason');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Muitos tentativas. Tente novamente mais tarde.');
    });

    test('should return generic error for unknown error codes', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'unknown_error_code',
      });
      const result = await authenticateWithBiometrics('Test reason');
      expect(result.success).toBe(false);
      expect(result.error).toBe('unknown_error_code');
    });

    test('should call authenticateAsync with correct reason', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
      await authenticateWithBiometrics('Custom reason text');
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Custom reason text',
        fallbackLabel: 'Usar senha',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
    });

    test('should use default reason when none provided', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
      await authenticateWithBiometrics();
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promptMessage: 'Autentique para acessar o Kibo',
        })
      );
    });

    test('should handle authenticateAsync throwing an exception', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );
      const result = await authenticateWithBiometrics('Test reason');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });

  describe('getBiometricLabel()', () => {
    test('should return "Reconhecimento Facial" for facial type', () => {
      expect(getBiometricLabel('facial')).toBe('Reconhecimento Facial');
    });

    test('should return "Impressão Digital" for fingerprint type', () => {
      expect(getBiometricLabel('fingerprint')).toBe('Impressão Digital');
    });

    test('should return "Íris" for iris type', () => {
      expect(getBiometricLabel('iris')).toBe('Íris');
    });

    test('should return "Biometria" for none type', () => {
      expect(getBiometricLabel('none')).toBe('Biometria');
    });
  });
});
