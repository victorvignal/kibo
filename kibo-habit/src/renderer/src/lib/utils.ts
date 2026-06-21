import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, differenceInCalendarDays, subDays, startOfDay, isValid } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function fmtDate(date: string | Date, pattern = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, pattern)
}

export function rangeStr(days: number, endDate: Date = new Date()): { from: string; to: string } {
  const end = startOfDay(endDate)
  const start = subDays(end, days - 1)
  return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') }
}

export function calcStreak(completionDates: string[]): number {
  if (!completionDates.length) return 0
  const sorted = [...new Set(completionDates)].sort().reverse()
  const today = startOfDay(new Date())
  let streak = 0
  let cursor = today
  // Allow yesterday as starting point if today not done
  if (sorted[0] !== format(today, 'yyyy-MM-dd')) {
    const yesterday = subDays(today, 1)
    if (sorted[0] === format(yesterday, 'yyyy-MM-dd')) {
      cursor = yesterday
    } else {
      return 0
    }
  }
  for (const d of sorted) {
    if (d === format(cursor, 'yyyy-MM-dd')) {
      streak++
      cursor = subDays(cursor, 1)
    } else {
      break
    }
  }
  return streak
}

export function calcLongestStreak(completionDates: string[]): number {
  if (!completionDates.length) return 0
  const sorted = [...new Set(completionDates)].sort()
  let longest = 1
  let current = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = differenceInCalendarDays(parseISO(sorted[i]), parseISO(sorted[i - 1]))
    if (diff === 1) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  return longest
}

export function calcCompletionRate(completionDates: string[], days: number): number {
  if (days <= 0) return 0
  const set = new Set(completionDates)
  const today = startOfDay(new Date())
  let count = 0
  for (let i = 0; i < days; i++) {
    const d = format(subDays(today, i), 'yyyy-MM-dd')
    if (set.has(d)) count++
  }
  return Math.round((count / days) * 100)
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatDelta(value: number, asPercent = false): string {
  const sign = value > 0 ? '+' : ''
  return asPercent ? `${sign}${value.toFixed(1)}%` : `${sign}${value}`
}
