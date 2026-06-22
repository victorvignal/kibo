import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Plus,
  Pencil,
  Archive,
  User,
  Briefcase,
  BookOpen,
  Code,
  Heart,
  Star,
  X
} from 'lucide-react'
import { useProfileStore } from '../../store/useProfile'
import { useT } from '../../lib/i18n'
import { cn } from '../../lib/utils'
import type { Profile, ProfileType } from '../../types'
import { SIDEBAR_ITEMS, DEFAULT_SIDEBAR_ITEMS } from '@shared/schema'

// Icones disponiveis pra personalizar o perfil. Mantem uma lista pequena
// mas suficiente pra diferentes casos (trabalho, estudo, saude, hobby, etc).
const ICON_CHOICES = [
  { key: 'user', Icon: User, label: 'User' },
  { key: 'briefcase', Icon: Briefcase, label: 'Work' },
  { key: 'book', Icon: BookOpen, label: 'Study' },
  { key: 'code', Icon: Code, label: 'Code' },
  { key: 'heart', Icon: Heart, label: 'Health' },
  { key: 'star', Icon: Star, label: 'Hobby' }
] as const

const ICONS: Record<string, any> = Object.fromEntries(
  ICON_CHOICES.map(({ key, Icon }) => [key, Icon])
)

const COLORS = [
  '#a855f7', // roxo
  '#3b82f6', // azul
  '#22c55e', // verde
  '#f59e0b', // amarelo
  '#ec4899', // rosa
  '#06b6d4', // ciano
  '#ef4444'  // vermelho
]

/**
 * Switcher de perfil agora vive na Sidebar (topo).
 *
 * Responsabilidades:
 *   - Mostrar perfil ativo (avatar com cor + icone + nome + chevron)
 *   - Dropdown com lista de perfis, check no ativo, icone de editar em cada
 *   - Modal inline pra criar OU editar perfil (mesma form, modo edit vs create)
 *   - Botao de arquivar (no form de edit)
 *   - Atualizar store + persistir via IPC
 *
 * Sidebar de cada perfil e customizavel: o usuario pode desmarcar itens
 * que nao fazem sentido (ex: Profissional sem "Rotinas").
 */
