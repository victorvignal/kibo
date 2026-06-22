import { useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Plus,
  Trash2,
  X
} from 'lucide-react'
import { rangeStr, todayStr, cn } from '../lib/utils'
import { useT } from '../lib/i18n'
import { useProfileStore } from '../store/useProfile'
import type { Account, Category, Transaction } from '../types'

// Formata centavos pra string em reais. Ex: 12345 -> "R$ 123,45"
function fmtBRL(cents: number): string {
  const reais = cents / 100
  return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Compacta valores grandes. Ex: 425000 -> "R$ 4,2k"
function fmtBRLCompact(cents: number): string {
  const reais = cents / 100
  if (Math.abs(reais) >= 1_000_000) {
    return `R$ ${(reais / 1_000_000).toFixed(1).replace('.', ',')}M`
  }
  if (Math.abs(reais) >= 1_000) {
    return `R$ ${(reais / 1_000).toFixed(1).replace('.', ',')}k`
  }
  return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Period = 30 | 90 | 365

export function Finance() {
  const t = useT()
  const activeId = useProfileStore((s) => s.activeId)
  const profiles = useProfileStore((s) => s.profiles)
  const activeProfile = profiles.find((p) => p.id === activeId)

  const [period, setPeriod] = useState<Period>(30)
  const [overview, setOverview] = useState<{
    income: number
    expense: number
    net: number
    totalBalance: number
    transactionCount: number
  } | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showAdd, setShowAdd] = useState(false)

  const load = async () => {
    if (!activeProfile) return
    const { from, to } = rangeStr(period)
    const [ov, accs, cats, txs] = await Promise.all([
      window.api.finance.overview({ from, to, profileId: activeProfile.id }),
      window.api.finance.accounts.list({ profileId: activeProfile.id }),
      window.api.finance.categories.list({ profileId: activeProfile.id }),
      window.api.finance.transactions.list({
        profileId: activeProfile.id,
        from,
        to,
        limit: 50
      })
    ])
    setOverview(ov)
    setAccounts(accs as Account[])
    setCategories(cats as Category[])
    setTransactions(txs as Transaction[])
  }

  useEffect(() => {
    load()
  }, [period, activeProfile?.id])

  const expenseByCategory = useMemo(() => {
    const map = new Map<number, number>()
    for (const tx of transactions) {
      if (tx.type === 'expense') {
        map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount)
      }
    }
    return Array.from(map.entries())
      .map(([catId, total]) => {
        const cat = categories.find((c) => c.id === catId)
        return { catId, total, name: cat?.name ?? '—', color: cat?.color ?? '#8b5cf6' }
      })
      .sort((a, b) => b.total - a.total)
  }, [transactions, categories])

  const totalExpense = expenseByCategory.reduce((s, e) => s + e.total, 0) || 1 // evita div/0

  const deleteTx = async (id: number) => {
    if (!confirm(t('finance.confirm_delete'))) return
    await window.api.finance.transactions.delete(id)
    await load()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('finance.title')}</h1>
          <p className="text-sm text-text-muted mt-1">
            {activeProfile?.type === 'professional'
              ? t('finance.subtitle_professional')
              : t('finance.subtitle_personal')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period tabs */}
          <div className="flex bg-bg-subtle border border-border rounded-lg p-0.5">
            {([30, 90, 365] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  period === p ? 'bg-bg-hover text-text' : 'text-text-muted hover:text-text'
                )}
              >
                {p === 30
                  ? t('finance.last_30_days')
                  : p === 90
                    ? t('period.90d')
                    : t('period.1y')}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            disabled={accounts.length === 0}
            className="btn btn-primary"
            title={accounts.length === 0 ? t('finance.no_accounts') : t('finance.add_transaction')}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('finance.add_transaction')}</span>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Wallet className="w-4 h-4" />}
          label={t('finance.balance')}
          value={overview ? fmtBRLCompact(overview.totalBalance) : '—'}
          accent="text-text"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label={t('finance.income')}
          value={overview ? fmtBRLCompact(overview.income) : '—'}
          accent="text-success"
        />
        <StatCard
          icon={<TrendingDown className="w-4 h-4" />}
          label={t('finance.expense')}
          value={overview ? fmtBRLCompact(overview.expense) : '—'}
          accent="text-danger"
        />
        <StatCard
          icon={<CircleDollarSign className="w-4 h-4" />}
          label={t('finance.net')}
          value={overview ? fmtBRLCompact(overview.net) : '—'}
          accent={overview && overview.net >= 0 ? 'text-success' : 'text-danger'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Recent transactions */}
        <div className="lg:col-span-2 bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text">{t('finance.recent_transactions')}</h2>
            {overview && (
              <span className="text-xs text-text-subtle">
                {overview.transactionCount} {overview.transactionCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          {transactions.length === 0 ? (
            <div className="py-10 text-center text-text-subtle text-sm">
              {t('finance.no_transactions')}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.slice(0, 12).map((tx) => {
                const cat = categories.find((c) => c.id === tx.categoryId)
                const acc = accounts.find((a) => a.id === tx.accountId)
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 py-2.5 px-1 group hover:bg-bg-hover/40 rounded-md transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold text-white"
                      style={{ background: cat?.color ?? '#8b5cf6' }}
                    >
                      {cat?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text truncate">{tx.description}</div>
                      <div className="text-[11px] text-text-subtle">
                        {cat?.name ?? '—'} · {acc?.name ?? '—'} · {tx.date}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'text-sm font-semibold tabular-nums shrink-0',
                        tx.type === 'income' ? 'text-success' : 'text-danger'
                      )}
                    >
                      {tx.type === 'income' ? '+' : '−'}
                      {fmtBRL(tx.amount)}
                    </div>
                    <button
                      onClick={() => deleteTx(tx.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-text-subtle hover:text-danger transition-all"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Spending breakdown (donut simples sem recharts, só SVG) */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-text mb-3">{t('finance.spending_breakdown')}</h2>
          {expenseByCategory.length === 0 ? (
            <div className="py-10 text-center text-text-subtle text-sm">
              {t('finance.no_transactions')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {expenseByCategory.slice(0, 6).map((e) => {
                const pct = (e.total / totalExpense) * 100
                return (
                  <div key={e.catId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: e.color }}
                        />
                        <span className="text-xs text-text truncate">{e.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-text-muted tabular-nums shrink-0 ml-2">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-subtle overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: e.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddTransactionDialog
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false)
            await load()
          }}
          accounts={accounts}
          categories={categories}
          profileId={activeProfile?.id ?? 1}
        />
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-text-muted mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className={cn('text-xl font-semibold tracking-tight tabular-nums', accent)}>{value}</div>
    </div>
  )
}

function AddTransactionDialog({
  onClose,
  onSaved,
  accounts,
  categories,
  profileId
}: {
  onClose: () => void
  onSaved: () => void | Promise<void>
  accounts: Account[]
  categories: Category[]
  profileId: number
}) {
  const t = useT()
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 0)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [date, setDate] = useState(todayStr())
  const [saving, setSaving] = useState(false)

  const filteredCategories = categories.filter((c) => c.type === type)
  const effectiveCategoryId = categoryId && filteredCategories.find((c) => c.id === categoryId)
    ? categoryId
    : filteredCategories[0]?.id ?? null

  const submit = async () => {
    if (!effectiveCategoryId || !accountId || !amount || !description) return
    const cents = Math.round(parseFloat(amount.replace(',', '.')) * 100)
    if (!Number.isFinite(cents) || cents <= 0) return
    setSaving(true)
    await window.api.finance.transactions.create({
      profileId,
      accountId,
      categoryId: effectiveCategoryId,
      type,
      amount: cents,
      description,
      date,
      notes: null
    })
    setSaving(false)
    await onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--color-scrim)' }}
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border rounded-xl w-full max-w-md p-5 space-y-4 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('finance.new_transaction')}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-bg-hover text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type toggle */}
        <div className="flex bg-bg-subtle border border-border rounded-lg p-0.5">
          {(['expense', 'income'] as const).map((tt) => (
            <button
              key={tt}
              onClick={() => {
                setType(tt)
                setCategoryId(null)
              }}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded-md transition-colors',
                type === tt
                  ? tt === 'income'
                    ? 'bg-success/15 text-success'
                    : 'bg-danger/15 text-danger'
                  : 'text-text-muted hover:text-text'
              )}
            >
              {tt === 'income' ? t('finance.type.income') : t('finance.type.expense')}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-text-muted mb-1 block">{t('finance.amount')}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle text-sm">
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full bg-bg-subtle border border-border rounded-lg pl-10 pr-3 py-2 text-sm placeholder:text-text-subtle focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-text-muted mb-1 block">{t('finance.description')}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex. Almoço, Salário..."
            className="w-full bg-bg-subtle border border-border rounded-lg px-3 py-2 text-sm placeholder:text-text-subtle focus:outline-none focus:border-accent"
          />
        </div>

        {/* Account + Category + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('finance.account')}</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(Number(e.target.value))}
              className="w-full bg-bg-subtle border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">{t('finance.category')}</label>
            <select
              value={effectiveCategoryId ?? ''}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full bg-bg-subtle border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            >
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1 block">{t('finance.date')}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-bg-subtle border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn btn-ghost flex-1">
            {t('common.cancel')}
          </button>
          <button
            onClick={submit}
            disabled={saving || !amount || !description || !effectiveCategoryId}
            className="btn btn-primary flex-1"
          >
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}