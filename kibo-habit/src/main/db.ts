import initSqlJs, { Database as SqlDatabase, SqlJsStatic } from 'sql.js'
import { drizzle, type SQLJsDatabase } from 'drizzle-orm/sql-js'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'
import * as schema from '../shared/schema'

type DrizzleDb = SQLJsDatabase<typeof schema>

let dbInstance: DrizzleDb | null = null
let rawDb: SqlDatabase | null = null
let dbPath = ''

async function loadSqlJs(): Promise<SqlJsStatic> {
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
  const wasmBinary = readFileSync(wasmPath)
  return initSqlJs({ wasmBinary: wasmBinary as any } as any)
}

function persist() {
  if (!rawDb || !dbPath) return
  const data = rawDb.export()
  writeFileSync(dbPath, Buffer.from(data))
}

function safeExec(sql: string) {
  if (!rawDb) return
  try {
    rawDb.exec(sql)
  } catch {
    // ignore if column/table already exists or migration noop
  }
}

/**
 * Renomeia o arquivo do DB antigo pro novo nome. Só roda na primeira
 * vez que o app abre depois do rename kibo-habit → KUXY. Depois disso,
 * kibo-habit.db não vai mais existir e o renameSync falha silenciosamente.
 *
 * Não tem custo de manter migration de versão pq o DB é local e v0.2.0
 * ainda não foi publicada (não tem users em produção pra quebrar).
 */
function migrateDbFilename(userDataPath: string): string {
  const newPath = join(userDataPath, 'kuxy.db')
  const oldPath = join(userDataPath, 'kibo-habit.db')
  if (!existsSync(newPath) && existsSync(oldPath)) {
    try {
      renameSync(oldPath, newPath)
    } catch {
      // ignore — vai criar fresh
    }
  }
  return newPath
}

export async function getDb(): Promise<DrizzleDb> {
  if (dbInstance) return dbInstance

  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }

  dbPath = migrateDbFilename(userDataPath)

  const SQL = await loadSqlJs()
  let initialData: Uint8Array | undefined
  if (existsSync(dbPath)) {
    initialData = new Uint8Array(readFileSync(dbPath))
  }
  rawDb = new SQL.Database(initialData)

  // Profiles (sempre presente) — substitui o antigo `workspaces`
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'personal',
      color TEXT NOT NULL DEFAULT '#a855f7',
      icon TEXT NOT NULL DEFAULT 'user',
      sidebar_items TEXT NOT NULL DEFAULT '["/","/habits","/routines","/calendar","/stats","/journal","/focus","/goals"]',
      archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `)

  // Migration: rename `workspaces` → `profiles` se existir de uma versão antiga.
  // Como `workspaces` e `profiles` têm o mesmo shape (com adição de sidebar_items),
  // basta renomear a tabela e adicionar a coluna nova.
  safeExec(`ALTER TABLE workspaces RENAME TO profiles`)
  safeExec(`ALTER TABLE profiles ADD COLUMN sidebar_items TEXT NOT NULL DEFAULT '["/","/habits","/routines","/calendar","/stats","/journal","/focus","/goals"]'`)

  // Seeds default — Pessoal (full sidebar) + Profissional (subset focado em produtividade)
  const profileCount = rawDb.exec(`SELECT COUNT(*) as c FROM profiles`)[0]
  const count = profileCount?.values?.[0]?.[0] as number
  if (!count) {
    const now = Date.now()
    rawDb.exec(`
      INSERT INTO profiles (name, slug, type, color, icon, sidebar_items, archived, created_at)
      VALUES
        ('Pessoal', 'personal', 'personal', '#a855f7', 'user',
         '["/","/habits","/routines","/calendar","/journal","/focus","/goals"]', 0, ${now}),
        ('Profissional', 'professional', 'professional', '#3b82f6', 'briefcase',
         '["/","/habits","/stats","/journal","/focus","/goals"]', 0, ${now});
    `)
  }

  // Outras tabelas — agora referenciam profiles em vez de workspaces
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'circle',
      color TEXT DEFAULT '#a855f7',
      category TEXT,
      recurrence TEXT NOT NULL DEFAULT '{"type":"daily"}',
      target INTEGER DEFAULT 1,
      unit TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS completions (
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      value INTEGER DEFAULT 0,
      note TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (habit_id, date)
    );

    CREATE TABLE IF NOT EXISTS routines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      time_of_day TEXT NOT NULL DEFAULT 'morning',
      archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routine_habits (
      routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      "order" INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (routine_id, habit_id)
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE,
      date TEXT NOT NULL UNIQUE,
      mood INTEGER,
      energy INTEGER,
      content TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE,
      habit_id INTEGER REFERENCES habits(id) ON DELETE SET NULL,
      duration INTEGER NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      status TEXT NOT NULL DEFAULT 'completed'
    );

    CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(date);
    CREATE INDEX IF NOT EXISTS idx_focus_started ON focus_sessions(started_at);
  `)

  // Migrations: renomeia workspace_id → profile_id nas tabelas que existirem
  // de um DB antigo. Como sqlite não tem RENAME COLUMN nativo, recriamos a
  // tabela com a coluna nova e copiamos os dados. Como o profile_id default
  // já é 1 e vamos apontar tudo pro Pessoal via backfill abaixo, isso fica
  // seguro — só não funciona pra DBs que tinham profiles além do id=1.
  const renameWorkspaceCol = (table: string) => {
    // tenta criar coluna profile_id se ainda não existir
    safeExec(`ALTER TABLE ${table} ADD COLUMN profile_id INTEGER NOT NULL DEFAULT 1 REFERENCES profiles(id) ON DELETE CASCADE`)
    // copia valor de workspace_id pra profile_id se workspace_id existir
    safeExec(`UPDATE ${table} SET profile_id = workspace_id WHERE workspace_id IS NOT NULL`)
  }
  renameWorkspaceCol('habits')
  renameWorkspaceCol('routines')
  renameWorkspaceCol('journal_entries')
  renameWorkspaceCol('focus_sessions')

  // Backfill qualquer linha órfã pro perfil Pessoal
  const personal = rawDb.exec(`SELECT id FROM profiles WHERE slug='personal' LIMIT 1`)[0]
  const personalId = personal?.values?.[0]?.[0] as number
  if (personalId) {
    safeExec(`UPDATE habits SET profile_id = ${personalId} WHERE profile_id NOT IN (SELECT id FROM profiles)`)
    safeExec(`UPDATE routines SET profile_id = ${personalId} WHERE profile_id NOT IN (SELECT id FROM profiles)`)
    safeExec(`UPDATE journal_entries SET profile_id = ${personalId} WHERE profile_id NOT IN (SELECT id FROM profiles)`)
    safeExec(`UPDATE focus_sessions SET profile_id = ${personalId} WHERE profile_id NOT IN (SELECT id FROM profiles)`)
  }

  dbInstance = drizzle(rawDb, { schema })
  return dbInstance
}

export function persistDb() {
  persist()
}

export function getDbInstance(): DrizzleDb {
  if (!dbInstance) {
    throw new Error('DB not initialized. Call getDb() in app.whenReady() first.')
  }
  return dbInstance
}