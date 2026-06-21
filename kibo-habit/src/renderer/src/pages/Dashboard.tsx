import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts'
import { subDays, format, eachDayOfInterval, startOfDay } from 'date-fns'
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  Activity,
  Clock,
  CheckCircle2,
  Sparkles,
  Check,
  LayoutDashboard,
  Sun,
  PieChart
} from 'lucide-react'
import {
  rangeStr,
  todayStr,
  calcStreak,
  calcCompletionRate,
  formatDuration,
  formatNumber,
  cn
} from '../lib/utils'
import { useT } from '../lib/i18n'
import { useProfileStore } from '../store/useProfile'
import type { Habit, Completion } from '../types'

type Period = 7 | 30 | 90 | 365
type Tab = 'overview' | 'today' | 'insights'

export function Dashboard() {
  const t = useT()
  const activeId = useProfileStore((s) => s.activeId)
  const profiles = useProfileStore((s) => s.profiles)
  const activeWs = profiles.find((w) => w.id === activeId)
  const [period, setPeriod] = useState<Period>(30)
  const [tab, setTab] = useState<Tab>('overview')
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [focusSeconds, setFocusSeconds] = useState(0)

  const load = async () => {
    const { from, to } = rangeStr(period)
    const data = await window.api.dashboard.overview({ from, to, profileId: activeWs?.id })
    setHabits(data.habits as Habit[])
    setCompletions(data.completions as Completion[])
    setFocusSeconds(data.focusSeconds)
  }

  useEffect(() => {
    load()
  }, [period, activeWs?.id])

  const today = todayStr()
  const completedSet = useMemo(() => new Set(completions.filter((c) => c.date === today).map((c) => c.habitId)), [completions, today])
  const completedToday = completedSet.size
  const totalHabits = habits.length

  const toggle = async (id: number) => {
    await window.api.completions.toggle(id, today)
    await load()
  }

  const currentStreak = Math.max(
    0,
    ...habits.map((h) => calcStreak(completions.filter((c) => c.habitId === h.id).map((c) => c.date)))
  )

  const completionRate = calcCompletionRate(
    completions.map((c) => c.date),
    Math.min(period, 30)
  )

  // Activity over time (for main chart + sparklines)
  const end = startOfDay(new Date())
  const days = eachDayOfInterval({ start: subDays(end, period - 1), end })
  const activityData = days.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd')
    return {
      date: dateStr,
      label: format(d, period <= 7 ? 'EEE' : period <= 30 ? 'd MMM' : 'MMM'),
      count: completions.filter((c) => c.date === dateStr).length
    }
  })

  // Sparkline data (last 14 days, normalized to last value)
  const sparkWindow = 14
  const sparkStart = subDays(end, sparkWindow - 1)
  const sparkDays = eachDayOfInterval({ start: sparkStart, end })
  const sparkByDay = sparkDays.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd')
    return {
      label: format(d, 'd'),
      count: completions.filter((c) => c.date === dateStr).length
    }
  })
  const focusByDay = sparkDays.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd')
    const day = completions.filter((c) => c.date === dateStr)
    return {
      label: format(d, 'd'),
      // pseudo-distribution: each completion contributes ~25 min
      minutes: day.length * 25
    }
  })
  const rateByDay = sparkDays.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd')
    return {
      label: format(d, 'd'),
      rate: habits.length ? Math.round((completions.filter((c) => c.date === dateStr).length / habits.length) * 100) : 0
    }
  })
  const streakByDay = sparkDays.map((d, i, arr) => {
    // rolling streak: max consecutive completed days ending at this day
    const endIdx = arr.length - 1 - (arr.length - 1 - i)
    let streak = 0
    for (let j = endIdx; j >= 0; j--) {
      if (completions.some((c) => c.date === format(arr[j], 'yyyy-MM-dd'))) streak++
      else break
    }
    return { label: format(d, 'd'), value: streak }
  })

  // Top habits
  const topHabits = habits
    .map((h) => {
      const habitCompletions = completions.filter((c) => c.habitId === h.id).map((c) => c.date)
      const rate = calcCompletionRate(habitCompletions, Math.min(period, 30))
      const streak = calcStreak(habitCompletions)
      return { ...h, rate, streak }
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5)

  // Weekday bar chart (last 7 days)
  const last7 = eachDayOfInterval({ start: subDays(end, 6), end })
  const weekdayData = last7.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd')
    return {
      day: format(d, 'EEE'),
      count: completions.filter((c) => c.date === dateStr).length,
      isToday: dateStr === today
    }
  })

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const periodKeys: Record<Period, string> = {
    7: 'period.7d',
    30: 'period.30d',
    90: 'period.90d',
    365: 'period.1y'
  }

  const tabs: Array<{ id: Tab; label: string; icon: any }> = [
    { id: 'overview', label: t('tab.overview'), icon: LayoutDashboard },
    { id: 'today', label: t('tab.today'), icon: Sun },
    { id: 'insights', label: t('tab.insights'), icon: PieChart }
  ]

  const workspaceSubtitle =
    activeWs?.slug === 'personal'
      ? t('dashboard.subtitle_personal')
      : t('dashboard.subtitle_professional')

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            {greeting()}, Victor <span className="text-2xl">👋</span>
          </h1>
          <p className="text-sm text-text-muted mt-1.5">{workspaceSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary">{t('common.export')}</button>
          <button className="btn btn-primary">
            <Sparkles className="w-3.5 h-3.5" />
            {t('common.new')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border -mb-2">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === tabItem.id
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:text-text'
            )}
          >
            <tabItem.icon className="w-4 h-4" />
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Today tab: My day card */}
      {tab === 'today' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold">{t('dashboard.my_day')}</h3>
              <span className="text-xs text-text-muted">
                {completedToday}/{totalHabits}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-bg overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${totalHabits ? (completedToday / totalHabits) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-text-muted font-medium">
                {totalHabits ? Math.round((completedToday / totalHabits) * 100) : 0}%
              </span>
            </div>
          </div>
          {habits.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">{t('habits.empty')}</p>
          ) : habits.filter((h) => !completedSet.has(h.id)).length === 0 ? (
            <div className="py-6 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent-soft text-accent mb-2">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-sm text-text">{t('dashboard.all_done')}</p>
              <p className="text-xs text-text-muted mt-0.5">{t('dashboard.all_done_hint')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {habits
                .filter((h) => !completedSet.has(h.id))
                .map((h) => (
                  <div
                    key={h.id}
                    className="group flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-bg-hover transition-colors cursor-pointer"
                    onClick={() => toggle(h.id)}
                  >
                    <div className="w-5 h-5 rounded-md border-2 border-border group-hover:border-accent shrink-0 transition-colors" />
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: h.color }}
                    />
                    <span className="flex-1 text-sm truncate">{h.name}</span>
                    {h.category && (
                      <span className="text-[10px] text-text-subtle uppercase tracking-wider">
                        {h.category}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Stat cards with sparklines (overview + insights) */}
      {tab !== 'today' && (
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label={t('dashboard.completed_today')}
          value={`${completedToday}/${totalHabits}`}
          deltaLabel={t('dashboard.of_total')}
          delta={totalHabits ? Math.round((completedToday / totalHabits) * 100) : 0}
          asPercent
          trend={completedToday > 0 ? 'up' : 'neutral'}
          sparkData={sparkByDay}
          sparkKey="count"
          sparkColor="#a855f7"
        />
        <StatCard
          icon={<Flame className="w-4 h-4" />}
          label={t('dashboard.current_streak')}
          value={`${currentStreak} ${currentStreak === 1 ? t('dashboard.day') : t('dashboard.days')}`}
          deltaLabel={t('dashboard.best_active')}
          delta={currentStreak}
          trend={currentStreak > 0 ? 'up' : 'neutral'}
          sparkData={streakByDay}
          sparkKey="value"
          sparkColor="#f59e0b"
        />
        <StatCard
          icon={<Target className="w-4 h-4" />}
          label={t('dashboard.completion_rate')}
          value={`${completionRate}%`}
          deltaLabel={t('dashboard.vs_avg')}
          delta={completionRate - 50}
          trend={completionRate >= 50 ? 'up' : 'down'}
          sparkData={rateByDay}
          sparkKey="rate"
          sparkColor="#22c55e"
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label={t('dashboard.focus_time')}
          value={formatDuration(focusSeconds)}
          deltaLabel={t('dashboard.min_day_avg')}
          delta={focusSeconds > 0 ? Math.round(focusSeconds / 360) : 0}
          trend={focusSeconds > 0 ? 'up' : 'neutral'}
          sparkData={focusByDay}
          sparkKey="minutes"
          sparkColor="#3b82f6"
        />
      </div>
      )}

      {/* Activity + Top habits */}
      {tab !== 'today' && (
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                {t('dashboard.activity_flow')}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">{t('dashboard.activity_hint')}</p>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-bg-subtle border border-border">
              {([7, 30, 90, 365] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                    period === p ? 'bg-bg-card text-text' : 'text-text-muted hover:text-text'
                  )}
                >
                  {t(periodKeys[p])}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#22222f" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#5e5e6e"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#5e5e6e"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#15151f',
                    border: '1px solid #22222f',
                    borderRadius: 8,
                    fontSize: 12
                  }}
                  labelStyle={{ color: '#8b8b9a' }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#activityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-semibold mb-1">{t('dashboard.top_habits')}</h3>
          <p className="text-xs text-text-muted mb-5">{t('dashboard.top_habits_hint')}</p>
          {topHabits.length === 0 ? (
            <EmptyState message={t('common.empty')} />
          ) : (
            <div className="space-y-4">
              {topHabits.map((h) => (
                <div key={h.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: h.color }}
                      />
                      <span className="text-sm truncate">{h.name}</span>
                    </div>
                    <span className="text-xs font-medium text-text-muted">{h.rate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${h.rate}%`, background: h.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      )}
      {/* Weekday chart + recent activity */}
      {tab !== 'today' && (
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-6">
          <h3 className="text-sm font-semibold mb-1">{t('dashboard.weekday_breakdown')}</h3>
          <p className="text-xs text-text-muted mb-4">{t('dashboard.last_7_days')}</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="day"
                  stroke="#5e5e6e"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(168, 85, 247, 0.08)' }}
                  contentStyle={{
                    background: '#15151f',
                    border: '1px solid #22222f',
                    borderRadius: 8,
                    fontSize: 12
                  }}
                  labelStyle={{ color: '#8b8b9a' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {weekdayData.map((d, i) => (
                    <Cell key={i} fill={d.isToday ? '#a855f7' : '#3d3d4d'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">{t('dashboard.recent_activity')}</h3>
            <span className="text-xs text-text-muted">
              {completions.length} {t('dashboard.completions_in')} {period} {t('dashboard.days')}
            </span>
          </div>
          {completions.length === 0 ? (
            <EmptyState message={t('habits.empty')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-muted border-b border-border">
                    <th className="py-2 px-2 font-medium">{t('nav.habits')}</th>
                    <th className="py-2 px-2 font-medium">{t('common.date')}</th>
                    <th className="py-2 px-2 font-medium">{t('common.count')}</th>
                    <th className="py-2 px-2 font-medium">{t('common.value')}</th>
                  </tr>
                </thead>
                <tbody>
                  {completions
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 8)
                    .map((c, i) => {
                      const habit = habits.find((h) => h.id === c.habitId)
                      return (
                        <tr key={`${c.habitId}-${c.date}-${i}`} className="border-b border-border/50">
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ background: habit?.color || '#a855f7' }}
                              />
                              <span>{habit?.name || t('common.deleted_habit')}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-text-muted">{c.date}</td>
                          <td className="py-2.5 px-2 text-text-muted">{c.count}</td>
                          <td className="py-2.5 px-2 text-text-muted">{c.value || '-'}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  delta,
  deltaLabel,
  trend,
  asPercent,
  sparkData,
  sparkKey,
  sparkColor
}: {
  icon: React.ReactNode
  label: string
  value: string
  delta: number
  deltaLabel: string
  trend: 'up' | 'down' | 'neutral'
  asPercent?: boolean
  sparkData: any[]
  sparkKey: string
  sparkColor: string
}) {
  const trendColor =
    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-text-muted'
  const gradId = `spark-${sparkKey}-${sparkColor.replace('#', '')}`
  return (
    <div className="card p-5 hover:border-border-strong transition-colors relative overflow-hidden">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-text-muted min-w-0">
          {icon}
          <span className="text-xs font-medium truncate">{label}</span>
        </div>
        {/* sparkline on the right */}
        <div className="w-20 h-8 shrink-0 -mr-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={sparkKey}
                stroke={sparkColor}
                strokeWidth={1.5}
                fill={`url(#${gradId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className={`text-xs mt-1.5 flex items-center gap-1 ${trendColor}`}>
        {trend === 'up' && <TrendingUp className="w-3 h-3" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3" />}
        <span className="font-medium">
          {asPercent ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%` : formatNumber(delta)}
        </span>
        <span className="text-text-subtle ml-1">{deltaLabel}</span>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-sm text-text-muted">
      <p>{message}</p>
    </div>
  )
}

