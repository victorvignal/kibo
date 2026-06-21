import { Flag, Plus } from 'lucide-react'
import { useT } from '../lib/i18n'

export function Goals() {
  const t = useT()
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold">{t('goals.title')}</h2>
          <p className="text-xs text-text-muted mt-0.5">{t('goals.hint')}</p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4" />
          {t('goals.new')}
        </button>
      </div>

      <div className="card p-12 text-center">
        <Flag className="w-10 h-10 text-text-subtle mx-auto mb-3" />
        <h3 className="text-base font-semibold mb-1">{t('goals.empty.title')}</h3>
        <p className="text-sm text-text-muted max-w-md mx-auto mb-4">{t('goals.empty.hint')}</p>
        <button className="btn btn-primary inline-flex">
          <Plus className="w-4 h-4" />
          {t('goals.create_first')}
        </button>
      </div>
    </div>
  )
}
