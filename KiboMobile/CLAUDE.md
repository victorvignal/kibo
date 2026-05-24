# KiboMobile - Development Notes

## Project Status (2026-05-24 04:24 UTC - 14 TEST SUITES, 279 TESTS, APK REBUILT)

### ✅ Journal & Challenges Tests + Biometric Lock + Privacy Policy (2026-05-24 07:24 UTC)
- **New tests**: `journal.test.ts` (19 tests) + `challenges.test.ts` (15 tests) = 34 new tests
- **BiometricGate** in App.tsx: locks app behind biometric when `biometric_lock` enabled in AsyncStorage
- **HowKiboWorksScreen**: 8 feature explanations with card layout
- **PrivacyPolicyScreen**: Full LGPD-compliant privacy policy with 10 sections
- **ProfileScreen**: Fixed placeholder links → navigate to new screens
- **APK**: `kibo-latest.apk` (130.8MB, rebuilt 2026-05-24 04:36 UTC)
- **TypeScript**: 0 errors | **Tests**: 14 suites, 279 passing, 5 skipped

### ✅ Linking Service Fixed & Security Rules Corrected (2026-05-23 18:30 UTC)
- **linking.ts**: Moved auth check to TOP of `useTherapistCode` (before Firestore query)
- **linking.ts**: Changed to call `getAuth()` directly instead of using module-level auth import (fixes mock testing)
- **linking.ts**: Removed `patients/{id}` creation + psychologist `patientIds` update (security rules violation)
- **firestore.rules**: Fixed `linkingCodes` create rule to require `isPsychologist()` (was: `isAuthenticated()`)
- **firestore.rules**: Fixed duplicate `allow update` in `users/{userId}` (psychologist rule was shadowing patient rule)
- **firestore.rules**: Added `therapistId`/`therapistName` as allowed fields for patient self-update
- **APK rebuilt**: `kibo-latest.apk` (66.2MB) - fresh build with all fixes
- **Tests**: 11 linking tests, all passing. Full suite: 12 suites, 240 tests passing

### Security Rules Note
- `firestore.rules` updated but NOT auto-deployed (no firebase.json in project)
- **Victor must manually update rules** in Firebase Console: https://console.firebase.google.com
  → Project: kibo-b298c → Firestore Database → Rules tab → paste from `firestore.rules`

### ✅ APK Rebuilt (2026-05-23 18:30 UTC)
- Fresh release build: `kibo-latest.apk` (66.2MB, May 23 08:30 UTC)
- Contains: `callKiboAPI` bug fix (empty API reply now properly falls back to local generation)
- Contains: 8 new tests for `callKiboAPI` (total 229 tests, all passing)
- Java at: `C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot`
- Android SDK at: `C:\AndroidSDK`
- **BUILD SUCCESSFUL** in 3m 15s (453 tasks)
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- To rebuild: `cd android; $env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"; $env:ANDROID_HOME="C:\AndroidSDK"; .\gradlew.bat assembleRelease --rerun-tasks`
- To rebuild DEBUG: `cd android; $env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"; $env:ANDROID_HOME="C:\AndroidSDK"; .\gradlew.bat assembleDebug --rerun-tasks`

### ✅ Chat API Route Fixed (2026-05-23 06:20 UTC)
- Created missing `mindflow/app/api/chat/route.ts` — the Kibo AI chat endpoint was described in CLAUDE.md but never implemented
- Now properly calls OpenRouter API with Kibo persona + user context (check-ins, mood trends, streak)
- Supports conversation history (last 10 messages) for contextual responses
- Built on mindflow with clean production build (4 routes: `/_not-found`, `/api/chat`, `/api/notifications`)
- Kibo falls back to local generation when API call fails
- Created `mindflow/app/api/notifications/route.ts` as well

### ✅ APK Rebuilt (2026-05-23 02:34 UTC)

### ✅ Committed (2026-05-22 23:24 UTC)
- **Offline-first CheckinScreen**: now uses `offlineFirstSaveCheckin()` with online/offline feedback alerts
- **SensorManager buffer fix**: gyroscope/magnetometer merge into latest accel reading (no new buffer entries)
  - Prevents buffer flooding: was 30 partial entries/sec at 10Hz x 3 sensors
  - Only accelerometer creates new buffer entries; gyro/mag merge into last entry

