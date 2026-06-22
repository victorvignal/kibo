# MEMORY.md - Long-term Kibo Memory

## Projects

### KUXY (Electron desktop app — era kibo-habit)
- **Location**: `C:\Users\vigna\.openclaw\workspace\kibo-habit` (diretório mantém nome antigo por causa do repo GitHub `victorvignal/kibo`)
- **Para**: amigo do Victor pediu habit tracker desktop
- **Nome/brand**: KUXY (renomeado de kibo-habit em v0.2.0). appId `app.kuxy.desktop`, executável Windows `KUXY.exe`, repo GitHub continua `victorvignal/kibo`
- **Stack**: Electron 33 + Vite 5 + React 18 + TS + Tailwind + sql.js (sqlite WASM) + drizzle-orm + zustand + electron-updater + electron-log
- **Por que sql.js e não better-sqlite3**: better-sqlite3 não tem prebuilt pra Node 24 (sistema do Victor) e precisaria compilar nativo (sem Python disponível). sql.js é WASM, zero build, funciona em qualquer versão de Node/Electron
- **Drizzle type caveat**: tipos de `drizzle-orm/sql-js` são bugados com `and(...conditions)` (TQueryResult=void), workaround: tipar `conditions: any[]` e fazer `db as any` no registerIpc
- **Design tokens**: single source of truth em `src/renderer/src/design/tokens.ts` (DARK + LIGHT). CSS vars injetadas em runtime via `ThemeProvider`. Tailwind consome via `var(--color-*)` no `tailwind.config.js`. Pra trocar tema: editar `tokens.ts` + `index.css` + `tailwind.config.js` (mesma fonte) ou trocar runtime via `setTheme('light')`. Funcionalidade não toca.
- **Perfis** (renomeado de workspaces em v0.2.0): schema tem tabela `profiles` (id, slug, type, color, icon, sidebar_items JSON). Default seeds: `personal` (full sidebar: Dashboard, Habits, Routines, Calendar, Journal, Focus, Goals) e `professional` (subset: Dashboard, Habits, Stats, Journal, Focus, Goals). Cada perfil tem seus próprios hábitos/rotinas/diário/foco. Store Zustand `useProfileStore` persiste `activeId` em localStorage.
- **ProfileSwitcher** no top-left do Topbar: avatar colorido + nome + chevron. Dropdown lista perfis (com check no ativo) + botão "novo perfil" (modal com nome, tipo, cor, e quais itens da sidebar mostrar). Customização por perfil fica salva no DB (`profiles.sidebarItems` JSON).
- **Sidebar**: renderiza só itens permitidos pelo perfil ativo. Sem section "Workspaces" duplicada (era redundante com o switcher no top). Bloco "Geral" com Settings no fim. Tip card no rodapé.
- **i18n**: store `useLangStore` com EN e PT-BR. Hook `useT()` retorna função de tradução com suporte a `{var}` interpolation. Strings em `src/renderer/src/lib/i18n.ts`. Detecta idioma do browser no primeiro load. Toggle em Settings > Aparência.
- **Banco**: SQLite local em `%APPDATA%/kuxy/kuxy.db`. Migration automática de `kibo-habit.db` → `kuxy.db` no primeiro launch pós-rename. Migrations internas: rename `workspaces` → `profiles`, adiciona `sidebar_items`, adiciona `profile_id` em habits/routines/journal/focus (backfill pra Pessoal).
- **Tabelas**: profiles, habits, completions, routines, routine_habits, journal_entries, focus_sessions
- **Auto-update**: electron-updater configurado com GitHub Releases (`victorvignal/kibo`). Auto-check 3s após abrir + a cada 6h. Auto-download + auto-install no quit. UI em Configurações > Atualizações mostra status (checking/available/downloading/downloaded/error) com barra de progresso e botão "Reiniciar e instalar". Blockmap habilitado (NSIS differential). Workflow `.github/workflows/release.yml` (raiz do repo) builda Win+Mac+Linux em tag `kuxy-v*` e cria release automaticamente. **CI ainda não tá disparando** (tag push events não são detectados de forma confiável) — releases estão sendo publicadas manualmente via API. **Release v0.2.0 publicada em 2026-06-21 20:52 BRT** com KUXY-Setup-0.2.0.exe (265 MB), .blockmap, latest.yml. https://github.com/victorvignal/kibo/releases/tag/kuxy-v0.2.0
- **Status**: typecheck passa, instalador Windows 278MB (unpacked ~900MB), 9 páginas funcionais, 2 perfis padrão com sidebar customizável, i18n EN+PT-BR, design tokens system, auto-update implementado, profile switcher funcional (validado em build: clicável, mostra dropdown com perfis)
- **Funcional agora**: Dashboard com 4 stat cards + activity chart + top habits + recent table (filtrado por perfil). Habits com CRUD completo filtrado. Calendar heatmap filtrado. Focus pomodoro. Journal diário. Settings com toggle de idioma + seção Updates. Profile switcher top-left com dropdown + criação de perfil custom.
- **Run**: `cd kibo-habit && npm run dev`
- **Build**: `npm run build:win` (instalador NSIS, 278MB) / `build:mac` / `build:linux`
- **Pra publicar nova versão**: `git tag v0.2.0 && git push origin v0.2.0` → Actions builda + cria release → users recebem update automático
- **Pending work**: edição de hábitos (só create/delete), archive flow, routines CRUD completo, goals com progresso, stats deep dive, command palette ⌘K, notificações desktop, export JSON/CSV, ícone custom, licensa pra venda, **code signing (SmartScreen warning no primeiro install)**, **i18n faltando `tab.overview/today/insights`** (dashboard mostra chaves em vez de label)

