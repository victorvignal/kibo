import { useEffect, useState } from 'react'
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react'
import { todayStr, formatDuration } from '../lib/utils'
import { useT } from '../lib/i18n'
import { useProfileStore } from '../store/useProfile'

export function Focus() {
  const t = useT()
  const activeWs = useProfileStore((s) => s.getActive())
  const PRESETS = [
    { key: 'pomodoro', minutes: 25 },
    { key: 'deep_work', minutes: 50 },
    { key: 'short', minutes: 15 },
    { key: 'long', minutes: 90 }
  ] as const

  const [preset, setPreset] = useState<typeof PRESETS[number]>(PRESETS[0])
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[0].minutes * 60)
  const [running, setRunning] = useState(false)
  const [completedToday, setCompletedToday] = useState(0)
  const [totalSecondsToday, setTotalSecondsToday] = useState(0)

  const load = async () => {
    if (!activeWs) return
    const sessions = await window.api.focus.list({
      from: `${todayStr()}T00:00:00`,
      to: `${todayStr()}T23:59:59`,
      profileId: activeWs.id
    })
    const completed = (sessions as any[]).filter((s) => s.status === 'completed')
    setCompletedToday(completed.length)
    setTotalSecondsToday(completed.reduce((acc, s) => acc + s.duration, 0))
  }

  useEffect(() => {
    load()
  }, [activeWs?.id])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.api.focus.create({
            profileId: activeWs?.id || 1,
            habitId: null,
            duration: preset.minutes * 60,
            startedAt: new Date(Date.now() - preset.minutes * 60 * 1000),
            completedAt: new Date(),
            status: 'completed'
          })
          setRunning(false)
          load()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [running, preset, activeWs?.id])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const progress = 1 - secondsLeft / (preset.minutes * 60)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="card p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2 text-text-muted">
          <Coffee className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider font-medium">{t('focus.title')}</span>
        </div>

        <div className="relative w-64 h-64 mx-auto my-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" stroke="#22222f" strokeWidth="6" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="#a855f7"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${progress * 282.7} 282.7`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-5xl font-semibold tabular-nums tracking-tight">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setPreset(p)
                setSecondsLeft(p.minutes * 60)
                setRunning(false)
              }}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                preset.key === p.key
                  ? 'bg-accent-soft border-accent text-white'
                  : 'border-border text-text-muted hover:text-text'
              }`}
            >
              {t(`focus.presets.${p.key}`)} · {p.minutes}m
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              setSecondsLeft(preset.minutes * 60)
              setRunning(false)
            }}
            className="btn btn-secondary"
          >
            <RotateCcw className="w-4 h-4" />
            {t('focus.reset')}
          </button>
          <button
            onClick={() => setRunning((r) => !r)}
            disabled={secondsLeft === 0 && !running}
            className="btn btn-primary"
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {running ? t('focus.pause') : t('focus.start')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-border">
          <div>
            <div className="text-xs text-text-muted">{t('focus.sessions_today')}</div>
            <div className="text-2xl font-semibold">{completedToday}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">{t('focus.total_focus')}</div>
            <div className="text-2xl font-semibold">{formatDuration(totalSecondsToday)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

