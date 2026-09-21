import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { useResource } from '../../hooks/useResource'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../lib/roles'
import { money, shortDate } from '../../lib/format'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { Select } from '../../components/ui/Field'
import NewReconciliationModal from './NewReconciliationModal'

const STATUS_TONE = {
  draft: 'slate',
  for_review: 'amber',
  certified: 'green',
  returned: 'red',
}

const PER_PAGE_OPTIONS = [10, 25, 50]

export default function ReconciliationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = [ROLES.FINANCIAL_ANALYST, ROLES.ADMIN].includes(user?.role)

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  // Any filter change should land back on page 1 — otherwise a narrower
  // result set can leave you stranded on a page that no longer exists.
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, perPage])

  const { items, meta, loading, error, reload } = useResource('/reconciliations', {
    params: {
      page,
      per_page: perPage,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(status && { status }),
    },
  })

  const startIndex = meta ? (meta.current_page - 1) * meta.per_page : 0

  const columns = [
    {
      key: 'num',
      header: '#',
      className: 'fb-table__index',
      render: (_r, i) => startIndex + i + 1,
    },
    {
      key: 'actions',
      header: '',
      className: 'fb-table__actions',
      render: (r) => (
        <Button size="sm" variant="primary" onClick={() => navigate(`/reconciliations/${r.id}`)}>
          Open
        </Button>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (r) => `${shortDate(r.period_start)} – ${shortDate(r.period_end)}`,
    },
    {
      key: 'bank',
      header: 'Bank account',
      render: (r) =>
        r.bank_account
          ? `${r.bank_account.bank_short_name || r.bank_account.bank_name} · ${r.bank_account.account_number}`
          : '—',
    },
    { key: 'fund', header: 'Fund', render: (r) => r.bank_account?.fund_cluster ?? '—' },
    {
      key: 'difference',
      header: 'Difference',
      className: 'fb-table__num',
      render: (r) => (
        <span style={{ color: Number(r.difference) === 0 ? 'var(--ok)' : 'var(--danger)' }}>
          {money(r.difference)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={STATUS_TONE[r.status] ?? 'slate'}>{r.status_label}</Badge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Reconciliations"
        subtitle="One reconciliation per bank account per period."
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <FiPlus size={16} /> New reconciliation
            </Button>
          )
        }
      />

      {error && (
        <div className="fb-alert fb-alert--danger" style={{ marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      <div className="fb-toolbar">
        <div className="fb-toolbar__search">
          <FiSearch size={15} />
          <input
            className="form-control"
            type="search"
            placeholder="Search period, bank, fund, report no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '10rem' }}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="for_review">For Review</option>
          <option value="certified">Certified</option>
          <option value="returned">Returned</option>
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
        rows={items}
        loading={loading}
        empty={
          debouncedSearch || status
            ? 'No reconciliations match these filters.'
            : 'No reconciliations yet. Create one to begin.'
        }
        footer={<Pagination meta={meta} onPageChange={setPage} />}
      />

      <NewReconciliationModal
        open={creating}
        onClose={() => {
          setCreating(false)
          reload()
        }}
      />
    </div>
  )
}