### ✅ Completed (Updated 2026-05-21 23:49)
- **Biometric Service Tests** (NEW - 2026-05-23 03:25):
  - `src/__tests__/biometric.test.ts` - 26 new tests
  - Tests for `isBiometricAvailable`, `getBiometricType`, `authenticateWithBiometrics`, `getBiometricLabel`
  - Covers: hardware detection, enrolled state, all error codes (cancel, fallback, lockout, system_cancel, etc.)
  - Added `expo-local-authentication` mock in `src/__mocks__/expo-local-authentication.ts`
  - Fixed TypeScript error in `biometric.ts` (result.error narrowing issue)
- **Insights Service Tests** (NEW - 2026-05-21 23:49):
  - `src/__tests__/insights.test.ts` - 21 new tests
  - Tests for `generateWeeklyInsights` (16 tests) and `getPersonalizedTip` (5 tests)
  - Covers all insight types (mood, sleep, anxiety, activity, social, check-in frequency)
  - Covers error handling and edge cases
  - Total: 10 test suites, 181 passed, 5 skipped, TypeScript 0 errors
- **Checkins Service Tests** (2026-05-21 21:49):
  - `src/__tests__/checkins.test.ts` - 8 tests
  - Tests for `getCheckinHistory`, `getWeeklyAverage`, `getMoodTrend`
- **SensorManager Fix** (2026-05-21 16:49):
  - Fixed buffer flooding bug: gyroscope/magnetometer no longer create separate readings
  - Now MERGE into the latest accelerometer reading (no new buffer entries per sensor event)
  - Eliminates ~20 extra partial readings/sec at 10Hz sensor rate
  - Properly notified subscribers only on accelerometer events (primary driver)
- **OfflineService Tests** (NEW - 2026-05-21 16:49):
  - `src/__tests__/offlineService.test.ts` - 11 new tests
  - Tests for pending check-ins/messages, sync state, offline-first wrappers
- **CheckinScreen Offline-First** (2026-05-21 16:49):
  - Now uses `offlineFirstSaveCheckin()` instead of direct `saveCheckin()`
  - Check-ins save locally first, sync when online
  - Shows "saved locally" message when offline
- **Release APK Built** (2026-05-21 16:49):
  - `kibo-latest.apk` - Release build with bundled JS (69MB)
  - Works standalone WITHOUT Metro bundler
  - Uses debug signing (same as before)
  - TypeScript: 0 errors

### ✅ Completed (Updated 2026-05-21 04:56)
- **Sensor Manager Refactor** (FIXED):
  - Created `src/services/sensorManager.ts` - unified sensor subscription manager
  - Fixed duplicate accelerometer subscription between `sensorService` and `sensorAnalysisService`
  - Both services now share a single sensor subscription via the manager
  - Eliminates battery drain from duplicate sensor listeners
  - Proper cleanup on stop
- **APK Rebuilt**: `kibo-latest.apk` (66 MB, built 2026-05-21 10:59 AM)
  - Contains sensor manager fix + kiboResponse test suite (commit 1ae6ded)
  - All 8 test suites passing (134 tests), 5 skipped
  - TypeScript: 0 errors
- **Tests**: 8 suites, 134 passed, 5 skipped - all passing
- **Mindflow API**: Verified working (POST returns Kibo response correctly)
- **BreathingExerciseScreen** - Guided breathing exercises with 4 techniques:
  - 4-7-8 Respiração (relaxamento profundo)
  - Respiração Quadrada (anti-ansiedade)
  - Respiração Calma (ativa sistema parassimpático)
  - Respiração Energizante
  - Animated circle visualization with phase indicators
  - Cycle counter and total time tracking
  - Integrated into HomeScreen quick actions + ChatScreen quick actions
- **OnboardingScreen** - First-launch intro flow with 5 slides explaining app features
  - Animated dot pagination
  - Skip/Pronto navigation
  - Marks completion in AsyncStorage
  - Shown once before Login for first-time users
- **Firebase Security Rules** - Comprehensive rules (`firestore.rules`) with:
  - Role-based access (patient vs psychologist)
  - Patient can only access own data
  - Psychologist can access their patients' data
  - Immutable messages (no update/delete)
  - Validated sensor data (max 1000 readings per batch)
- **Firestore Indexes** - Composite indexes (`firestore.indexes.json`) for:
  - checkins (patientId + timestamp DESC)
  - messages (patientId + timestamp DESC)
  - sensorData (patientId + timestamp DESC)
- **Weekly Report Notifications** - Implemented in notificationService:
  - scheduleWeeklyReport() - scheduled for Monday 10am
  - cancelWeeklyReport()
  - Wired to ProfileScreen toggle
