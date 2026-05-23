# AGENTS.md - KiboMobile

## Project Overview

KiboMobile is a React Native (Expo) app for mental wellness tracking. It connects to the same Firebase project as the mindflow web app.

## Architecture

```
src/
├── components/     # Reusable UI components
├── navigation/      # React Navigation setup
├── screens/         # Main screens (Home, Chat, Checkin, Profile, Login)
├── services/        # Firebase, Sensors
├── types/          # TypeScript interfaces
└── utils/          # Helper functions
```

## Firebase Collections

| Collection | Purpose |
|------------|--------|
| `users` | User profiles with role |
| `messages` | Chat messages with patientId |
| `checkins` | Check-in responses |
| `sensorData` | Sensor batch readings |

## Conventions

- Use `console.warn` for expected errors (location denied, etc)
- Use `console.error` for unexpected failures
- All screens wrap Firebase calls in try/catch
- Auth state checked on mount via `onAuthChange`
- Sensor tracking starts on app launch, stops on unmount

## Dependencies

- expo-sensors: Accelerometer, Gyroscope, Magnetometer
- expo-location: GPS data
- @react-navigation: Bottom tabs + Stack

## Build

```bash
npx expo prebuild --platform android --clean  # Regenerate android/
npx expo run:android                          # Build & run
```
