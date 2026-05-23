# KiboMobile

🐱 Expo app for Kibo mental wellness assistant — integrates with Firebase, collects sensor data, and provides AI-powered mental health check-ins.

## Status (2026-05-19)

### ✅ Completed
- Firebase Auth + Firestore (same project as mindflow web: `kibo-b298c`)
- 6 screens: Login, Home, Chat, Checkin, Profile, Goals
- Bottom tab + stack navigation
- **Chat with context-aware Kibo AI** — pulls recent check-in history (mood, sleep, anxiety, social, streak, trend) for personalized responses
- Multi-step check-in with sliders + history + 14-day trend chart
- Weekly wellness insights (mood, sleep, anxiety, activity, social)
- Goals screen with real streak tracking from Firestore
- Sensor service: accelerometer, gyroscope, magnetometer, GPS (30s flush)
- Daily notification reminders (expo-notifications)
- Error boundaries + SafeScreen for crash resilience
- `useAsync` hook for clean async state management
- Firebase Cloud Functions scaffold ready (`functions/`) for AI deployment

### 📋 Build Instructions

**APK already exists** at: `android/app/build/outputs/apk/debug/app-debug.apk`

#### For development (with Metro bundler):
```bash
npm start          # Start Expo + Metro
# Then press 'a' for Android emulator or scan QR with Expo Go
```

#### For standalone APK (needs Java):
```bash
# 1. Install Java 17+ (OpenJDK or Oracle JDK)
java -version  # Verify Java is available

# 2. Build debug APK
cd android && ./gradlew assembleDebug

# 3. APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

#### For EAS cloud build (no Java needed):
```bash
npm install -g eas-cli
eas build --platform android --profile preview
```

#### For production release APK:
```bash
eas build --platform android --profile release
```

### 📦 Bundle JS (without building APK)
```bash
npx expo export --platform android
# Bundle at dist/_expo/static/js/android/
```

## Cloud Functions Deployment

Once Firebase billing is enabled (Blaze plan):

```bash
cd functions
npm install
firebase use kibo-b298c
firebase functions:config:set minimax.api_key="your_key"
firebase deploy --only functions
```

See `functions/README.md` for full instructions.

## Running

```bash
npm install
npm start          # Expo
npm run android    # Expo + Android
npm run ios        # Expo + iOS
```

## Firebase Collections

| Collection | Description |
|---|---|
| `users/{uid}` | User profiles (name, email, role) |
| `messages/{id}` | Chat messages (patientId, role, content) |
| `checkins/{id}` | Check-in responses (mood, sleep, anxiety, activity, social) |
| `sensorData/{id}` | Sensor batches (accelerometer, gyroscope, GPS) |
| `patients/{id}` | Patient profiles (for therapist app) |
| `alerts/{id}` | Auto-generated risk alerts |

## Tech Stack

- Expo SDK 54 / React Native 0.81
- Firebase 12 (Auth + Firestore)
- expo-sensors, expo-location, expo-notifications
- React Navigation 7 (bottom tabs + stack)
- TypeScript (strict mode, zero errors)
