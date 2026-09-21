import { useCallback, useEffect, useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import api, { extractErrorMessage } from '../../lib/api'
import { money, shortDate } from '../../lib/format'
import { FullPageSpinner } from '../../components/Spinner'

export default function SchedulesTab({ reconciliation }) {
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const base = `/api/v1/reconciliations/${reconciliation.id}/export`

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/reconciliations/${reconciliation.id}/matches`)
      setChecks((data.checks ?? []).filter((c) => c.status === 'outstanding' || c.status === 'stale'))
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [reconciliation.id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <FullPageSpinner />

  const total = checks.reduce((sum, c) => sum + Number(c.amount), 0)

  return (
    <div>
      <div className="fb-toolbar">
        <a className="fb-btn fb-btn--ghost" href={`${base}/brs.xlsx`}>
          <FiDownload size={15} /> BRS (Excel)
        </a>
        <a className="fb-btn fb-btn--ghost" href={`${base}/schedule-1.xlsx`}>
          <FiDownload size={15} /> Schedule 1 (Excel)
        </a>
        <a className="fb-btn fb-btn--ghost" href={`${base}/brs.pdf`}>
          <FiDownload size={15} /> BRS + Schedule 1 (PDF)
        </a>
      </div>

      {error && <div className="fb-alert fb-alert--danger" style={{ marginBottom: '0.9rem' }}>{error}</div>}

      <div className="fb-card">
        <div className="fb-card__head">Schedule 1 — List of Outstanding Checks</div>
        <div className="fb-table__scroll">
          <table className="fb-table">
            <thead>
              <tr>
                <th>Payee</th>
                <th>Date of Check</th>
                <th>Check/ADA No.</th>
                <th className="fb-table__num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id}>
                  <td>{c.payee}</td>
                  <td>{shortDate(c.check_date)}</td>
                  <td style={{ fontFamily: 'ui-monospace, monospace' }}>{c.serial_no}</td>
                  <td className="fb-table__num">{money(c.amount)}</td>
                </tr>
              ))}
              {checks.length === 0 && (
                <tr>
                  <td colSpan={4} className="fb-table__empty">
                    No outstanding checks.
                  </td>
                </tr>
              )}
              {checks.length > 0 && (
                <tr className="fb-brs__bold">
                  <td colSpan={3}>TOTAL</td>
                  <td className="fb-table__num">{money(total)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
