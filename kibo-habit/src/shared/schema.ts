import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

/**
 * Schema do KUXY.
 *
 * Convenção de nomes:
 *   - Tabelas em snake_case no banco, camelCase no TS (Drizzle cuida)
 *   - IDs auto-increment integer
 *   - Timestamps como integer (ms epoch) com $defaultFn
 *   - Foreign keys com cascade delete
 *   - archived boolean pra soft delete (não apagar hábito que tem histórico)
 */

/**
 * Perfis são o agrupamento principal do app. Cada perfil tem seus próprios
 * hábitos, rotinas, diário, sessões de foco, etc.
 *
 * `slug` é a chave de identificação semântica (personal, professional, custom).
 * `sidebarItems` é JSON array de paths permitidos na sidebar pra esse perfil.
 *   Ex: ["/", "/habits", "/journal"] esconde Rotinas/Calendário/Stats/Foco/Metas
 *
 * Profiles foram renomeados de workspaces em v0.2.0. Mantemos compat com DBs
 * antigos via migration no db.ts (renomeia tabela e coluna workspace_id).
 */
export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull().default('personal'),
  color: text('color').notNull().default('#a855f7'),
  icon: text('icon').notNull().default('user'),
  description: text('description'),
  sidebarItems: text('sidebar_items').notNull().default('["/","/habits","/routines","/calendar","/stats","/journal","/focus","/goals"]'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export const habits = sqliteTable('habits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileId: integer('profile_id')
    .notNull()
    .default(1)
    .references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon').default('circle'),
  color: text('color').default('#a855f7'),
  category: text('category'),
  recurrence: text('recurrence').notNull().default('{"type":"daily"}'),
  target: integer('target').default(1),
  unit: text('unit'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export const completions = sqliteTable(
  'completions',
  {
    habitId: integer('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    count: integer('count').notNull().default(1),
    value: integer('value').default(0),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
  },
  (t) => ({
    pk: primaryKey({ columns: [t.habitId, t.date] })
  })
)

export const routines = sqliteTable('routines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileId: integer('profile_id')
    .notNull()
    .default(1)
    .references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  timeOfDay: text('time_of_day').notNull().default('morning'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export const routineHabits = sqliteTable(
  'routine_habits',
  {
    routineId: integer('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    habitId: integer('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    order: integer('order').notNull().default(0)
  },
  (t) => ({
    pk: primaryKey({ columns: [t.routineId, t.habitId] })
  })
)

export const journalEntries = sqliteTable('journal_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileId: integer('profile_id')
    .notNull()
    .default(1)
    .references(() => profiles.id, { onDelete: 'cascade' }),
  date: text('date').notNull().unique(),
  mood: integer('mood'),
  energy: integer('energy'),
  content: text('content'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export const focusSessions = sqliteTable('focus_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileId: integer('profile_id')
    .notNull()
    .default(1)
    .references(() => profiles.id, { onDelete: 'cascade' }),
  habitId: integer('habit_id').references(() => habits.id, { onDelete: 'set null' }),
  duration: integer('duration').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  status: text('status').notNull().default('completed')
})

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
export type Habit = typeof habits.$inferSelect
export type NewHabit = typeof habits.$inferInsert
export type Completion = typeof completions.$inferSelect
export type NewCompletion = typeof completions.$inferInsert
export type Routine = typeof routines.$inferSelect
export type NewRoutine = typeof routines.$inferInsert
export type JournalEntry = typeof journalEntries.$inferSelect
export type NewJournalEntry = typeof journalEntries.$inferInsert
export type FocusSession = typeof focusSessions.$inferSelect
export type NewFocusSession = typeof focusSessions.$inferInsert

/**
 * Itens disponíveis na sidebar. O path é a chave, e cada perfil diz
 * quais itens aparecem nele (via profiles.sidebarItems).
 *
 * NÃO confundir com rotas do React Router — é o mesmo path por
 * coincidência, mas se a sidebar mostrar algo que não é rota
 * (ex: link externo), vira só string livre.
 */
export const SIDEBAR_ITEMS = [
  '/',
  '/habits',
  '/routines',
  '/calendar',
  '/stats',
  '/journal',
  '/focus',
  '/goals'
] as const

export type SidebarItem = (typeof SIDEBAR_ITEMS)[number]

/** Defaults sensatos por tipo de perfil. Editáveis depois pelo usuário. */
export const DEFAULT_SIDEBAR_ITEMS: Record<string, SidebarItem[]> = {
  personal: ['/', '/habits', '/routines', '/calendar', '/journal', '/focus', '/goals'],
  professional: ['/', '/habits', '/stats', '/journal', '/focus', '/goals']
}