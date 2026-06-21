import { Plus, Sun, Moon, Sunset, Coffee } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../lib/i18n'

const TIME_OF_DAY: Array<{ v: 'morning' | 'afternoon' | 'evening' | 'anytime'; icon: any; emptyKey: string }> = [
  { v: 'morning', icon: Sun, emptyKey: 'routines.empty_morning' },
  { v: 'afternoon', icon: Coffee, emptyKey: 'routines.empty_afternoon' },
  { v: 'evening', icon: Sunset, emptyKey: 'routines.empty_evening' },
  { v: 'anytime', icon: Moon, emptyKey: 'routines.empty_anytime' }
]

export function Routines() {
  const t = useT()
  const [showNew, setShowNew] = useState(false)

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold">{t('routines.title')}</h2>
          <p className="text-xs text-text-muted mt-0.5">{t('routines.hint')}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          {t('routines.new')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {TIME_OF_DAY.map((td) => (
          <div key={td.v} className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <td.icon className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold">{t(`routines.${td.v}`)}</h3>
            </div>
            <div className="text-xs text-text-muted py-8 text-center">{t(td.emptyKey)}</div>
          </div>
        ))}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[420px] card p-6">
            <h3 className="text-base font-semibold mb-4">{t('routines.new')}</h3>
            <input placeholder={t('routines.name_placeholder')} className="input mb-3" />
            <select className="input mb-4">
              {TIME_OF_DAY.map((td) => (
                <option key={td.v} value={td.v}>
                  {t(`routines.${td.v}`)}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="btn btn-secondary">
                {t('common.cancel')}
              </button>
              <button onClick={() => setShowNew(false)} className="btn btn-primary">
                {t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
