import { useEffect, useState } from 'react'
import { useResource } from '../hooks/useResource'
import { shortDate } from '../lib/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/ui/DataTable'
import Pagination from '../components/ui/Pagination'
import Badge from '../components/ui/Badge'
import { Select } from '../components/ui/Field'

const ACTION_TONE = { created: 'green', updated: 'amber', deleted: 'red' }
const PER_PAGE_OPTIONS = [10, 25, 50]

export default function AuditTrailPage() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [action, setAction] = useState('')
  const [type, setType] = useState('')

  useEffect(() => {
    setPage(1)
  }, [action, type, perPage])

  const { items, meta, loading } = useResource('/audit-logs', {
    params: {
      page,
      per_page: perPage,
      ...(action && { action }),
      ...(type && { type }),
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
    { key: 'created_at', header: 'When', render: (r) => shortDate(r.created_at) },
    { key: 'who', header: 'Who' },
    { key: 'action', header: 'Action', render: (r) => <Badge tone={ACTION_TONE[r.action] ?? 'slate'}>{r.action}</Badge> },
    { key: 'entity', header: 'Record' },
    {
      key: 'changes',
      header: 'Changes',
      render: (r) =>
        r.changes && Object.keys(r.changes).length > 0 ? (
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            {Object.entries(r.changes)
              .map(([k, v]) => `${k}: ${typeof v === 'object' ? '…' : v}`)
              .join(', ')
              .slice(0, 120)}
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'ip_address', header: 'IP', className: 'fb-table__num' },
  ]

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        subtitle="Every create, update and delete on key records."
        actions={
          <>
            <Select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '11rem' }}>
              <option value="">All records</option>
              <option value="Reconciliation">Reconciliation</option>
              <option value="BankAccount">Bank Account</option>
              <option value="User">User</option>
              <option value="ImportBatch">Import Batch</option>
              <option value="ReconcilingItem">Reconciling Item</option>
            </Select>
            <Select value={action} onChange={(e) => setAction(e.target.value)} style={{ width: '9rem' }}>
              <option value="">All actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
            </Select>
            <Select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ width: '5rem' }}>
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </>
        }
      />

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        empty="No audit entries yet."
        footer={<Pagination meta={meta} onPageChange={setPage} />}
      />
    </div>
  )
}
