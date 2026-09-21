import { useEffect, useMemo, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import api from '../lib/api'
import { money, shortDate } from '../lib/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/ui/DataTable'
import Pagination from '../components/ui/Pagination'
import Badge from '../components/ui/Badge'
import SearchableSelect from '../components/ui/SearchableSelect'
import { Select } from '../components/ui/Field'

const PER_PAGE_OPTIONS = [10, 25, 50]

function accountTriggerLabel(a) {
  return `${a.bank_short_name || a.bank_name} · ${a.account_number} · ${a.fund_cluster}`
}

export default function OutstandingChecksPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [summary, setSummary] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => {
    api
      .get('/bank-accounts', { params: { active_only: true } })
      .then(({ data }) => setAccounts(data.data ?? []))
      .catch(() => setAccounts([]))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [status, bankAccountId, debouncedSearch, perPage])

  useEffect(() => {
    setLoading(true)
    api
      .get('/outstanding-checks', {
        params: {
          page,
          per_page: perPage,
          ...(status && { status }),
          ...(bankAccountId && { bank_account_id: bankAccountId }),
          ...(debouncedSearch && { search: debouncedSearch }),
        },
      })
      .then(({ data }) => {
        setRows(data.data)
        setMeta(data.meta ?? null)
        setSummary(data.summary)
      })
      .finally(() => setLoading(false))
  }, [status, bankAccountId, debouncedSearch, page, perPage])

  const accountOptions = useMemo(
    () => [
      {
        value: '',
        label: 'All bank accounts',
        displayLabel: 'All bank accounts',
        keywords: 'all',
      },
      ...accounts.map((a) => ({
        value: a.id,
        label: `${a.bank_short_name || a.bank_name} · ${a.account_number}`,
        meta: `${a.fund_cluster}${a.entity_name ? ` — ${a.entity_name}` : ''}`,
        displayLabel: accountTriggerLabel(a),
        keywords: `${a.bank_name} ${a.bank_short_name} ${a.account_number} ${a.fund_cluster} ${a.entity_name || ''}`,
      })),
    ],
    [accounts],
  )

  const startIndex = meta ? (meta.current_page - 1) * meta.per_page : 0
  const hasFilters = Boolean(status || bankAccountId || debouncedSearch)

  const columns = useMemo(
    () => [
      {
        key: 'num',
        header: '#',
        className: 'fb-table__index',
        render: (_r, i) => startIndex + i + 1,
      },
      { key: 'check_date', header: 'Date', render: (r) => shortDate(r.check_date) },
      { key: 'serial_no', header: 'Check/ADA No.', className: 'fb-table__num' },
      { key: 'payee', header: 'Payee' },
      { key: 'bank_account', header: 'Bank account' },
      { key: 'fund_cluster', header: 'Fund' },
      {
        key: 'days_outstanding',
        header: 'Age',
        render: (r) => (
          <span style={r.days_outstanding > 180 ? { fontWeight: 600, color: 'var(--danger)' } : undefined}>
            {r.days_outstanding != null ? `${r.days_outstanding} d` : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <Badge tone={r.is_stale ? 'red' : 'slate'}>{r.is_stale ? 'Stale' : 'Outstanding'}</Badge>,
      },
      { key: 'amount', header: 'Amount', className: 'fb-table__num', render: (r) => money(r.amount) },
    ],
    [startIndex],
  )

  const stats = summary
    ? [
        { label: 'Checks', value: summary.count },
        { label: 'Total amount', value: money(summary.amount) },
        { label: 'Stale ( > 6 months )', value: summary.stale_count, danger: true },
      ]
    : []

  return (
    <div>
      <PageHeader
        title="Outstanding Checks Register"
        subtitle="Issued checks not yet cleared by the bank, across all periods."
      />

      {summary && (
        <div className="fb-stats" style={{ marginBottom: '1.35rem' }}>
          {stats.map((s) => (
            <div key={s.label} className="fb-stat">
              <span className="fb-stat__label">{s.label}</span>
              <span className={`fb-stat__value${s.danger ? ' fb-stat__value--danger' : ''}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="fb-toolbar">
        <div className="fb-toolbar__search">
          <FiSearch size={15} />
          <input
            className="form-control"
            type="text"
            placeholder="Search check no., payee, bank, fund…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search outstanding checks"
          />
        </div>

        <div className="fb-toolbar__account">
          <SearchableSelect
            options={accountOptions}
            value={bankAccountId}
            onChange={(id) => setBankAccountId(id === '' || id == null ? '' : String(id))}
            placeholder="All bank accounts"
            searchPlaceholder="Search bank, account no., or fund…"
            panelTitle="Filter by bank account"
            overlayPanel
            countLabel="account"
            emptyMessage="No bank accounts match your search."
          />
        </div>

        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '10rem' }}>
          <option value="">All statuses</option>
          <option value="outstanding">Outstanding</option>
          <option value="stale">Stale only</option>
        </Select>

        <span className="fb-toolbar__spacer" />

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          Rows
          <Select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ width: '5rem' }}>
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        empty={hasFilters ? 'No outstanding checks match these filters.' : 'No outstanding checks.'}
        footer={<Pagination meta={meta} onPageChange={setPage} />}
      />
    </div>
  )
}
