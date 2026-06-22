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

  // ============================================================
  // FINANCE (v0.3.0)
  // ============================================================

  // --- Accounts ---
  ipcMain.handle('accounts:list', (_e, params: { profileId?: number; includeArchived?: boolean } = {}) => {
    const conds: any[] = []
    if (params.profileId) conds.push(eq(schema.accounts.profileId, params.profileId))
    if (!params.includeArchived) conds.push(eq(schema.accounts.archived, false))
    const where = conds.length ? and(...conds) : undefined
    return db.select().from(schema.accounts).where(where).orderBy(schema.accounts.name).all()
  })

  ipcMain.handle('accounts:create', async (_e, data: schema.NewAccount) => {
    const result = db
      .insert(schema.accounts)
      .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning()
      .get()
    persistDb()
    return result
  })

  ipcMain.handle('accounts:update', async (_e, id: number, data: Partial<schema.NewAccount>) => {
    const result = db
      .update(schema.accounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.accounts.id, id))
      .returning()
      .get()
    persistDb()
    return result
  })

  ipcMain.handle('accounts:archive', async (_e, id: number, archived: boolean) => {
    db.update(schema.accounts)
      .set({ archived, updatedAt: new Date() })
      .where(eq(schema.accounts.id, id))
      .run()
    persistDb()
    return { ok: true }
  })

  // --- Categories ---
  ipcMain.handle('categories:list', (_e, params: { profileId?: number; type?: 'income' | 'expense' } = {}) => {
    const conds: any[] = []
    if (params.profileId) conds.push(eq(schema.categories.profileId, params.profileId))
    if (params.type) conds.push(eq(schema.categories.type, params.type))
    conds.push(eq(schema.categories.archived, false))
    return db.select().from(schema.categories).where(and(...conds)).orderBy(schema.categories.name).all()
  })

  ipcMain.handle('categories:create', async (_e, data: schema.NewCategory) => {
    const result = db
      .insert(schema.categories)
      .values({ ...data, createdAt: new Date() })
      .returning()
      .get()
    persistDb()
    return result
  })

  // --- Transactions ---
  ipcMain.handle('transactions:list', (_e, params: { profileId?: number; from?: string; to?: string; type?: 'income' | 'expense'; limit?: number } = {}) => {
    const conds: any[] = []
    if (params.profileId) conds.push(eq(schema.transactions.profileId, params.profileId))
    if (params.from) conds.push(gte(schema.transactions.date, params.from))
    if (params.to) conds.push(lte(schema.transactions.date, params.to))
    if (params.type) conds.push(eq(schema.transactions.type, params.type))
    const where = conds.length ? and(...conds) : undefined
    return db
      .select()
      .from(schema.transactions)
      .where(where)
      .orderBy(desc(schema.transactions.date))
      .limit(params.limit ?? 500)
      .all()
  })

  ipcMain.handle('transactions:create', async (_e, data: schema.NewTransaction) => {
    const result = db
      .insert(schema.transactions)
      .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning()
      .get()
    // Atualiza o saldo da conta: income soma, expense subtrai
    const delta = data.type === 'income' ? data.amount : -data.amount
    db.run(`UPDATE accounts SET balance = balance + (?), updated_at = ? WHERE id = ?`, [
      delta,
      Date.now(),
      data.accountId
    ])
    persistDb()
    return result
  })

  ipcMain.handle('transactions:update', async (_e, id: number, data: Partial<schema.NewTransaction>) => {
    // Se mudou amount/type/accountId, ajustar saldo
    if (data.amount !== undefined || data.type !== undefined || data.accountId !== undefined) {
      const old = db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).get()
      if (old) {
        // Reverte o efeito antigo
        const revert = old.type === 'income' ? -old.amount : old.amount
        db.run(`UPDATE accounts SET balance = balance + (?), updated_at = ? WHERE id = ?`, [
          revert,
          Date.now(),
          old.accountId
        ])
        // Aplica o novo (se accountId não foi passado, mantém o mesmo)
        const newType = data.type ?? old.type
        const newAmount = data.amount ?? old.amount
        const newAccountId = data.accountId ?? old.accountId
        const apply = newType === 'income' ? newAmount : -newAmount
        db.run(`UPDATE accounts SET balance = balance + (?), updated_at = ? WHERE id = ?`, [
          apply,
          Date.now(),
          newAccountId
        ])
      }
    }
    const result = db
      .update(schema.transactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.transactions.id, id))
      .returning()
      .get()
    persistDb()
    return result
  })

  ipcMain.handle('transactions:delete', async (_e, id: number) => {
    const t = db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).get()
    if (t) {
      const revert = t.type === 'income' ? -t.amount : t.amount
      db.run(`UPDATE accounts SET balance = balance + (?), updated_at = ? WHERE id = ?`, [
        revert,
        Date.now(),
        t.accountId
      ])
    }
    db.delete(schema.transactions).where(eq(schema.transactions.id, id)).run()
    persistDb()
    return { ok: true }
  })

  // Overview agregado pro dashboard financeiro
  ipcMain.handle('finance:overview', (_e, params: { from: string; to: string; profileId?: number }) => {
    const conds: any[] = [
      gte(schema.transactions.date, params.from),
      lte(schema.transactions.date, params.to)
    ]
    if (params.profileId) conds.push(eq(schema.transactions.profileId, params.profileId))

    const txs = db.select().from(schema.transactions).where(and(...conds)).all()

    let income = 0
    let expense = 0
    for (const t of txs) {
      if (t.type === 'income') income += t.amount
      else expense += t.amount
    }

    const accConds: any[] = [eq(schema.accounts.archived, false)]
    if (params.profileId) accConds.push(eq(schema.accounts.profileId, params.profileId))
    const accs = db.select().from(schema.accounts).where(and(...accConds)).all()
    const totalBalance = accs.reduce((sum, a) => sum + a.balance, 0)

    return {
      income,
      expense,
      net: income - expense,
      totalBalance,
      transactionCount: txs.length
    }
  })

  // --- Subscriptions ---
  ipcMain.handle('subscriptions:list', (_e, params: { profileId?: number; activeOnly?: boolean } = {}) => {
    const conds: any[] = []
    if (params.profileId) conds.push(eq(schema.subscriptions.profileId, params.profileId))
    if (params.activeOnly) conds.push(eq(schema.subscriptions.active, true))
    return db.select().from(schema.subscriptions).where(conds.length ? and(...conds) : undefined).all()
  })

  ipcMain.handle('subscriptions:create', async (_e, data: schema.NewSubscription) => {
    const result = db
      .insert(schema.subscriptions)
      .values({ ...data, createdAt: new Date() })
      .returning()
      .get()
    persistDb()
    return result
  })

  ipcMain.handle('subscriptions:update', async (_e, id: number, data: Partial<schema.NewSubscription>) => {
    const result = db
      .update(schema.subscriptions)
      .set(data)
      .where(eq(schema.subscriptions.id, id))
      .returning()
      .get()
    persistDb()
    return result
  })

  ipcMain.handle('subscriptions:delete', async (_e, id: number) => {
    db.delete(schema.subscriptions).where(eq(schema.subscriptions.id, id)).run()
    persistDb()
    return { ok: true }
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

