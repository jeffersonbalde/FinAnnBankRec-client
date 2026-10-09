import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiDownload, FiUploadCloud } from 'react-icons/fi'
import api, { apiBaseUrl } from '../../lib/api'
import { notifyError } from '../../lib/toast'
import { money, shortDate } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../lib/roles'
import DataTable from '../../components/ui/DataTable'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import ImportCard from './ImportCard'

const CHECK_TONE = { cleared: 'green', outstanding: 'slate', stale: 'red', cancelled: 'amber' }

/**
 * Step 1 — the checks issued for this period. The list itself lives in the
 * Checks Register (where checks are typed in and reviewed); this tab shows the
 * ones that belong to this period, and offers the RCI file import for anyone
 * who would rather upload the Report of Checks Issued.
 */
export default function ChecksTab({ reconciliation, onChanged }) {
  const { user } = useAuth()
  const canImport = [ROLES.FINANCIAL_ANALYST, ROLES.ADMIN, ROLES.DISBURSING_OFFICER].includes(user.role)
  const editable = reconciliation.is_editable

  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/reconciliations/${reconciliation.id}/check-issuances`)
      setChecks(data.data ?? [])
    } catch (err) {
      notifyError(err)
    } finally {
      setLoading(false)
    }
  }, [reconciliation.id])

  useEffect(() => {
    load()
  }, [load])

  const total = useMemo(
    () => checks.filter((c) => c.status !== 'cancelled').reduce((sum, c) => sum + Number(c.amount), 0),
    [checks],
  )

  const columns = [
    { key: 'num', header: '#', className: 'fb-table__index', render: (_c, i) => i + 1 },
    { key: 'date', header: 'Date', className: 'fb-table__nowrap', render: (c) => shortDate(c.check_date) },
    { key: 'serial', header: 'Check no.', render: (c) => <span className="fb-table__mono">{c.serial_no}</span> },
    { key: 'payee', header: 'Payee', render: (c) => c.payee },
    { key: 'amount', header: 'Amount', className: 'fb-table__num', render: (c) => money(c.amount) },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <Badge tone={CHECK_TONE[c.status] ?? 'slate'}>{c.status_label}</Badge>,
    },
    { key: 'by', header: 'Added by', render: (c) => c.created_by_name ?? '—' },
  ]

  return (
    <div>
      <p className="fb-help">
        These are the checks issued in this period, taken from the Checks Register. To add, correct or review checks,
        open the Checks Register — anything recorded there shows up here automatically.
      </p>

      {!editable && (
        <div className="fb-alert fb-alert--muted" style={{ marginBottom: '0.9rem' }}>
          This reconciliation is {reconciliation.status_label.toLowerCase()} — it can no longer be changed.
        </div>
      )}

      <div className="fb-toolbar">
        <Link className="fb-btn fb-btn--primary" to={`/checks-register?bank_account_id=${reconciliation.bank_account_id}`}>
          Open the Checks Register
        </Link>
        <span className="fb-toolbar__spacer" />
        <a className="fb-btn fb-btn--ghost" href={`${apiBaseUrl}/reconciliations/${reconciliation.id}/export/rci.xlsx`}>
          <FiDownload size={15} /> Export to Excel
        </a>
        {canImport && editable && (
          <Button variant="secondary" onClick={() => setImporting(true)}>
            <FiUploadCloud size={15} /> Import from file
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={checks}
        loading={loading}
        empty="No checks recorded for this period yet. Add them in the Checks Register, or import the Report of Checks Issued file."
      />

      <p className="fb-help" style={{ marginTop: '0.75rem', textAlign: 'right' }}>
        {checks.length} {checks.length === 1 ? 'check' : 'checks'} · Total (not counting cancelled):{' '}
        <strong style={{ color: 'var(--ink)' }}>{money(total)}</strong>
      </p>

      <Modal
        open={importing}
        onClose={() => setImporting(false)}
        icon={<FiUploadCloud size={16} />}
        title="Import the Report of Checks Issued"
        size="lg"
      >
        <ImportCard
          reconciliationId={reconciliation.id}
          type="rci"
          title="Report of Checks Issued (Appendix 35)"
          description="An .xlsx or .csv file. Each check is filed under the period its date falls in, and checks already in the register are updated, not duplicated."
          committedBatch={(reconciliation.import_batches ?? []).find((b) => b.type === 'rci' && b.status === 'committed')}
          disabled={!editable}
          onChanged={() => {
            setImporting(false)
            load()
            onChanged?.()
          }}
        />
      </Modal>
    </div>
  )
}