- All previous features from previous sessions
- **APK Built Successfully** - `android/app/build/outputs/apk/debug/app-debug.apk` (130.7 MB, debug build)
- **Biometric authentication** - `expo-local-authentication` v55, biometric.ts service, useBiometric hook
- Biometric login button on LoginScreen with icon based on device type (Face ID/Fingerprint)
- Sensitive actions in ProfileScreen require biometric re-auth (data export, deletion request)
- Firebase authentication and Firestore integration (same project as mindflow web)
- Bottom tab navigation (Home, Chat, Checkin, Profile, Goals)
- Login/Register screen with role selection (patient/psychologist)
- HomeScreen with:
  - Real-time sensor data display (activity level, location, buffer status)
  - Weekly wellness insights (mood, sleep, anxiety, activity, social)
  - Streak tracking
  - Quick actions
- ChatScreen with **context-aware AI responses** (Kibo persona)
  - Pulls recent check-in data (mood, sleep, anxiety, social averages, streak, trend)
  - Pattern-matching with contextual suggestions based on user history
  - Calls mindflow `/api/chat` (OpenRouter/MiniMax AI) with local fallback
- CheckinScreen with multi-step tracking + history view with trend chart
- ProfileScreen with settings, notifications, and privacy options
- GoalsScreen with **real streak tracking** from Firestore check-in history
- Sensor service (expo-sensors + expo-location) collecting accelerometer, gyroscope, magnetometer, and GPS data
- Notification service (expo-notifications) with daily reminders
- Insights service generating weekly wellness insights
- Data buffered and flushed to Firebase Firestore every 30 seconds
- Check-in history with 30-day retention and trend analysis
- Firestore security rules updated for role-based access
- **Firebase Cloud Functions scaffold** ready for deployment (`functions/` directory)
- ErrorBoundary + SafeScreen components for error resilience
- `useAsync` hook for clean async state management
- **Config centralizado** (`src/services/config.ts`) com URLs de API, cores, thresholds
- **API URL corrigida** - `config.ts` agora usa `https://mindflow-ruby.vercel.app`

### 🔧 Cloud Functions (functions/)
- `kiboChat` - AI-powered chat responses via MiniMax API
- `onCheckinCreate` - Auto-generates alerts when high risk detected
- `weeklySummary` - Scheduled weekly summary generation
- **Deploy**: see `functions/README.md`

### ⚠️ To Test / Build
- **APK Ready**: `kibo-latest.apk` (root of KiboMobile project) - install directly on Android device
- Install APK: `adb install kibo-latest.apk` or transfer file to device
- To rebuild: `JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot" ANDROID_HOME="C:\AndroidSDK" cd android && ./gradlew assembleRelease`
- Run `npx expo start` and connect a device/emulator
- Test login/register flow
- Test check-in submission to Firebase
- Test chat with context-aware responses
- Test goals with real streak tracking
- Test sensor data appears in HomeScreen

### 📦 Package Info
- Package name: `com.kibo.mobile` (formerly `com.kibo.mobileapp`)
- iOS Bundle ID: `com.kibo.mobile`
- minSdkVersion: 24 (Android 7.0)
- targetSdkVersion: 35 (Android 15)
- **APK**: `kibo-latest.apk` (69MB, release build with bundled JS, standalone)

### 🔧 Tech Stack
- Expo SDK 54 / React Native 0.81
- Firebase 12 (Auth + Firestore)
- expo-sensors, expo-location, expo-notifications
- React Navigation 7 (bottom tabs + stack)
- TypeScript (strict mode, no errors)

### 🔐 Firebase Collections
- `users/{uid}` - User profiles
- `messages/{id}` - Chat messages
- `checkins/{id}` - Daily check-ins
- `sensorData/{id}` - Sensor data batches
- `patients/{id}` - Patient profiles (for therapist app)

### 📱 Permissions Configured
- iOS: NSLocationWhenInUseUsageDescription, NSMotionUsageDescription
- Android: ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION

### 🗂️ Project Structure
```
src/
  components/   # Reusable UI (ErrorBoundary, SafeScreen)
  hooks/        # Custom hooks (useAsync)
  navigation/   # AppNavigator (tabs + stack)
  screens/      # All 6 screens
  services/     # Firebase, sensors, notifications, insights, kiboApi
  types/        # TypeScript interfaces
  utils/        # Utilities
functions/      # Firebase Cloud Functions (deploy when billing available)
```