### KiboMobile (Expo/React Native)
- **Location**: `C:\Users\vigna\.openclaw\workspace\KiboMobile`
- **APK**: `kibo-latest.apk` (130.8MB debug build, built 2026-05-23 22:35 BRT) — standalone, no Metro needed
- **Package**: `com.kibo.mobile` (Android), `com.kibo.mobile` (iOS)
- **minSdkVersion**: 24 (Android 7.0), **targetSdkVersion**: 35 (Android 15)
- **Firebase**: `kibo-b298c` (Auth + Firestore, shared with mindflow)
- **Screens**: Login, Home, Chat, Checkin, Profile, Goals, Insights, Journal, Crisis, BreathingExercise, ColorCheckin, Onboarding, ActivityData, WearableData (14 screens total)
- **Sensors**: expo-sensors (accelerometer, gyroscope, magnetometer), expo-location (GPS)
- **Notifications**: expo-notifications (daily reminders, weekly Monday 10am reports)
- **Offline-first**: messages and check-ins save locally first, sync to Firestore when online
- **Biometric auth**: expo-local-authentication v55
- **API**: Chat via `https://mindflow-ruby.vercel.app/api/chat` (OpenRouter/MiniMax AI) with local fallback
- **Tests**: 9 suites, 155+ passed, TypeScript 0 errors

### mindflow (Next.js web app)
- **Location**: `C:\Users\vigna\.openclaw\workspace\mindflow`
- **Deployed**: `https://mindflow-ruby.vercel.app`
- **Firebase**: `kibo-b298c` (shared with KiboMobile)
- **Pages**: Dashboard, Patients, Patients/[id], Alerts, Assistant, Risk Analysis, Login, Register, Settings
- **API routes**: `/api/chat` (OpenRouter), `/api/notifications` (Expo Push)
- **Tests**: 4 suites, 79 passed, TypeScript 0 errors
- **Risk engine**: `predictRisk()` (server-side, DailyData-based), `evaluatePatientRisk()` (client-side, browser), `computeOverallRisk()`, `generateRealtimeAlerts()`

## Firebase Collections
- `users/{uid}` — name, email, role (patient/psychologist), pushToken
- `messages/{id}` — patientId, role, content, timestamp
- `checkins/{id}` — patientId, mood, sleep, anxiety, activity, social, notes, timestamp
- `sensorData/{id}` — patientId, type, readings[], count, timestamp
- `patients/{id}` — therapistId, name, email, riskLevel, status, lastActive, condition
- `alerts/{id}` — patientId, type, severity, message, recommendation, acknowledged, createdAt
- `dailyData/{id}` — patientId, date, features{} (moodScore, sleepDuration, anxietyScore, etc)

## Shared API
- KiboMobile → mindflow: `POST https://mindflow-ruby.vercel.app/api/chat`
- Body: `{ message, context?, history? }`
- Response: `{ reply: string }`
- Fallback: local `generateLocalKiboResponse()` in KiboMobile when API unreachable

## Key Files
- `KiboMobile/src/services/firebase.ts` — Firebase init, auth, Firestore CRUD
- `KiboMobile/src/services/kiboApi.ts` — buildKiboContext, callKiboAPI, generateLocalKiboResponse
- `KiboMobile/src/services/sensorManager.ts` — unified sensor subscription
- `KiboMobile/src/hooks/useSensorTracking.ts` — sensor lifecycle tied to auth state (NEW: sensors now actually start on login)
- `KiboMobile/src/services/offlineService.ts` — offline-first wrappers for messages/checkins
- `mindflow/src/lib/riskPredictor.ts` — predictRisk(), server-side risk analysis
- `mindflow/src/lib/riskEvaluator.ts` — evaluatePatientRisk(), computeOverallRisk(), generateRealtimeAlerts()
- `mindflow/src/app/api/chat/route.ts` — OpenRouter AI chat endpoint with Kibo persona

