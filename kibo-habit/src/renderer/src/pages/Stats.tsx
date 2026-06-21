import { BarChart3 } from 'lucide-react'
import { useT } from '../lib/i18n'

export function Stats() {
  const t = useT()
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="card p-12 text-center">
        <BarChart3 className="w-10 h-10 text-text-subtle mx-auto mb-3" />
        <h2 className="text-base font-semibold mb-1">{t('stats.title')}</h2>
        <p className="text-sm text-text-muted max-w-md mx-auto">{t('stats.empty')}</p>
      </div>
    </div>
  )
}
