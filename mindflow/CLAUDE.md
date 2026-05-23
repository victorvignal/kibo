# Mindflow - Kibo Web Dashboard

## Project Status (2026-05-23 06:31 UTC - 79 TESTS, ALL PASSING, BUILD CLEAN)

### ✅ Chat API Route Created (2026-05-23 06:20 UTC)
- `app/api/chat/route.ts` — NEW! Kibo AI chat endpoint using OpenRouter
- `app/api/notifications/route.ts` — NEW! Notifications queue endpoint
- Previously described in CLAUDE.md but never implemented — now fully functional
- Clean production build: `/_not-found`, `/api/chat`, `/api/notifications`
- KiboMobile app now connects to real AI responses via `https://mindflow-ruby.vercel.app/api/chat`

### ✅ Completed
- **Firebase integration** - Same Firebase project (kibo-b298c) as KiboMobile
- **Authentication** - Firebase Auth with email/password login/register
- **Dashboard** - Real-time patient overview, activity charts, alert stats
- **Patients page** - Connected to Firestore `patients` collection
  - Real-time loading from Firestore
  - Add patient dialog → creates Firestore document
  - Loading skeletons and error states
- **Alerts page** - Connected to Firestore `alerts` collection
  - Acknowledge alerts (writes back to Firestore)
  - Filter by pending/resolved
  - Patient name resolution from `patients` collection
- **Chat page** - AI-powered Kibo chat via `/api/chat` (OpenRouter)
- **Settings page** - User preferences
- **Assistant page** - Standalone Kibo chat interface
- **API Routes:**
  - `POST /api/chat` - OpenRouter AI with Kibo persona + context awareness
- **Firestore indexes** - `firestore.indexes.json` with indexes for patients, dailyData, alerts
- **Security rules** - `firestore.rules` with role-based access
- **Build:** Clean production build with Next.js 16

### 🔧 Tech Stack
- Next.js 16 (App Router)
- TypeScript
- Firebase 12 (Auth + Firestore)
- Tailwind CSS 4
- Radix UI components
- Zustand (state management)
- Recharts (charts)
- React Hook Form + Zod (forms)

### 🔐 Firestore Collections
- `users/{uid}` - User profiles (role: patient | psychologist)
- `patients/{id}` - Patient profiles (therapistId → psychologist UID)
- `messages/{id}` - Chat messages (patientId)
- `checkins/{id}` - Daily check-ins (patientId + timestamp DESC)
- `sensorData/{id}` - Sensor batches (patientId + timestamp DESC)
- `dailyData/{id}` - Aggregated features (populated by Cloud Function)
- `alerts/{id}` - Clinica alerts (therapistId + createdAt DESC)

### ✅ Completed (2026-05-22)
- **API Test Suite** — `__tests__/lib/api.test.ts` (17 tests) — Tests for all patient/alerts API functions:
  - `getPatients`, `getPatient`, `createPatient`, `updatePatient`
  - `getPatientData`, `saveDailyFeatures`
  - `getAlerts`, `getPatientAlerts`, `acknowledgeAlert`, `createAlert`
  - Total: 73 tests across 4 suites, all passing

### ✅ Completed (2026-05-21)
- **Jest Test Suite Added** — 43 tests across 3 suites:
  - `riskEvaluator.test.ts` (12 tests) — client-side risk detection from check-in data
  - `riskPredictor.test.ts` (16 tests) — predictive risk analysis with trend detection
  - `utils.test.ts` (15 tests) — date formatting, risk colors, classnames
- **PDF Report Export** — Patient detail page now has 📥 Exportar PDF button using `@react-pdf/renderer`:
  - Generates `Kibo_Relatorio_{patient}_{date}.pdf`
  - Shows patient info, risk summary, 14-day charts, alert list, recommendations
  - Button only visible when patient data is loaded

### ✅ New (2026-05-20)
- **Real-time Client-side Risk Alerts** - Psychologist dashboard now generates alerts entirely in-browser without Cloud Functions!
  - `src/lib/riskEvaluator.ts` — Detects 7 risk patterns: low mood, high anxiety, declining mood trend, poor sleep, social isolation, low activity, missed check-ins
  - Alerts page shows both Firestore alerts AND real-time generated alerts with distinct badges
  - Alerts filter: "Todos", "Pendentes", "Tempo Real" (new filter)
  - "Tempo Real" stat card showing count of client-generated alerts
  - New Firestore composite index: `alerts (patientId + createdAt DESC)`
- **Patient Detail Page — Real-time Risk** - `/patients/[id]` now computes local risk alerts from patient's check-in data via `evaluatePatientRisk()`, showing them alongside Firestore alerts with "🔬 Análise em tempo real" badge
  - Acknowledge button now properly wired to `acknowledgeAlert()` API for Firestore alerts, local-only for client-generated
  - Merged alert list sorted by severity (high first) then by date

### ⚠️ Known Gaps
1. **Cloud Functions not deployed** - `dailyData` collection is empty; dashboard reads checkins directly as fallback. `riskEvaluator.ts` compensates by computing from check-ins client-side.
2. **Patient-therapist linking** - When a psychologist creates a patient in `patients` collection, the patient needs to separately register as a Firebase Auth user. A Cloud Function should auto-create auth accounts on `patients/{id}` creation and link the psychologist's `patientIds`.
3. **Firebase CLI not configured** - To deploy Cloud Functions: `firebase deploy --only functions` (requires Firebase CLI + billing). Real-time alerts compensate for missing server-side alert generation.

### 🔧 Deploy
- `npm run build` → outputs to `.next/`
- Vercel: auto-deploys from git
- Cloud Functions: requires manual `firebase deploy` (Blaze plan needed)
