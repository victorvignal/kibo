# Kibo Habit

Desktop habit tracker for routines and personal organization. Local-first, privacy-respecting, built to be sold.

## Stack

- Electron 33 + Vite 5 + React 18 + TypeScript
- TailwindCSS 3
- better-sqlite3 + Drizzle ORM (local database)
- React Router 6 (hash routing)
- Recharts (dashboard charts)
- Lucide React (icons)
- Zustand (state, ready for later)

## Run

```bash
npm install
npm run dev
```

## Build distributable

```bash
npm run build:win    # Windows installer
npm run build:mac    # macOS dmg
npm run build:linux  # Linux AppImage + deb
```

Output goes to `release/<version>/`.

## Structure

```
src/
  main/        Electron main process (IPC, db, window)
    index.ts   entry, IPC handlers
    db.ts      SQLite setup + migrations
  preload/     Bridge exposing window.api
    index.ts   typed API surface
  renderer/    React app
    src/
      components/
        layout/    Sidebar, Topbar, AppShell
        habits/    NewHabitDialog
      pages/       Dashboard, Habits, Routines, Calendar, Stats, Journal, Focus, Goals, Settings
      lib/         utils (dates, streaks, formatting)
      types/       shared types
  shared/
    schema.ts  Drizzle schema (single source of truth)
```

## Database

Local SQLite stored at:

- Windows: `%APPDATA%/Kibo Habit/kibo-habit.db`
- macOS: `~/Library/Application Support/Kibo Habit/kibo-habit.db`
- Linux: `~/.config/Kibo Habit/kibo-habit.db`

## Status

- Foundation: done
- Dashboard: functional (4 stat cards, activity chart, top habits, recent completions)
- Habits: functional (CRUD, check-off, streak, rate)
- Calendar: month view with completion heatmap
- Focus: working pomodoro timer
- Journal: daily entry with mood/energy
- Routines / Goals: placeholders, CRUD pending
- Stats: placeholder
- Settings: theme, notifications, data export, about

## Roadmap (when we get back to it)

1. Habit edit + archive flow
2. Routines full CRUD with habit assignment
3. Goals with progress tracking
4. Stats deep dive (year heatmap, weekday patterns)
5. Command palette (⌘K)
6. Reminders/notifications desktop
7. Theme switcher + custom accent
8. Data export to JSON/CSV
9. Auto-update channel
10. Optional cloud sync (Supabase)
11. License system (if/when selling)