export function ProfileSwitcher() {
  const t = useT()
  const { profiles, activeId, setProfiles, setActive, upsertProfile, removeProfile } =
    useProfileStore()
  const [open, setOpen] = useState(false)
  // Modo do form: 'create' (novo) ou 'edit' (perfil existente selecionado)
  const [mode, setMode] = useState<null | 'create' | { kind: 'edit'; id: number }>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Carrega perfis do DB no mount
  useEffect(() => {
    const load = async () => {
      const raw = (await window.api.profiles.list()) as Array<
        Profile & { sidebarItems: string | string[] }
      >
      const ps = raw.map((p) => ({
        ...p,
        sidebarItems: Array.isArray(p.sidebarItems)
          ? p.sidebarItems
          : typeof p.sidebarItems === 'string'
            ? JSON.parse(p.sidebarItems)
            : []
      })) as Profile[]
      setProfiles(ps)
      const current = useProfileStore.getState().activeId
      if (!current && ps.length > 0) {
        setActive(ps[0].id)
      }
    }
    load()
  }, [setProfiles, setActive])

  // Fecha ao clicar fora (e sai do form)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setMode(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const active = profiles.find((p) => p.id === activeId)
  const ActiveIcon = active ? ICONS[active.icon] || User : User

  const editingProfile =
    mode && typeof mode === 'object' && mode.kind === 'edit'
      ? profiles.find((p) => p.id === mode.id)
      : null

  const handleSubmit = async (data: NewProfileData & { id?: number }) => {
    if (data.id) {
      // Edit
      const updated = (await window.api.profiles.update(data.id, {
        name: data.name,
        type: data.type,
        color: data.color,
        icon: data.icon,
        description: data.description || null,
        sidebarItems: JSON.stringify(data.sidebarItems)
      } as any)) as Profile
      const normalized: Profile = {
        ...updated,
        sidebarItems:
          typeof updated.sidebarItems === 'string'
            ? JSON.parse(updated.sidebarItems)
            : updated.sidebarItems
      }
      upsertProfile(normalized)
    } else {
      // Create
      const created = (await window.api.profiles.create({
        name: data.name,
        slug: data.slug,
        type: data.type,
        color: data.color,
        icon: data.icon,
        description: data.description || null,
        sidebarItems: JSON.stringify(data.sidebarItems)
      } as any)) as Profile
      const normalized: Profile = {
        ...created,
        sidebarItems:
          typeof created.sidebarItems === 'string'
            ? JSON.parse(created.sidebarItems)
            : created.sidebarItems
      }
      upsertProfile(normalized)
      setActive(normalized.id)
    }
    setMode(null)
    setOpen(false)
  }

  const handleArchive = async (id: number) => {
    if (!confirm(t('profile.confirm_archive'))) return
    await window.api.profiles.archive(id, true)
    removeProfile(id)
    // Se era o ativo, troca pro primeiro disponivel
    if (id === activeId) {
      const remaining = profiles.filter((p) => p.id !== id)
      if (remaining.length > 0) {
        setActive(remaining[0].id)
      }
    }
    setMode(null)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left',
          'hover:bg-bg-hover text-text'
        )}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: active?.color || '#a855f7' }}
        >
          <ActiveIcon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-semibold leading-tight truncate">
            {active?.name || t('profile.select')}
          </div>
          {active?.description ? (
            <div className="text-[10px] text-text-subtle leading-tight truncate">
              {active.description}
            </div>
          ) : (
            <div className="text-[10px] text-text-subtle leading-tight">
              {t('profile.active')}
            </div>
          )}
        </div>
        <ChevronDown
          className={cn('w-3.5 h-3.5 text-text-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 card shadow-pop p-1.5">
          {!mode ? (
            <>
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-text-subtle uppercase tracking-wider">
                {t('profile.switch')}
              </div>
              <div className="space-y-0.5 max-h-72 overflow-y-auto">
                {profiles.map((p) => {
                  const Icon = ICONS[p.icon] || User
                  const isActive = p.id === activeId
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'group flex items-center gap-1 rounded-md transition-colors',
                        isActive ? 'bg-bg-hover' : 'hover:bg-bg-hover/50'
                      )}
                    >
                      <button
                        onClick={() => {
                          setActive(p.id)
                          setOpen(false)
                        }}
                        className="flex-1 flex items-center gap-2.5 px-2 py-1.5 text-left min-w-0"
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
                            {p.description || `${p.sidebarItems.length} ${t('profile.items')}`}
                          </div>
                        </div>
                        {isActive && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMode({ kind: 'edit', id: p.id })
                        }}
                        className="p-1.5 mr-1 rounded text-text-subtle opacity-0 group-hover:opacity-100 hover:text-text hover:bg-bg-hover/60 transition-all"
                        title={t('profile.edit')}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => setMode('create')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('profile.new')}
              </button>
            </>
          ) : (
            <ProfileForm
              mode={mode}
              initial={editingProfile}
              onSubmit={handleSubmit}
              onArchive={
                mode && typeof mode === 'object' && mode.kind === 'edit'
                  ? () => handleArchive(mode.id)
                  : undefined
              }
              onCancel={() => setMode(null)}
            />
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
  description: string
  sidebarItems: string[]
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Form usada pra criar OU editar perfil. Em modo 'edit', campos vem
 * pre-preenchidos e aparece botao de arquivar.
 */
function ProfileForm({
  mode,
  initial,
  onSubmit,
  onArchive,
  onCancel
}: {
  mode: 'create' | { kind: 'edit'; id: number }
  initial: Profile | null | undefined
  onSubmit: (data: NewProfileData & { id?: number }) => void
  onArchive?: () => void
  onCancel: () => void
}) {
  const t = useT()
  const isEdit = mode !== 'create'

  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<ProfileType>((initial?.type as ProfileType) ?? 'personal')
  const [color, setColor] = useState(initial?.color ?? '#a855f7')
  const [icon, setIcon] = useState(initial?.icon ?? 'user')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [items, setItems] = useState<string[]>(
    initial?.sidebarItems ?? DEFAULT_SIDEBAR_ITEMS.personal
  )

  // quando muda o tipo no modo create, atualiza os items default
  const handleTypeChange = (newType: ProfileType) => {
    setType(newType)
    if (!isEdit) {
      setItems(DEFAULT_SIDEBAR_ITEMS[newType] || DEFAULT_SIDEBAR_ITEMS.personal)
    }
  }

  const toggleItem = (path: string) => {
    setItems((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]))
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit({
      id: isEdit ? initial?.id : undefined,
      name: name.trim(),
      slug: initial?.slug || slugify(name) || `profile-${Date.now()}`,
      type,
      color,
      icon,
      description: description.trim(),
      sidebarItems: items
    })
  }

  return (
    <div className="p-2 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
          {isEdit ? t('profile.edit') : t('profile.new')}
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
        <label className="label block mb-1">{t('profile.description')}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('profile.description_placeholder')}
          rows={2}
          className="input resize-none"
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
        <div className="flex gap-1.5 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-all',
                color === c ? 'border-text scale-110' : 'border-transparent'
              )}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="label block mb-1">{t('profile.icon')}</label>
        <div className="flex gap-1.5 flex-wrap">
          {ICON_CHOICES.map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => setIcon(key)}
              title={label}
              className={cn(
                'w-7 h-7 rounded-md flex items-center justify-center border transition-colors',
                icon === key
                  ? 'bg-accent-soft border-accent text-text'
                  : 'border-border text-text-muted hover:text-text'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
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
        {isEdit ? t('profile.save') : t('profile.create')}
      </button>

      {isEdit && onArchive && (
        <button
          onClick={onArchive}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs text-danger hover:bg-danger/10 transition-colors"
        >
          <Archive className="w-3.5 h-3.5" />
          {t('profile.archive')}
        </button>
      )}
    </div>
  )
}
