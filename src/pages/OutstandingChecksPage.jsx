import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiDownload, FiSearch } from 'react-icons/fi'
import api, { apiBaseUrl } from '../lib/api'
import { money, shortDate } from '../lib/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/ui/DataTable'
import Pagination from '../components/ui/Pagination'
import { StatSkeleton } from '../components/ui/Skeletons'
import Badge from '../components/ui/Badge'
import SearchableSelect from '../components/ui/SearchableSelect'
import { bankAccountOptions } from '../lib/options'
import { Select } from '../components/ui/Field'

const PER_PAGE_OPTIONS = [10, 25, 50]

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
    // The picker endpoint (not master data) so every role gets the account filter.
    api
      .get('/check-register/bank-accounts')
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
        // Removing the last rows of the last page leaves it empty — step back to a page that has rows.
        if (data.data.length === 0 && data.meta && page > data.meta.last_page && data.meta.last_page >= 1) {
          setPage(data.meta.last_page)
        }
      })
      .finally(() => setLoading(false))
  }, [status, bankAccountId, debouncedSearch, page, perPage])

  const accountOptions = useMemo(() => bankAccountOptions(accounts, { allLabel: 'All bank accounts' }), [accounts])

  const startIndex = meta ? (meta.current_page - 1) * meta.per_page : 0
  const hasFilters = Boolean(status || bankAccountId || debouncedSearch)

  // The Excel file follows the same filters as the table.
  const exportParams = new URLSearchParams({
    ...(status && { status }),
    ...(bankAccountId && { bank_account_id: bankAccountId }),
    ...(debouncedSearch && { search: debouncedSearch }),
  }).toString()
  const exportHref = `${apiBaseUrl}/outstanding-checks/export.xlsx${exportParams ? `?${exportParams}` : ''}`

  const columns = [
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
  ]

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
        subtitle="Checks not yet cleared by the bank."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a className="fb-btn fb-btn--ghost" href={exportHref}>
              <FiDownload size={15} /> Export to Excel
            </a>
            <Link className="fb-btn fb-btn--ghost" to="/checks-register">
              Open Checks Register
            </Link>
          </div>
        }
      />

      {!summary && loading && <StatSkeleton count={3} style={{ marginBottom: '1.35rem' }} />}
      {summary && (
        <div className="fb-stats fb-reveal" style={{ marginBottom: '1.35rem' }}>
          {stats.map((s) => (
            <div key={s.label} className="fb-stat">
              <span className="fb-stat__label">{s.label}</span>
              <span
                className={`fb-stat__value${typeof s.value === 'string' ? ' fb-stat__value--money' : ''}${s.danger ? ' fb-stat__value--danger' : ''}`}
              >
                {s.value}
              </span>
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

        <label
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}
        >
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
