import { useEffect, useState } from 'react'
import { Save, Smile, Battery } from 'lucide-react'
import { todayStr, fmtDate } from '../lib/utils'
import { useT } from '../lib/i18n'
import { useProfileStore } from '../store/useProfile'

export function Journal() {
  const t = useT()
  const activeWs = useProfileStore((s) => s.getActive())
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!activeWs) return
      const entries = await window.api.journal.list({ from: todayStr(), to: todayStr(), profileId: activeWs.id })
      const today = entries[0] as any
      if (today) {
        setContent(today.content || '')
        setMood(today.mood)
        setEnergy(today.energy)
      }
    }
    load()
  }, [activeWs?.id])

  const save = async () => {
    if (!activeWs) return
    setSaving(true)
    try {
      await window.api.journal.upsert({
        profileId: activeWs.id,
        date: todayStr(),
        content,
        mood,
        energy
      })
      setSavedAt(new Date())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold">{fmtDate(new Date(), 'EEEE, MMM d')}</h2>
          {savedAt && <span className="text-xs text-text-muted">{t('journal.saved_at')} {savedAt.toLocaleTimeString()}</span>}
        </div>
        <p className="text-xs text-text-muted mb-5">{t('journal.reflection')}</p>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="label flex items-center gap-1.5 mb-2">
              <Smile className="w-3 h-3" />
              {t('journal.mood')}
            </label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setMood(n)}
                  className={`flex-1 py-2 rounded-md border text-sm transition-colors ${
                    mood === n
                      ? 'bg-accent-soft border-accent'
                      : 'border-border text-text-muted hover:text-text'
                  }`}
                >
                  {['😞', '😕', '😐', '🙂', '😄'][n - 1]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label flex items-center gap-1.5 mb-2">
              <Battery className="w-3 h-3" />
              {t('journal.energy')}
            </label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setEnergy(n)}
                  className={`flex-1 py-2 rounded-md border text-sm transition-colors ${
                    energy === n
                      ? 'bg-accent-soft border-accent'
                      : 'border-border text-text-muted hover:text-text'
                  }`}
                >
                  {['▁', '▂', '▄', '▆', '█'][n - 1]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('journal.placeholder')}
          className="input min-h-[280px] resize-none leading-relaxed"
        />

        <div className="flex justify-end mt-4">
          <button onClick={save} disabled={saving} className="btn btn-primary">
            <Save className="w-4 h-4" />
            {saving ? '...' : t('journal.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

