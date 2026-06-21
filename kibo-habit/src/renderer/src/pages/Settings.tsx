import { useEffect, useState } from 'react'
import { Bell, Database, Palette, Info, Globe, RefreshCw, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn, formatNumber } from '../lib/utils'
import { useT, useLangStore } from '../lib/i18n'

type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'up-to-date' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; percent: number; transferred: number; total: number; bytesPerSecond: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }

const SECTIONS = [
  { id: 'appearance', labelKey: 'settings.appearance', icon: Palette },
  { id: 'notifications', labelKey: 'settings.notifications', icon: Bell },
  { id: 'data', labelKey: 'settings.data', icon: Database },
  { id: 'updates', labelKey: 'settings.updates', icon: RefreshCw },
  { id: 'about', labelKey: 'settings.about', icon: Info }
]

export function Settings() {
  const t = useT()
  const [active, setActive] = useState('appearance')

  return (
    <div className="p-6 max-w-5xl mx-auto flex gap-6">
      <aside className="w-56 shrink-0">
        <nav className="space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                active === s.id
                  ? 'bg-bg-hover text-text'
                  : 'text-text-muted hover:text-text hover:bg-bg-hover/60'
              )}
            >
              <s.icon className="w-4 h-4" />
              {t(s.labelKey)}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 card p-6">
        {active === 'appearance' && (
          <div>
            <h2 className="text-base font-semibold mb-1">{t('settings.appearance')}</h2>
            <p className="text-xs text-text-muted mb-5">{t('app.tagline')}</p>

            <Setting label={t('settings.language')} hint={t('settings.language_hint')}>
              <LangToggle />
            </Setting>

            <Setting label={t('settings.theme')} hint="Dark mode is the default">
              <select className="input w-40">
                <option>Dark</option>
                <option>Light (coming soon)</option>
                <option>System</option>
              </select>
            </Setting>

            <Setting label={t('settings.accent')} hint="Used for highlights and active states">
              <div className="flex gap-2">
                {['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899'].map((c) => (
                  <button
                    key={c}
                    className={`w-7 h-7 rounded-full border-2 ${c === '#a855f7' ? 'border-white' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </Setting>
          </div>
        )}

        {active === 'notifications' && (
          <div>
            <h2 className="text-base font-semibold mb-1">{t('settings.notifications')}</h2>
            <p className="text-xs text-text-muted mb-5">Reminders for habits and routines</p>
            <Setting label={t('settings.daily_reminder')} hint={t('settings.daily_reminder_hint')}>
              <input type="time" defaultValue="09:00" className="input w-32" />
            </Setting>
            <Setting label={t('settings.streak_warning')} hint={t('settings.streak_warning_hint')}>
              <Toggle defaultChecked />
            </Setting>
            <Setting label={t('settings.weekly_report')} hint={t('settings.weekly_report_hint')}>
              <Toggle defaultChecked />
            </Setting>
          </div>
        )}

        {active === 'data' && (
          <div>
            <h2 className="text-base font-semibold mb-1">{t('settings.data')}</h2>
            <p className="text-xs text-text-muted mb-5">Export, import, or reset your data</p>
            <div className="space-y-2">
              <button className="btn btn-secondary w-full justify-start">{t('settings.export_json')}</button>
              <button className="btn btn-secondary w-full justify-start">{t('settings.export_csv')}</button>
              <button className="btn btn-secondary w-full justify-start">{t('settings.import_json')}</button>
              <button className="btn btn-secondary w-full justify-start text-danger">{t('settings.reset')}</button>
            </div>
          </div>
        )}

        {active === 'updates' && <UpdatesSection />}

        {active === 'about' && <AboutSection />}
      </div>
    </div>
  )
}

function AboutSection() {
  const t = useT()
  const [version, setVersion] = useState('—')
  useEffect(() => {
    if (typeof window !== 'undefined' && window.api?.update?.getVersion) {
      window.api.update.getVersion().then(setVersion).catch(() => {})
    }
  }, [])
  return (
    <div>
      <h2 className="text-base font-semibold mb-1">{t('settings.about')}</h2>
      <p className="text-xs text-text-muted mb-5">{t('app.name')}</p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Version</span>
          <span>v{version}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Storage</span>
          <span>Local SQLite</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Profiles</span>
          <span>{formatNumber(2)}</span>
        </div>
      </div>
    </div>
  )
}

function UpdatesSection() {
  const t = useT()
  const [version, setVersion] = useState('—')
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const isDev = !(typeof window !== 'undefined' && (window as any).process?.versions?.electron)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.api?.update) return
    window.api.update.getVersion().then(setVersion).catch(() => {})
    const off = window.api.update.onStatus((s) => setStatus(s))
    return () => {
      if (typeof off === 'function') off()
    }
  }, [])

  const handleCheck = async () => {
    if (!window.api?.update) return
    setStatus({ state: 'checking' })
    try {
      await window.api.update.check()
    } catch (e) {
      setStatus({ state: 'error', message: String(e) })
    }
  }

  const handleInstall = () => {
    if (!window.api?.update) return
    window.api.update.install()
  }

  return (
    <div>
      <h2 className="text-base font-semibold mb-1">{t('settings.updates')}</h2>
      <p className="text-xs text-text-muted mb-5">
        {t('updates.current_version')}: <span className="text-text font-medium">v{version}</span>
      </p>

      {isDev && (
        <div className="text-xs text-text-muted bg-bg-subtle border border-border rounded-lg p-3 mb-4">
          {t('updates.dev_hint')}
        </div>
      )}

      <UpdateStatusView status={status} t={t} />

      <div className="flex gap-2 mt-5">
        <button
          onClick={handleCheck}
          disabled={status.state === 'checking' || status.state === 'downloading' || isDev}
          className="btn btn-secondary"
        >
          {status.state === 'checking' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {t('updates.check')}
        </button>

        {status.state === 'downloaded' && (
          <button onClick={handleInstall} className="btn btn-primary">
            <Download className="w-4 h-4" />
            {t('updates.install_now')}
          </button>
        )}
      </div>

      <p className="text-[11px] text-text-muted mt-5 leading-relaxed">
        {t('updates.smartscreen_hint')}
      </p>
    </div>
  )
}

function UpdateStatusView({ status, t }: { status: UpdateStatus; t: (k: string, vars?: Record<string, string | number>) => string }) {
  if (status.state === 'idle') {
    return (
      <div className="text-sm text-text-muted">
        {t('updates.up_to_date')}
      </div>
    )
  }

  if (status.state === 'checking') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
        <span>{t('updates.checking')}</span>
      </div>
    )
  }

  if (status.state === 'up-to-date') {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 className="w-4 h-4" />
        <span>{t('updates.up_to_date')}</span>
      </div>
    )
  }

  if (status.state === 'available') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Download className="w-4 h-4 text-accent" />
          <span>{t('updates.available', { version: status.version })}</span>
        </div>
        <div className="text-xs text-text-muted">{t('updates.available_hint')}</div>
      </div>
    )
  }

  if (status.state === 'downloading') {
    const percent = Math.round(status.percent ?? 0)
    const mb = (n: number) => (n / 1024 / 1024).toFixed(1)
    const speed = ((status.bytesPerSecond ?? 0) / 1024 / 1024).toFixed(2)
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {t('updates.downloading', { percent })}
          </span>
          <span className="text-xs text-text-muted">
            {mb(status.transferred)} / {mb(status.total)} MB · {speed} MB/s
          </span>
        </div>
        <div className="w-full h-1.5 bg-bg-subtle rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    )
  }

  if (status.state === 'downloaded') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 className="w-4 h-4" />
          <span>{t('updates.downloaded', { version: status.version })}</span>
        </div>
        <div className="text-xs text-text-muted">{t('updates.downloaded_hint')}</div>
      </div>
    )
  }

  if (status.state === 'error') {
    return (
      <div className="flex items-start gap-2 text-sm text-danger">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-medium">{t('updates.error')}</div>
          <div className="text-xs text-text-muted mt-0.5">{status.message}</div>
        </div>
      </div>
    )
  }

  return null
}

function LangToggle() {
  const lang = useLangStore((s) => s.lang)
  const setLang = useLangStore((s) => s.setLang)
  const t = useT()
  return (
    <div className="flex items-center gap-1.5">
      <Globe className="w-3.5 h-3.5 text-text-muted" />
      <button
        onClick={() => setLang('en')}
        className={cn(
          'text-xs px-2.5 py-1 rounded-md border transition-colors',
          lang === 'en'
            ? 'bg-accent-soft border-accent text-white'
            : 'border-border text-text-muted hover:text-text'
        )}
      >
        {t('settings.lang.en')}
      </button>
      <button
        onClick={() => setLang('pt-BR')}
        className={cn(
          'text-xs px-2.5 py-1 rounded-md border transition-colors',
          lang === 'pt-BR'
            ? 'bg-accent-soft border-accent text-white'
            : 'border-border text-text-muted hover:text-text'
        )}
      >
        {t('settings.lang.pt-BR')}
      </button>
    </div>
  )
}

function Setting({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-text-muted mt-0.5">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Toggle({ defaultChecked }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked)
  return (
    <button
      onClick={() => setOn((o) => !o)}
      className={cn(
        'w-10 h-6 rounded-full transition-colors relative',
        on ? 'bg-accent' : 'bg-bg-subtle border border-border'
      )}
    >
      <div
        className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
          on ? 'translate-x-[18px]' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}