import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { join } from 'path'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { getDb, persistDb, getDbInstance } from './db'
import { initAutoUpdater, checkForUpdates, quitAndInstall } from './updater'
import * as schema from '../shared/schema'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hiddenInset',
    title: 'KUXY',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function registerIpc(): void {
  const db = getDbInstance() as any

  // Workspaces
  ipcMain.handle('profiles:list', () => {
    return db.select().from(schema.profiles).where(eq(schema.profiles.archived, false)).all()
  })

  ipcMain.handle('profiles:get', (_e, id: number) => {
    return db.select().from(schema.profiles).where(eq(schema.profiles.id, id)).get()
  })

  ipcMain.handle('profiles:create', async (_e, data: schema.NewProfile) => {
    const result = db.insert(schema.profiles).values({ ...data, createdAt: new Date() }).returning().get()
    persistDb()
    return result
  })

  ipcMain.handle('profiles:update', async (_e, id: number, data: Partial<schema.NewProfile>) => {
    const result = db.update(schema.profiles).set(data).where(eq(schema.profiles.id, id)).returning().get()
    persistDb()
    return result
  })

  ipcMain.handle('profiles:updateSidebarItems', async (_e, id: number, sidebarItems: string[]) => {
    const result = db
      .update(schema.profiles)
      .set({ sidebarItems: JSON.stringify(sidebarItems) })
      .where(eq(schema.profiles.id, id))
      .returning()
      .get()
    persistDb()
    return result
  })

  ipcMain.handle('profiles:archive', async (_e, id: number, archived: boolean) => {
    db.update(schema.profiles)
      .set({ archived })
      .where(eq(schema.profiles.id, id))
      .run()
    persistDb()
    return { ok: true }
  })

  // Habits
  ipcMain.handle('habits:list', (_e, params: { profileId?: number } = {}) => {
    if (params.profileId) {
      return db
        .select()
        .from(schema.habits)
        .where(and(eq(schema.habits.archived, false), eq(schema.habits.profileId, params.profileId)))
        .all()
    }
    return db.select().from(schema.habits).where(eq(schema.habits.archived, false)).all()
  })

  ipcMain.handle('habits:get', (_e, id: number) => {
    return db.select().from(schema.habits).where(eq(schema.habits.id, id)).get()
  })

  ipcMain.handle('habits:create', async (_e, data: schema.NewHabit) => {
    const result = db
      .insert(schema.habits)
      .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning()
      .get()
    persistDb()
    return result
  })

  ipcMain.handle('habits:update', async (_e, id: number, data: Partial<schema.NewHabit>) => {
    const result = db
      .update(schema.habits)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.habits.id, id))
      .returning()
      .get()
    persistDb()
    return result
  })

  ipcMain.handle('habits:delete', async (_e, id: number) => {
    db.delete(schema.habits).where(eq(schema.habits.id, id)).run()
    persistDb()
    return { ok: true }
  })

  ipcMain.handle('habits:archive', async (_e, id: number, archived: boolean) => {
    db.update(schema.habits)
      .set({ archived, updatedAt: new Date() })
      .where(eq(schema.habits.id, id))
      .run()
    persistDb()
    return { ok: true }
  })

  // Completions
  ipcMain.handle('completions:list', (_e, params: { from?: string; to?: string; habitId?: number; profileId?: number } = {}) => {
    const conditions: any[] = []
    if (params.from) conditions.push(gte(schema.completions.date, params.from))
    if (params.to) conditions.push(lte(schema.completions.date, params.to))
    if (params.habitId) conditions.push(eq(schema.completions.habitId, params.habitId))
    if (params.profileId) {
      const habitIds = db
        .select({ id: schema.habits.id })
        .from(schema.habits)
        .where(eq(schema.habits.profileId, params.profileId))
        .all()
        .map((r: any) => r.id)
      if (habitIds.length === 0) return []
      // IN clause via simple OR
      const inConds = habitIds.map((id: number) => eq(schema.completions.habitId, id))
      conditions.push(sql`(${sql.join(inConds, sql`, `)})`)
    }
    const where = conditions.length ? and(...conditions) : undefined
    return db.select().from(schema.completions).where(where).all()
  })

  ipcMain.handle('completions:toggle', async (_e, habitId: number, date: string, value = 1) => {
    const existing = db
      .select()
      .from(schema.completions)
      .where(and(eq(schema.completions.habitId, habitId), eq(schema.completions.date, date)))
      .get()

    if (existing) {
      db.delete(schema.completions)
        .where(and(eq(schema.completions.habitId, habitId), eq(schema.completions.date, date)))
        .run()
      persistDb()
      return { toggled: false }
    } else {
      db.insert(schema.completions)
        .values({ habitId, date, count: 1, value, createdAt: new Date() })
        .run()
      persistDb()
      return { toggled: true }
    }
  })

  ipcMain.handle('completions:set', async (_e, habitId: number, date: string, count: number, value?: number) => {
    const existing = db
      .select()
      .from(schema.completions)
      .where(and(eq(schema.completions.habitId, habitId), eq(schema.completions.date, date)))
      .get()

    if (count <= 0) {
      if (existing) {
        db.delete(schema.completions)
          .where(and(eq(schema.completions.habitId, habitId), eq(schema.completions.date, date)))
          .run()
      }
      persistDb()
      return { ok: true }
    }

    if (existing) {
      db.update(schema.completions)
        .set({ count, value: value ?? existing.value })
        .where(and(eq(schema.completions.habitId, habitId), eq(schema.completions.date, date)))
        .run()
    } else {
      db.insert(schema.completions)
        .values({ habitId, date, count, value: value ?? 0, createdAt: new Date() })
        .run()
    }
    persistDb()
    return { ok: true }
  })

  // Routines
  ipcMain.handle('routines:list', (_e, params: { profileId?: number } = {}) => {
    if (params.profileId) {
      return db
        .select()
        .from(schema.routines)
        .where(and(eq(schema.routines.archived, false), eq(schema.routines.profileId, params.profileId)))
        .all()
    }
    return db.select().from(schema.routines).where(eq(schema.routines.archived, false)).all()
  })

  ipcMain.handle('routines:create', async (_e, data: schema.NewRoutine) => {
    const result = db
      .insert(schema.routines)
      .values({ ...data, createdAt: new Date() })
      .returning()
      .get()
    persistDb()
    return result
  })

  ipcMain.handle('routines:delete', async (_e, id: number) => {
    db.delete(schema.routines).where(eq(schema.routines.id, id)).run()
    persistDb()
    return { ok: true }
  })

  ipcMain.handle('routines:addHabit', async (_e, routineId: number, habitId: number, order = 0) => {
    db.insert(schema.routineHabits).values({ routineId, habitId, order }).run()
    persistDb()
    return { ok: true }
  })

  ipcMain.handle('routines:removeHabit', async (_e, routineId: number, habitId: number) => {
    db.delete(schema.routineHabits)
      .where(and(eq(schema.routineHabits.routineId, routineId), eq(schema.routineHabits.habitId, habitId)))
      .run()
    persistDb()
    return { ok: true }
  })

  // Journal
  ipcMain.handle('journal:list', (_e, params: { from?: string; to?: string; profileId?: number } = {}) => {
    const conditions: any[] = []
    if (params.from) conditions.push(gte(schema.journalEntries.date, params.from))
    if (params.to) conditions.push(lte(schema.journalEntries.date, params.to))
    if (params.profileId) conditions.push(eq(schema.journalEntries.profileId, params.profileId))
    const where = conditions.length ? and(...conditions) : undefined
    return db
      .select()
      .from(schema.journalEntries)
      .where(where)
      .orderBy(desc(schema.journalEntries.date))
      .all()
  })

  ipcMain.handle('journal:upsert', async (_e, data: schema.NewJournalEntry) => {
    const existing = db
      .select()
      .from(schema.journalEntries)
      .where(eq(schema.journalEntries.date, data.date))
      .get()

    let result
    if (existing) {
      result = db
        .update(schema.journalEntries)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.journalEntries.date, data.date))
        .returning()
        .get()
    } else {
      result = db
        .insert(schema.journalEntries)
        .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
        .returning()
        .get()
    }
    persistDb()
    return result
  })

  // Focus
  ipcMain.handle('focus:create', async (_e, data: schema.NewFocusSession) => {
    const result = db.insert(schema.focusSessions).values(data).returning().get()
    persistDb()
    return result
  })

  ipcMain.handle('focus:list', (_e, params: { from?: string; to?: string; profileId?: number } = {}) => {
    const conditions: any[] = []
    if (params.from) conditions.push(gte(schema.focusSessions.startedAt, new Date(params.from)))
    if (params.to) conditions.push(lte(schema.focusSessions.startedAt, new Date(params.to)))
    if (params.profileId) conditions.push(eq(schema.focusSessions.profileId, params.profileId))
    const where = conditions.length ? and(...conditions) : undefined
    return db
      .select()
      .from(schema.focusSessions)
      .where(where)
      .orderBy(desc(schema.focusSessions.startedAt))
      .all()
  })

  ipcMain.handle('focus:totals', (_e, params: { from?: string; to?: string; profileId?: number } = {}) => {
    const conditions: any[] = [eq(schema.focusSessions.status, 'completed')]
    if (params.from) conditions.push(gte(schema.focusSessions.startedAt, new Date(params.from)))
    if (params.to) conditions.push(lte(schema.focusSessions.startedAt, new Date(params.to)))
    if (params.profileId) conditions.push(eq(schema.focusSessions.profileId, params.profileId))
    const result = db
      .select({ total: sql<number>`COALESCE(SUM(${schema.focusSessions.duration}), 0)` })
      .from(schema.focusSessions)
      .where(and(...conditions))
      .get()
    return result?.total ?? 0
  })

  // Dashboard
  ipcMain.handle('dashboard:overview', (_e, params: { from: string; to: string; profileId?: number }) => {
    const conditions: any[] = []
    if (params.profileId) {
      const habitIds = db
        .select({ id: schema.habits.id })
        .from(schema.habits)
        .where(eq(schema.habits.profileId, params.profileId))
        .all()
        .map((r: any) => r.id)
      if (habitIds.length === 0) {
        return { habits: [], completions: [], focusSeconds: 0 }
      }
      const inConds = habitIds.map((id: number) => eq(schema.completions.habitId, id))
      conditions.push(sql`(${sql.join(inConds, sql`, `)})`)
    }
    conditions.push(gte(schema.completions.date, params.from))
    conditions.push(lte(schema.completions.date, params.to))
    const completionsInRange = db.select().from(schema.completions).where(and(...conditions)).all()

    const habits = params.profileId
      ? db
          .select()
          .from(schema.habits)
          .where(and(eq(schema.habits.archived, false), eq(schema.habits.profileId, params.profileId)))
          .all()
      : db.select().from(schema.habits).where(eq(schema.habits.archived, false)).all()

    const focusConds: any[] = [eq(schema.focusSessions.status, 'completed')]
    if (params.profileId) focusConds.push(eq(schema.focusSessions.profileId, params.profileId))
    focusConds.push(gte(schema.focusSessions.startedAt, new Date(params.from)))
    focusConds.push(lte(schema.focusSessions.startedAt, new Date(params.to)))
    const totals = db
      .select({ total: sql<number>`COALESCE(SUM(${schema.focusSessions.duration}), 0)` })
      .from(schema.focusSessions)
      .where(and(...focusConds))
      .get()

    return {
      habits,
      completions: completionsInRange,
      focusSeconds: totals?.total ?? 0
    }
  })

  // Updates
  ipcMain.handle('update:getVersion', () => app.getVersion())

  ipcMain.handle('update:check', async () => {
    return checkForUpdates()
  })

  ipcMain.handle('update:install', () => {
    quitAndInstall()
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('app.kuxy.desktop')
  app.setName('KUXY')

  app.on('browser-window-created', (_e, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await getDb()
  registerIpc()
  const win = createWindow()

  // Inicia checagem de updates (só roda em produção, ver updater.ts)
  initAutoUpdater(win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

