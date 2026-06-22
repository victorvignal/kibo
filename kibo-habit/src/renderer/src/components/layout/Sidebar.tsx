import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Target,
  Layers,
  Calendar as CalendarIcon,
  BarChart3,
  BookOpen,
  Timer,
  Flag,
  CircleDollarSign,
  Settings as SettingsIcon,
  Search,
  Lightbulb
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useProfileStore } from '../../store/useProfile'
import { useT } from '../../lib/i18n'
import { ProfileSwitcher } from './ProfileSwitcher'

const ITEM_ICONS: Record<string, any> = {
  '/': LayoutDashboard,
  '/habits': Target,
  '/routines': Layers,
  '/calendar': CalendarIcon,
  '/stats': BarChart3,
  '/journal': BookOpen,
  '/focus': Timer,
  '/goals': Flag,
  '/finance': CircleDollarSign
}

const KEY_BY_PATH: Record<string, string> = {
  '/': 'nav.dashboard',
  '/habits': 'nav.habits',
  '/routines': 'nav.routines',
  '/calendar': 'nav.calendar',
  '/stats': 'nav.stats',
  '/journal': 'nav.journal',
  '/focus': 'nav.focus',
  '/goals': 'nav.goals',
  '/finance': 'nav.finance'
}

export function Sidebar() {
  const t = useT()
  const active = useProfileStore((s) => s.getActive())

  // Itens permitidos pelo perfil ativo. Se nao tem perfil carregado ainda,
  // mostra a lista completa (vai piscar por ~50ms no primeiro load).
  const allowed = active?.sidebarItems ?? [
    '/',
    '/habits',
    '/routines',
    '/calendar',
    '/stats',
    '/journal',
    '/focus',
    '/goals',
    '/finance'
  ]

  return (
    <aside className="w-sidebar shrink-0 border-r border-border bg-bg-subtle flex flex-col h-screen">
      {/* Brand + Profile Switcher + Search */}
      <div className="px-3 pt-4 pb-3 space-y-3">
        {/* Brand */}
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">K</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold tracking-tight leading-tight">
              {t('app.name')}
            </div>
            <div className="text-[10px] text-text-subtle leading-tight mt-0.5">
              {t('app.tagline')}
            </div>
          </div>
        </div>

        {/* Profile switcher (era no topbar, agora vive aqui) */}
        <ProfileSwitcher />

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-subtle" />
          <input
            type="text"
            placeholder={t('common.search')}
            className="w-full bg-bg border border-border rounded-lg pl-8 pr-12 py-1.5 text-xs placeholder:text-text-subtle focus:outline-none focus:border-border-strong transition-colors"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-text-subtle text-[9px] font-medium">
            <span className="px-1 py-0.5 rounded border border-border bg-bg-card">⌘</span>
            <span className="px-1 py-0.5 rounded border border-border bg-bg-card">K</span>
          </div>
        </div>
      </div>

      {/* Items do perfil + bloco Geral */}
      <div className="flex-1 px-3 overflow-y-auto space-y-3">
        <nav className="space-y-0.5">
          {allowed
            .filter((path) => ITEM_ICONS[path])
            .map((path) => {
              const Icon = ITEM_ICONS[path]
              const labelKey = KEY_BY_PATH[path]
              return (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                      isActive
                        ? 'bg-bg-hover text-text font-medium'
                        : 'text-text-muted hover:text-text hover:bg-bg-hover/50'
                    )
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t(labelKey)}</span>
                </NavLink>
              )
            })}
        </nav>

        <div className="pt-1">
          <div className="px-2 pb-1 text-[10px] font-medium text-text-subtle uppercase tracking-wider">
            {t('nav.general')}
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                isActive
                  ? 'bg-bg-hover text-text font-medium'
                  : 'text-text-muted hover:text-text hover:bg-bg-hover/40'
              )
            }
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>{t('nav.settings')}</span>
          </NavLink>
        </div>
      </div>

      {/* Bottom: Tip */}
      <div className="p-3 space-y-2 border-t border-border">
        <div className="rounded-xl bg-gradient-to-br from-accent/15 to-purple-700/10 border border-accent/20 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb className="w-3 h-3 text-accent" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              Tip
            </span>
          </div>
          <p className="text-xs text-text leading-relaxed">{t('sidebar.tip_body')}</p>
        </div>
      </div>
    </aside>
  )
}