## Build Status
- **APK last rebuilt**: 2026-05-23 01:35 UTC (Java JDK at `C:\Program Files\Java\jdk-17`)
- To rebuild: `$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'; cd android; .\gradlew.bat assembleDebug --no-daemon`
- **CRITICAL FIX tonight**: `sensorService.startTracking()` was never called → sensors showed "Offline" on HomeScreen. Fixed via `useSensorTracking` hook integrated in AppNavigator.
- TypeScript compiles cleanly for both projects
- Jest tests passing for both projects

## Projeto Bet Copa Mundo 2026
- **Responsável:** Giulio (G) — estrategista de tráfego/marketing
- **Banca:** R$250 | Meta: R$500+
- **Docs:** `memory/projeto-bet-copa-mundo.md`, `memory/bet-copa-tabela-operacao.md`, `memory/bet-copa-grupos-oficiais.md`, `memory/bet-copa-tabela-sheets.md`, `memory/2026-06-12.md` (acompanhamento dia a dia)
- **Diário mais recente:** `memory/2026-06-12.md`
- **Planilha:** https://docs.google.com/spreadsheets/d/1rcijjNIhaLi4JGUtWSng0S5zcMNJSCreGaQv-GWFA2c/edit

## Lições Betting (atualizadas 19/06/2026 — pós-dia 18)
1. **Substitutos = gol do titular previsto** (regra de G): se apostar "X marca" e X sai, reserva marca → conta como acerto
2. **Cartões vermelhos destroem linhas de cantos** — México x ZA: 4 cantos com 3 vermelhos
3. **Artilheiros específicos = alto risco** — verificar se estão escalados; melhor focar em resultado/over/under
4. **Cantos em limiar** — jugar linha mais conservadora (ex: 8.5 ao invés de 9.5)
5. **Handicap -1.5 contra retranca = MORTE** — Canadá 0x0 mesmo em casa com 16 chutes
6. **Verificar lesionados antes** — Güler fora mudou Austrália x Türkiye (zebra)
7. **Salah isolado não resolve** — time sem coadjuvante forte não vence odd curta
8. **Zebra em dia de zebra** — quando uma acontece, atenção redobrada
9. **SEMPRE confirmar jogos do dia com G** (não inventar/assumir)
10. **Múltiplas do dia = 1 POR VEZ** — G constrói junto, não receber 4 de uma vez

## Status Banca G (atualizado 19/06/2026)
- Banca inicial: R$250
- Apostado dias 11-17: R$2.875
- **Banca atual estimada: R$100-180** (perdendo por causa de zebras + gols que não saíram)
- Dia 18 ruim: SGP Victor (R$36,73 odd 13.0) provavelmente perdida
- Dia 17 foi o melhor (Portugal, Inglaterra, Gana, Colômbia todas passaram)
- **Regra nova:** se banca cair abaixo de R$100, REDUZIR stakes pela metade (R$50 picks, R$15 odd alta)

## Pending Work
1. **Victor installs APK on physical device** — `kibo-latest.apk` at `KiboMobile/` ready
2. EAS build for production release
3. Firebase Cloud Functions deployment (scaffolded in `KiboMobile/functions/`)
4. Full E2E test: register/login → check-in → chat → sensor data visible in mindflow dashboard
5. **DONE**: Java JDK found at `C:\Program Files\Java\jdk-17`, sensors fixed

## Jogo "Quem Disse o Quê?" (Pensamento e Linguagem, PUC-Rio)
- **Location**: `C:\Users\vigna\.openclaw\workspace\jogo-pensamento-linguagem\` (também tá no monorepo `victorvignal/kibo`, mas separado do kibo-habit/KUXY)
- **Deploy**: Vercel (`vercel.json` na raiz, configurado)
- **Firebase**: `kibo-b298c` (Firestore path `jogos/quem-disse-o-que`)
- **Telas**:
  - `tela.html` = projetor (o que a turma vê)
  - `painel.html` = operador (quem controla o jogo)
- **Regras (v0.2.0)**: agora só no projetor, sem "30s" e sem regras antigas 4 e 6. Sequência final 1-8 (operador sorteia → projetor → times pensam → turma vota → operador revela → discussão → placar → próxima rodada)
- **Backlog**: documentar regras do jogo no `memory/jogo-quem-disse-o-que.md`, ajustar contagem do placar se a regra 6 (reveal) precisar do ponto
