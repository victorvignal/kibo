import { useEffect, useState } from 'react'
import { Check, Trash2, Flame, Plus, Search, Filter } from 'lucide-react'
import { NewHabitDialog } from '../components/habits/NewHabitDialog'
import { todayStr, calcStreak, calcCompletionRate, cn } from '../lib/utils'
import { useT } from '../lib/i18n'
import { useProfileStore } from '../store/useProfile'
import type { Habit, Completion } from '../types'

export function Habits() {
  const t = useT()
  const activeWs = useProfileStore((s) => s.getActive())
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [showNew, setShowNew] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  const load = async () => {
    if (!activeWs) return
    const [h, c] = await Promise.all([
      window.api.habits.list({ profileId: activeWs.id }),
      window.api.completions.list({ profileId: activeWs.id })
    ])
    setHabits(h as Habit[])
    setCompletions(c as Completion[])
  }

  useEffect(() => {
    load()
  }, [activeWs?.id])

  const today = todayStr()
  const completedSet = new Set(
    completions.filter((c) => c.date === today).map((c) => c.habitId)
  )

  const toggle = async (id: number) => {
    await window.api.completions.toggle(id, today)
    await load()
  }

  const remove = async (id: number) => {
    if (!confirm(t('habits.confirm_delete'))) return
    await window.api.habits.delete(id)
    await load()
  }

  const categories = Array.from(new Set(habits.map((h) => h.category).filter(Boolean))) as string[]

  const filtered = habits
    .filter((h) => !query || h.name.toLowerCase().includes(query.toLowerCase()))
    .filter((h) => !category || h.category === category)

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('habits.search')}
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-text-muted" />
          <button
            onClick={() => setCategory(null)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-md border transition-colors',
              !category
                ? 'bg-accent-soft border-accent text-white'
                : 'border-border text-text-muted hover:text-text'
            )}
          >
            {t('habits.filter_all')}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-md border transition-colors',
                category === c
                  ? 'bg-accent-soft border-accent text-white'
                  : 'border-border text-text-muted hover:text-text'
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowNew(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          {t('habits.new')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-text-muted mb-3">
            {habits.length === 0 ? t('habits.empty') : t('habits.empty_filtered')}
          </p>
          {habits.length === 0 && (
            <button onClick={() => setShowNew(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              {t('habits.create_first')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((h) => {
            const done = completedSet.has(h.id)
            const habitCompletions = completions.filter((c) => c.habitId === h.id).map((c) => c.date)
            const streak = calcStreak(habitCompletions)
            const rate = calcCompletionRate(habitCompletions, 30)
            return (
              <div
                key={h.id}
                className={cn(
                  'card p-4 transition-all hover:border-border-strong',
                  done && 'ring-1 ring-accent/40'
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggle(h.id)}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all',
                      done
                        ? 'border-transparent text-white'
                        : 'border-border hover:border-accent'
                    )}
                    style={done ? { background: h.color } : {}}
                  >
                    {done && <Check className="w-5 h-5" strokeWidth={3} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className={cn('font-medium text-sm truncate', done && 'line-through opacity-60')}>
                      {h.name}
                    </h3>
                    {h.category && (
                      <span className="text-[10px] text-text-subtle uppercase tracking-wider">
                        {h.category}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => remove(h.id)}
                    className="btn-ghost p-1 rounded opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-text-muted mb-0.5">
                      <Flame className="w-3 h-3" />
                      {t('habits.streak')}
                    </div>
                    <div className="text-base font-semibold">{streak}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted mb-0.5">{t('habits.rate_30d')}</div>
                    <div className="text-base font-semibold">{rate}%</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNew && <NewHabitDialog onClose={() => setShowNew(false)} onCreated={load} />}
    </div>
  )
}

