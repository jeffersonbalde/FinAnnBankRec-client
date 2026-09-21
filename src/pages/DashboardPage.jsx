import { useEffect, useState } from 'react'
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
import { money, shortDate } from '../lib/format'
import PageHeader from '../components/PageHeader'
import Badge from '../components/ui/Badge'
import { FullPageSpinner } from '../components/Spinner'
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

const tooltipStyle = { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }
const axisTick = { fontSize: 11, fill: '#64748b' }

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/dashboard')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <FullPageSpinner />
  if (!data) return null

  const kpis = [
    { label: 'Open reconciliations', value: data.open_reconciliations, tone: 'blue' },
    { label: 'Awaiting review', value: data.for_review, tone: 'warn' },
    { label: 'Outstanding checks', value: data.outstanding_checks_count, tone: 'slate' },
    { label: 'Outstanding amount', value: money(data.outstanding_checks_amount), tone: 'slate' },
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
    <div>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || ''}`}
        subtitle={`Signed in as ${ROLE_LABELS[user?.role]}`}
      />

      <div className="fb-stats">
        {kpis.map(({ label, value, tone }) => (
          <div key={label} className={`fb-stat fb-stat--${tone}`}>
            <span className="fb-stat__label">{label}</span>
            <span className="fb-stat__value">{value}</span>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="fb-card">
          <div className="fb-card__head">
            <span>Outstanding checks by age</span>
            {data.stale_checks_count > 0 && (
              <Badge tone="danger">{data.stale_checks_count} stale &gt; 6 mo</Badge>
            )}
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
                No reconciliations yet.
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
                  <Tooltip formatter={(value, name) => [`${value} of ${statusTotal}`, name]} contentStyle={tooltipStyle} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>{value}</span>}
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
                No reconciliations yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
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
                  <YAxis
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <Tooltip
                    formatter={(value, name) => [money(value), name]}
                    labelFormatter={(label, payload) => `${label}${payload?.[0]?.payload?.bank_account ? ' · ' + payload[0].payload.bank_account : ''}`}
                    contentStyle={tooltipStyle}
                  />
                  <Legend
                    formatter={(value) => <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>{value}</span>}
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
                      <span className="dash-fund__none">no reconciliation</span>
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
