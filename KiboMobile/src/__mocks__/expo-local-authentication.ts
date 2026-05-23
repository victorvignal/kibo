/**
 * Mock for expo-local-authentication
 */

export const AuthenticationType = {
  FINGERPRINT: 1,
  FACIAL_RECOGNITION: 2,
  IRIS: 3,
};

// Mutable mock state
let _hasHardware = true;
let _isEnrolled = true;
let _supportedTypes: number[] = [AuthenticationType.FINGERPRINT];
let _authResult: { success: boolean; error?: string } = { success: true, error: undefined };

export const hasHardwareAsync = jest.fn(() => Promise.resolve(_hasHardware));
export const isEnrolledAsync = jest.fn(() => Promise.resolve(_isEnrolled));
export const supportedAuthenticationTypesAsync = jest.fn(() => Promise.resolve(_supportedTypes));
export const authenticateAsync = jest.fn(() => Promise.resolve(_authResult));

// Test helpers to control mock behavior
export function __resetMock() {
  _hasHardware = true;
  _isEnrolled = true;
  _supportedTypes = [AuthenticationType.FINGERPRINT];
  _authResult = { success: true, error: undefined };
}

export function __setHasHardware(value: boolean) {
  _hasHardware = value;
}

export function __setIsEnrolled(value: boolean) {
  _isEnrolled = value;
}

export function __setSupportedTypes(types: number[]) {
  _supportedTypes = types;
}

export function __setAuthResult(result: { success: boolean; error?: string }) {
  _authResult = result;
}
