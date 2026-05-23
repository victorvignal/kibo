/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        strict: false,
        esModuleInterop: true,
        skipLibCheck: true,
        jsx: 'react',
      },
    }],
  },
  moduleNameMapper: {
    '^expo-sensors$': '<rootDir>/src/__mocks__/expo-sensors.ts',
    '^expo-location$': '<rootDir>/src/__mocks__/expo-location.ts',
    '^firebase/auth$': '<rootDir>/src/__mocks__/firebase.ts',
    '^firebase/firestore$': '<rootDir>/src/__mocks__/firebase.ts',
    '^firebase/app$': '<rootDir>/src/__mocks__/firebase.ts',
    '^firebase/functions$': '<rootDir>/src/__mocks__/firebase.ts',
    '@react-native-async-storage/async-storage': '<rootDir>/src/__mocks__/async-storage.ts',
    '^expo-local-authentication$': '<rootDir>/src/__mocks__/expo-local-authentication.ts',
    '^./sensorManager$': '<rootDir>/src/__mocks__/sensorManager.ts',
  },
  collectCoverageFrom: [
    'src/services/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
