import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { useProfileStore } from '../../store/useProfile'
import type { Recurrence } from '../../types'

interface Props {
  onClose: () => void
  onCreated?: () => void
}

const COLORS = [
  '#a855f7',
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#14b8a6',
  '#8b5cf6'
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function NewHabitDialog({ onClose, onCreated }: Props) {
  const t = useT()
  const activeId = useProfileStore((s) => s.activeId)
  const profiles = useProfileStore((s) => s.profiles)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [category, setCategory] = useState('')
  const [profileId, setProfileId] = useState<number | undefined>()
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'interval' | 'weekly_count'>(
    'daily'
  )
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1, 3, 5])
  const [interval, setInterval] = useState(2)
  const [weeklyCount, setWeeklyCount] = useState(3)
  const [target, setTarget] = useState(1)
  const [unit, setUnit] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const p = profiles.find((x) => x.id === activeId)
    if (p) setProfileId(p.id)
  }, [activeId, profiles])

  const buildRecurrence = (): Recurrence => {
    switch (recurrenceType) {
      case 'daily':
        return { type: 'daily' }
      case 'weekly':
        return { type: 'weekly', days: [...weeklyDays].sort() }
      case 'interval':
        return { type: 'interval', days: interval }
      case 'weekly_count':
        return { type: 'weekly_count', count: weeklyCount }
    }
  }

  const toggleDay = (d: number) => {
    setWeeklyDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  const handleSave = async () => {
    if (!name.trim() || !profileId) return
    setSaving(true)
    try {
      await window.api.habits.create({
        profileId,
        name: name.trim(),
        description: description.trim() || null,
        icon: 'circle',
        color,
        category: category.trim() || null,
        recurrence: JSON.stringify(buildRecurrence()),
        target,
        unit: unit.trim() || null,
        archived: false
      })
      onCreated?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[480px] card p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{t('new_habit.title')}</h2>
          <button onClick={onClose} className="btn-ghost p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label mb-1.5 block">{t('new_habit.profile')}</label>
            <select
              value={profileId || ''}
              onChange={(e) => setProfileId(Number(e.target.value))}
              className="input"
            >
              {profiles.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label mb-1.5 block">{t('new_habit.name')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('new_habit.name_placeholder')}
              className="input"
              autoFocus
            />
          </div>

          <div>
            <label className="label mb-1.5 block">{t('new_habit.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('new_habit.description_placeholder')}
              className="input min-h-[60px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1.5 block">{t('new_habit.category')}</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Health, Work, ..."
                className="input"
              />
            </div>
            <div>
              <label className="label mb-1.5 block">{t('new_habit.unit')}</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="min, pages, km"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label mb-1.5 block">{t('new_habit.color')}</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-1.5 block">{t('new_habit.recurrence')}</label>
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {(
                [
                  { v: 'daily', l: t('new_habit.rec_daily') },
                  { v: 'weekly', l: t('new_habit.rec_weekly') },
                  { v: 'interval', l: t('new_habit.rec_interval') },
                  { v: 'weekly_count', l: t('new_habit.rec_weekly_count') }
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setRecurrenceType(opt.v)}
                  className={`text-xs py-1.5 rounded-md border transition-colors ${
                    recurrenceType === opt.v
                      ? 'bg-accent-soft border-accent text-white'
                      : 'border-border text-text-muted hover:text-text'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>

            {recurrenceType === 'weekly' && (
              <div className="flex gap-1.5">
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => toggleDay(i)}
                    className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                      weeklyDays.includes(i)
                        ? 'bg-accent-soft border-accent text-white'
                        : 'border-border text-text-muted hover:text-text'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
            {recurrenceType === 'interval' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">{t('new_habit.every')}</span>
                <input
                  type="number"
                  min={1}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input w-20"
                />
                <span className="text-sm text-text-muted">{t('new_habit.days')}</span>
              </div>
            )}
            {recurrenceType === 'weekly_count' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={weeklyCount}
                  onChange={(e) => setWeeklyCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input w-20"
                />
                <span className="text-sm text-text-muted">{t('new_habit.times_per_week')}</span>
              </div>
            )}
          </div>

          <div>
            <label className="label mb-1.5 block">{t('new_habit.target')}</label>
            <input
              type="number"
              min={1}
              value={target}
              onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value) || 1))}
              className="input w-24"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
          <button onClick={onClose} className="btn btn-secondary">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="btn btn-primary"
          >
            {saving ? '...' : t('new_habit.create')}
          </button>
        </div>
      </div>
    </div>
  )
}



