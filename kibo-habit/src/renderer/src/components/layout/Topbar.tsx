import { useLocation, Link } from 'react-router-dom'
import { Home, ChevronRight, Plus, Bell } from 'lucide-react'
import { useState } from 'react'
import { NewHabitDialog } from '../habits/NewHabitDialog'
import { useT } from '../../lib/i18n'

export function Topbar() {
  const location = useLocation()
  const t = useT()
  const [showNewHabit, setShowNewHabit] = useState(false)

  const TITLE_KEYS: Record<string, string> = {
    '/': 'nav.dashboard',
    '/habits': 'nav.habits',
    '/routines': 'nav.routines',
    '/calendar': 'nav.calendar',
    '/stats': 'nav.stats',
    '/journal': 'nav.journal',
    '/focus': 'nav.focus',
    '/goals': 'nav.goals',
    '/finance': 'nav.finance',
    '/settings': 'nav.settings'
  }

  const title = t(TITLE_KEYS[location.pathname] ?? 'app.name')

  return (
    <>
      <header className="h-topbar border-b border-border bg-bg flex items-center pl-6 pr-6 gap-3 shrink-0">
        {/* Breadcrumb (profile switcher agora vive na Sidebar) */}
        <nav className="flex items-center gap-1.5 text-sm">
          <Link
            to="/"
            className="text-text-muted hover:text-text transition-colors flex items-center gap-1"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>
          <ChevronRight className="w-3 h-3 text-text-subtle" />
          <span className="text-text font-medium">{title}</span>
        </nav>

        <div className="flex-1" />

        {/* Actions */}
        <button className="btn-ghost p-1.5 rounded relative">
          <Bell className="w-4 h-4" />
        </button>

        <button onClick={() => setShowNewHabit(true)} className="btn btn-secondary">
          <Plus className="w-3.5 h-3.5" />
          <span>{t('common.add')}</span>
        </button>
      </header>

      {showNewHabit && <NewHabitDialog onClose={() => setShowNewHabit(false)} />}
    </>
  )
}
