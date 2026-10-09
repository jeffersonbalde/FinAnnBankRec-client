import { useEffect, useMemo, useState } from 'react'
import { FiArrowRight, FiRotateCcw } from 'react-icons/fi'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS } from '../lib/roles'
import { compactNumber, money, shortDate } from '../lib/format'
import { DATE_PRESETS, presetFor } from '../lib/dateRange'
import { bankAccountOptions } from '../lib/options'
import PageHeader from '../components/PageHeader'
import Badge from '../components/ui/Badge'
import SearchableSelect from '../components/ui/SearchableSelect'
import { CardSkeleton, StatSkeleton } from '../components/ui/Skeletons'
import './dashboard.css'

const STATUS_TONE = {
  draft: 'slate',
  for_review: 'amber',
  certified: 'green',
  returned: 'red',
}

const STATUS_COLORS = {
  draft: '#94a3b8',
  for_review: '#b45309',
  certified: '#15803d',
  returned: '#b91c1c',
}

const AGING_COLORS = ['#4d4dff', '#0000fe', '#0000c2', '#00008a', '#000052']

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e5e7eb',
}
const axisTick = { fontSize: 11, fill: '#64748b' }

export default function DashboardPage() {
  const { user } = useAuth()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [accountId, setAccountId] = useState('')
  const [accounts, setAccounts] = useState([])
  // The filters the current `data` was loaded for — differs from the live ones while a reload is in flight.
  const [loaded, setLoaded] = useState({ key: null, data: null })
  const [failed, setFailed] = useState(false)

  const invalidRange = !!from && !!to && from > to
  const key = `${from}|${to}|${accountId}`
  const accountOptions = useMemo(() => bankAccountOptions(accounts, { allLabel: 'All bank accounts' }), [accounts])

  useEffect(() => {
    api
      .get('/check-register/bank-accounts')
      .then(({ data: res }) => setAccounts(res.data ?? []))
      .catch(() => setAccounts([]))
  }, [])

  useEffect(() => {
    if (invalidRange) return undefined
    let cancelled = false
    api
      .get('/dashboard', {
        params: {
          date_from: from || undefined,
          date_to: to || undefined,
          bank_account_id: accountId || undefined,
        },
      })
      .then(({ data }) => {
        if (cancelled) return
        setFailed(false)
        setLoaded({ key, data })
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [from, to, accountId, key, invalidRange])

  const data = loaded.data
  const refreshing = !invalidRange && loaded.key !== key && !failed
  const preset = presetFor(from, to)
  const filtered = !!(from || to || accountId)

  function applyPreset(p) {
    const r = p.range(new Date())
    setFrom(r.from)
    setTo(r.to)
  }

  function reset() {
    setFrom('')
    setTo('')
    setAccountId('')
  }

  if (!data && failed) {
    return <div className="fb-alert fb-alert--danger">The dashboard could not be loaded. Please refresh the page.</div>
  }

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || ''}`}
        subtitle={`Signed in as ${ROLE_LABELS[user?.role]}`}
      />

      <section className="dash-filter" aria-label="Dashboard filters">
        <div className="dash-seg" role="group" aria-label="Period">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`dash-seg__btn${preset === p.key ? ' is-active' : ''}`}
              aria-pressed={preset === p.key}
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div
          className={`dash-daterange${invalidRange ? ' is-invalid' : ''}`}
          title="Reconciliations are counted by their period; checks by their check date."
        >
          <input
            type="date"
            aria-label="From date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
          <FiArrowRight size={14} className="dash-daterange__sep" aria-hidden="true" />
          <input
            type="date"
            aria-label="To date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="dash-filter__account">
          <SearchableSelect
            options={accountOptions}
            value={accountId}
            onChange={(id) => setAccountId(id === '' || id == null ? '' : String(id))}
            placeholder="All bank accounts"
            searchPlaceholder="Search bank, account no., or fund…"
            panelTitle="Filter by bank account"
            overlayPanel
            countLabel="account"
            emptyMessage="No bank accounts match your search."
          />
        </div>

        {filtered && (
          <button type="button" className="dash-filter__reset" onClick={reset}>
            <FiRotateCcw size={14} /> Reset
          </button>
        )}
      </section>
      {invalidRange && (
        <p className="dash-filter__error" role="alert">
          The “From” date must be on or before the “To” date.
        </p>
      )}

      <div className={`dash-body${refreshing ? ' is-refreshing' : ''}`} aria-busy={refreshing || !data}>
        {data ? <DashboardBody data={data} filtered={filtered} ranged={!!(from || to)} /> : <DashboardSkeleton />}
      </div>
    </div>
  )
}

/** Everything under the filters: the stat cards, charts and the per-fund list. */
function DashboardBody({ data, filtered, ranged }) {
  const kpis = [
    {
      label: 'Open reconciliations',
      value: data.open_reconciliations,
      tone: 'blue',
    },
    { label: 'Awaiting review', value: data.for_review, tone: 'warn' },
    {
      label: `Checks issued (${data.checks_issued_count})`,
      value: money(data.checks_issued_amount),
      tone: 'blue',
    },
    {
      label: 'Outstanding checks',
      value: data.outstanding_checks_count,
      tone: 'slate',
    },
    {
      label: 'Outstanding amount',
      value: money(data.outstanding_checks_amount),
      tone: 'slate',
    },
  ]

  const agingData = Object.entries(data.aging).map(([bucket, v]) => ({
    bucket: bucket === '180+' ? '180+ days' : `${bucket} days`,
    count: v.count,
    amount: v.amount,
  }))

  const statusData = (data.status_breakdown ?? []).filter((s) => s.count > 0)
  const statusTotal = statusData.reduce((sum, s) => sum + s.count, 0)

  const trendData = (data.balance_trend ?? []).map((t) => ({
    ...t,
    label: t.period_end ? shortDate(t.period_end) : '',
  }))

  return (
    <div className="fb-reveal">
      <div className="fb-stats">
        {kpis.map(({ label, value, tone }) => (
          <div key={label} className={`fb-stat fb-stat--${tone}`}>
            <span className="fb-stat__label">{label}</span>
            <span className={`fb-stat__value${typeof value === 'string' ? ' fb-stat__value--money' : ''}`}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="fb-card">
          <div className="fb-card__head">
            <span>Outstanding checks by age</span>
            {data.stale_checks_count > 0 && <Badge tone="danger">{data.stale_checks_count} stale &gt; 6 mo</Badge>}
          </div>
          <div className="fb-card__body" style={{ height: '17rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
                <XAxis dataKey="bucket" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,254,0.05)' }}
                  formatter={(value, name) => [name === 'amount' ? money(value) : value, name]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={54} isAnimationActive={false}>
                  {agingData.map((_, i) => (
                    <Cell key={i} fill={AGING_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="fb-card">
          <div className="fb-card__head">Reconciliations by status</div>
          <div className="fb-card__body" style={{ height: '17rem' }}>
            {statusTotal === 0 ? (
              <p className="dash-fund__none" style={{ textAlign: 'center', marginTop: '4rem' }}>
                {filtered ? 'No reconciliations match these filters.' : 'No reconciliations yet.'}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {statusData.map((s) => (
                      <Cell key={s.status} fill={STATUS_COLORS[s.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} of ${statusTotal}`, name]}
                    contentStyle={tooltipStyle}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--ink-soft)',
                        }}
                      >
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="dash-grid dash-grid--main">
        <div className="fb-card">
          <div className="fb-card__head">Book vs. bank balance trend</div>
          <div className="fb-card__body dash-chart">
            {trendData.length === 0 ? (
              <p className="dash-fund__none dash-chart__empty">
                {filtered ? 'No reconciliations match these filters.' : 'No reconciliations yet.'}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="bookFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0000fe" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#0000fe" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="bankFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#15803d" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#15803d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={52} tickFormatter={compactNumber} />
                  <Tooltip
                    formatter={(value, name) => [money(value), name]}
                    labelFormatter={(label, payload) =>
                      `${label}${payload?.[0]?.payload?.bank_account ? ' · ' + payload[0].payload.bank_account : ''}`
                    }
                    contentStyle={tooltipStyle}
                  />
                  <Legend
                    formatter={(value) => (
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--ink-soft)',
                        }}
                      >
                        {value}
                      </span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="adjusted_book_balance"
                    name="Book"
                    stroke="#0000fe"
                    fill="url(#bookFill)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="adjusted_bank_balance"
                    name="Bank"
                    stroke="#15803d"
                    fill="url(#bankFill)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="fb-card dash-fund-card">
          <div className="fb-card__head">Per fund cluster</div>
          <div className="fb-card__body dash-fund-card__body">
            <ul className="dash-fund">
              {data.per_fund.map((f, i) => (
                <li key={i}>
                  <div className="dash-fund__row">
                    <span className="dash-fund__name">{f.fund_cluster}</span>
                    {f.status ? (
                      <Badge tone={STATUS_TONE[f.status] ?? 'slate'}>{f.status_label}</Badge>
                    ) : (
                      <span className="dash-fund__none">{ranged ? 'none in this range' : 'no reconciliation'}</span>
                    )}
                  </div>
                  <p className="dash-fund__meta">
                    {f.bank_account}
                    {f.latest_period ? ` · ${shortDate(f.latest_period)}` : ''}
                    {f.difference != null ? ` · diff ${money(f.difference)}` : ''}
                  </p>
                </li>
              ))}
              {data.per_fund.length === 0 && <li className="dash-fund__none">No bank accounts yet.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Placeholder with the same layout as the loaded dashboard, so nothing jumps when data arrives. */
function DashboardSkeleton() {
  return (
    <>
      <StatSkeleton count={5} />
      <div className="dash-grid">
        <CardSkeleton height="17rem" />
        <CardSkeleton height="17rem" />
      </div>
      <div className="dash-grid dash-grid--main">
        <CardSkeleton height="18rem" />
        <CardSkeleton height="18rem" />
      </div>
    </>
  )
}
