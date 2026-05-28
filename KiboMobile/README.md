# KiboMobile 🐱

Mental wellness companion app — AI-powered check-ins, sensor tracking, crisis prevention, and chat with Kibo. Built with Expo + Firebase.

**Firebase project:** `kibo-b298c` (shared with [mindflow web app](https://mindflow-ruby.vercel.app))

## Status (2026-05-25)

- ✅ 14 screens: Login, Home, Chat, Checkin, Profile, Goals, Insights, Journal, Crisis, BreathingExercise, ColorCheckin, Onboarding, ActivityData, WearableData, HowKiboWorks, PrivacyPolicy
- ✅ Firebase Auth + Firestore
- ✅ AI chat via mindflow API (`https://mindflow-ruby.vercel.app/api/chat`) + offline fallback
- ✅ Sensors: accelerometer, gyroscope, magnetometer, GPS (30s flush to Firestore)
- ✅ Offline-first: AsyncStorage queue + sync on reconnect
- ✅ Biometric lock (Face ID / fingerprint)
- ✅ Daily notification reminders + weekly reports
- ✅ TypeScript: 0 errors | Tests: 14 suites, 274 passing

## APK (Ready for Install)

**Latest build:** `kibo-latest.apk` (130.8 MB, built 2026-05-24)

Transfer to Android phone and install. Enable "Install from unknown sources" in Settings > Security.

## Screens

| Screen | Description |
|---|---|
| Login / Register | Firebase Auth, role selection (patient/psychologist) |
| Home | Dashboard with mood summary, streak, quick actions |
| Chat | AI conversation with Kibo (context-aware, offline fallback) |
| Checkin | 5-dimension slider check-in (mood, sleep, anxiety, activity, social) |
| Insights | Weekly analytics + 14-day trend chart |
| Goals | Streak tracking + daily goals |
| Journal | Private journal entries synced to Firestore |
| Crisis | Crisis resources + emergency contacts |
| Breathing Exercise | Guided breathing with visual timer |
| Color Checkin | Alternative color-based mood check-in |
| Profile | User info, biometric lock toggle, therapist linking |
| Activity Data | Sensor history and activity level |
| How Kibo Works | Feature explanation |
| Privacy Policy | LGPD-compliant data policy |

## Tech Stack

- Expo SDK 54 / React Native 0.81 / React 19
- Firebase 12 (Auth + Firestore, project: `kibo-b298c`)
- expo-sensors, expo-location, expo-notifications, expo-local-authentication
- React Navigation 7 (bottom tabs + stack)
- TypeScript ~5.9 (strict, 0 errors)

## Install & Run

```bash
npm install
npm start          # Expo + Metro (press 'a' for Android emulator)
npm run android    # Expo + connected Android device
npm test           # Jest test suite
```

## Build APK

**Requires Java 17+** (not installed in this environment — APK pre-built above)

```bash
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

**Or use EAS cloud build** (no Java needed):
```bash
npm install -g eas-cli
eas build --platform android --profile preview
```

## Firebase Collections

| Collection | Description |
|---|---|
| `users/{uid}` | name, email, role, pushToken, therapistId |
| `messages/{id}` | patientId, role, content, timestamp |
| `checkins/{id}` | patientId, mood, sleep, anxiety, activity, social, timestamp |
| `sensorData/{id}` | patientId, type, readings[], count, flushedAt, timestamp |
| `journal/{id}` | userId, content, mood?, timestamp |
| `goals/{id}` | patientId, text, completed, createdAt |
| `notifications/{id}` | toUserId, title, body, read, createdAt |
| `linkingCodes/{code}` | psychologistId, patientId?, used |
| `patients/{id}` | therapistId, name, email, riskLevel |
| `alerts/{id}` | patientId, type, severity, acknowledged |

## API

Chat → `POST https://mindflow-ruby.vercel.app/api/chat`
```json
{ "message": "...", "context": { "avgMood": 7, "avgSleep": 7, "streak": 3 }, "history": [] }
```

## Offline Mode

When no network is available, Kibo uses `generateLocalKiboResponse()` for chat — context-aware local response generation with risk detection. Sensor data and check-ins are queued in AsyncStorage and synced when connectivity returns.
