import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, User, Briefcase, X } from 'lucide-react'
import { useProfileStore } from '../../store/useProfile'
import { useT } from '../../lib/i18n'
import { cn } from '../../lib/utils'
import type { Profile, ProfileType } from '../../types'
import { SIDEBAR_ITEMS, DEFAULT_SIDEBAR_ITEMS } from '@shared/schema'

const ICONS: Record<string, any> = {
  user: User,
  briefcase: Briefcase
}

/**
 * Switcher de perfil no top-left do Topbar.
 *
 * Responsabilidades:
 *   - Mostrar perfil ativo (avatar com cor + nome + chevron)
 *   - Dropdown com lista de perfis, check no ativo, separador, "novo perfil"
 *   - Modal inline pra criar perfil (nome, tipo, cor, ícone, sidebar items)
 *   - Atualizar store + persistir via IPC
 *
 * Sidebar de cada perfil é configurável: o usuário pode desmarcar itens
 * que não fazem sentido (ex: Profissional sem "Rotinas").
 */
export function ProfileSwitcher() {
  const t = useT()
  const { profiles, activeId, setProfiles, setActive, upsertProfile } = useProfileStore()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Carrega perfis do DB no mount
  useEffect(() => {
    const load = async () => {
      const raw = (await window.api.profiles.list()) as Array<Profile & { sidebarItems: string | string[] }>
      // DB devolve sidebarItems como JSON string. Decodifica aqui pra
      // todo mundo que consome da store poder usar como array direto.
      const ps = raw.map((p) => ({
        ...p,
        sidebarItems: Array.isArray(p.sidebarItems)
          ? p.sidebarItems
          : (typeof p.sidebarItems === 'string' ? JSON.parse(p.sidebarItems) : [])
      })) as Profile[]
      setProfiles(ps)
      // Se ainda não tem activeId, pega o primeiro
      const current = useProfileStore.getState().activeId
      if (!current && ps.length > 0) {
        setActive(ps[0].id)
      }
    }
    load()
  }, [setProfiles, setActive])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const active = profiles.find((p) => p.id === activeId)
  const ActiveIcon = active ? (ICONS[active.icon] || User) : User

  const handleCreate = async (data: NewProfileData) => {
    const created = (await window.api.profiles.create({
      name: data.name,
      slug: data.slug,
      type: data.type,
      color: data.color,
      icon: data.icon,
      sidebarItems: JSON.stringify(data.sidebarItems)
    } as any)) as Profile
    // Decodifica sidebarItems (vem como string do DB)
    const normalized: Profile = {
      ...created,
      sidebarItems:
        typeof created.sidebarItems === 'string'
          ? JSON.parse(created.sidebarItems)
          : created.sidebarItems
    }
    upsertProfile(normalized)
    setActive(normalized.id)
    setCreating(false)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors',
          'hover:bg-bg-hover text-text'
        )}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: active?.color || '#a855f7' }}
        >
          <ActiveIcon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
        <div className="text-left min-w-0">
          <div className="text-sm font-semibold leading-tight truncate max-w-[140px]">
            {active?.name || t('profile.select')}
          </div>
          <div className="text-[10px] text-text-subtle leading-tight">
            {t('profile.active')}
          </div>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-72 z-50 card shadow-pop p-1.5">
          {!creating ? (
            <>
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-text-subtle uppercase tracking-wider">
                {t('profile.switch')}
              </div>
              <div className="space-y-0.5 max-h-72 overflow-y-auto">
                {profiles.map((p) => {
                  const Icon = ICONS[p.icon] || User
                  const isActive = p.id === activeId
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActive(p.id)
                        setOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors',
                        isActive ? 'bg-bg-hover' : 'hover:bg-bg-hover/50'
                      )}
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: p.color }}
                      >
                        <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-[10px] text-text-subtle truncate">
                          {p.sidebarItems.length} {t('profile.items')}
                        </div>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                    </button>
                  )
                })}
              </div>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('profile.new')}
              </button>
            </>
          ) : (
            <NewProfileForm onSubmit={handleCreate} onCancel={() => setCreating(false)} />
          )}
        </div>
      )}
    </div>
  )
}

interface NewProfileData {
  name: string
  slug: string
  type: ProfileType
  color: string
  icon: string
  sidebarItems: string[]
}

const COLORS = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444']

function NewProfileForm({
  onSubmit,
  onCancel
}: {
  onSubmit: (data: NewProfileData) => void
  onCancel: () => void
}) {
  const t = useT()
  const [name, setName] = useState('')
  const [type, setType] = useState<ProfileType>('personal')
  const [color, setColor] = useState('#a855f7')
  const [icon] = useState('user')
  const [items, setItems] = useState<string[]>(DEFAULT_SIDEBAR_ITEMS.personal)

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  // quando muda o tipo, atualiza os items default
  const handleTypeChange = (t: ProfileType) => {
    setType(t)
    setItems(DEFAULT_SIDEBAR_ITEMS[t] || DEFAULT_SIDEBAR_ITEMS.personal)
  }

  const toggleItem = (path: string) => {
    setItems((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]))
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      slug: slugify(name) || `profile-${Date.now()}`,
      type,
      color,
      icon,
      sidebarItems: items
    })
  }

  return (
    <div className="p-2 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
          {t('profile.new')}
        </div>
        <button onClick={onCancel} className="btn-ghost p-0.5 rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        <label className="label block mb-1">{t('profile.name')}</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder={t('profile.name_placeholder')}
          className="input"
        />
      </div>

      <div>
        <label className="label block mb-1">{t('profile.type')}</label>
        <div className="flex gap-1.5">
          {(['personal', 'professional'] as const).map((tt) => (
            <button
              key={tt}
              onClick={() => handleTypeChange(tt)}
              className={cn(
                'flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors',
                type === tt
                  ? 'bg-accent-soft border-accent text-text'
                  : 'border-border text-text-muted hover:text-text'
              )}
            >
              {t(`profile.type.${tt}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label block mb-1">{t('profile.color')}</label>
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-all',
                color === c ? 'border-text scale-110' : 'border-transparent'
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="label block mb-1">{t('profile.sidebar')}</label>
        <div className="grid grid-cols-2 gap-1">
          {SIDEBAR_ITEMS.map((path) => {
            const checked = items.includes(path)
            const labelKey = `nav.${path === '/' ? 'dashboard' : path.slice(1)}`
            return (
              <button
                key={path}
                onClick={() => toggleItem(path)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border transition-colors text-left',
                  checked
                    ? 'bg-accent-soft border-accent text-text'
                    : 'border-border text-text-subtle'
                )}
              >
                <div
                  className={cn(
                    'w-3 h-3 rounded border flex items-center justify-center shrink-0',
                    checked ? 'bg-accent border-accent' : 'border-border'
                  )}
                >
                  {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </div>
                <span className="truncate">{t(labelKey)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!name.trim()}
        className="btn btn-primary w-full justify-center disabled:opacity-40"
      >
        <Plus className="w-3.5 h-3.5" />
        {t('profile.create')}
      </button>
    </div>
  )
}
