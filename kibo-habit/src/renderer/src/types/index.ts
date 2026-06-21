export type ProfileType = 'personal' | 'professional' | 'custom'

export interface Profile {
  id: number
  name: string
  slug: ProfileType | string
  type: ProfileType
  color: string
  icon: string
  sidebarItems: string[] // paths permitidos na sidebar
  archived: boolean
  createdAt: number | Date
}

export type Recurrence =
  | { type: 'daily' }
  | { type: 'weekly'; days: number[] }
  | { type: 'interval'; days: number }
  | { type: 'weekly_count'; count: number }

export interface Habit {
  id: number
  name: string
  description: string | null
  icon: string
  color: string
  category: string | null
  recurrence: string
  target: number
  unit: string | null
  archived: boolean
  createdAt: number | Date
  updatedAt: number | Date
}

export interface Completion {
  habitId: number
  date: string
  count: number
  value: number
  note: string | null
  createdAt: number | Date
}

export interface Routine {
  id: number
  name: string
  description: string | null
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime'
  archived: boolean
  createdAt: number | Date
}

export interface JournalEntry {
  id: number
  date: string
  mood: number | null
  energy: number | null
  content: string | null
  createdAt: number | Date
  updatedAt: number | Date
}

export interface FocusSession {
  id: number
  habitId: number | null
  duration: number
  startedAt: number | Date
  completedAt: number | Date | null
  status: 'running' | 'completed' | 'aborted'
}