import { useCallback, useEffect, useState } from 'react'
import { FiCheckCircle, FiAlertCircle, FiDownload, FiEdit3 } from 'react-icons/fi'
import api, { apiBaseUrl, extractErrorMessage } from '../../lib/api'
import { notifyError, notifySuccess } from '../../lib/toast'
import { money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../lib/roles'
import { CardSkeleton } from '../../components/ui/Skeletons'
import Button from '../../components/ui/Button'
import MoneyInput from '../../components/ui/MoneyInput'

function Row({ label, agency, bank, comment, bold, indent }) {
  return (
    <tr className={bold ? 'fb-brs__bold' : undefined}>
      <td style={indent ? { paddingLeft: '1.75rem' } : undefined}>{label}</td>
      <td className="fb-brs__num">{agency}</td>
      <td className="fb-brs__num">{bank}</td>
      <td className="fb-brs__muted">{comment}</td>
    </tr>
  )
}

export default function BrsTab({ reconciliation, onChanged }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [edit, setEdit] = useState(null) // {book, bank} while editing
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/reconciliations/${reconciliation.id}/brs`)
      setData(data)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [reconciliation.id])

  useEffect(() => {
    load()
  }, [load])

  async function saveBalances() {
    setSaving(true)
    try {
      await api.put(`/reconciliations/${reconciliation.id}`, {
        bank_account_id: reconciliation.bank_account_id,
        period_type: reconciliation.period_type,
        period_start: reconciliation.period_start,
        period_end: reconciliation.period_end,
        statement_label: reconciliation.statement_label,
        report_no: reconciliation.report_no,
        unadjusted_book_balance: Number(edit.book),
        unadjusted_bank_balance: Number(edit.bank),
      })
      await api.post(`/reconciliations/${reconciliation.id}/regenerate-items`)
      notifySuccess('Unadjusted balances updated.')
      setEdit(null)
      await load()
      onChanged?.()
    } catch (err) {
      notifyError(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <CardSkeleton height="16rem" />
  if (error) return <div className="fb-alert fb-alert--danger">{error}</div>
  if (!data) return null

  const { brs, reconciliation: meta, signatories } = data
  const editable =
    reconciliation.is_editable && [ROLES.FINANCIAL_ANALYST, ROLES.ADMIN].includes(user.role)
  const base = `${apiBaseUrl}/reconciliations/${reconciliation.id}/export`

  return (
    <div>
      <div className="fb-toolbar">
        <span className={`fb-balance-banner ${brs.is_balanced ? 'is-ok' : 'is-bad'}`}>
          {brs.is_balanced ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
          {brs.is_balanced ? 'Balanced' : 'Not balanced'} — difference {money(brs.difference)}
        </span>
        <span className="fb-toolbar__spacer" />
        <a className="fb-btn fb-btn--ghost" href={`${base}/brs.xlsx`}>
          <FiDownload size={15} /> Excel
        </a>
        <a className="fb-btn fb-btn--ghost" href={`${base}/brs.pdf`}>
          <FiDownload size={15} /> PDF
        </a>
        {editable && !edit && (
          <Button
            variant="secondary"
            onClick={() => setEdit({ book: brs.unadjusted_book_balance, bank: brs.unadjusted_bank_balance })}
          >
            <FiEdit3 size={15} /> Edit unadjusted balances
          </Button>
        )}
      </div>

      <div className="fb-card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
        <p style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ink)' }}>{meta.entity_name}</p>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>Bank Reconciliation Statement</p>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
          {meta.statement_label || `${meta.period_start} – ${meta.period_end}`}
        </p>
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--faint)', marginBottom: '0.9rem' }}>
          Fund Cluster: {meta.fund_cluster} &nbsp;·&nbsp; Account No.: {meta.account_number}
        </p>

        <table className="fb-brs">
          <thead>
            <tr>
              <th>Particulars</th>
              <th className="fb-brs__num">Agency (Book)</th>
              <th className="fb-brs__num">Bank</th>
              <th>Explanatory Comment</th>
            </tr>
          </thead>
          <tbody>
            {edit ? (
              <tr className="fb-brs__bold">
                <td>Unadjusted Balances</td>
                <td className="fb-brs__num">
                  <MoneyInput
                    allowNegative
                    required
                    aria-label="Unadjusted book balance"
                    value={edit.book}
                    onChange={(book) => setEdit({ ...edit, book })}
                    style={{ width: '14rem', display: 'inline-block', textAlign: 'right' }}
                  />
                </td>
                <td className="fb-brs__num">
                  <MoneyInput
                    allowNegative
                    required
                    aria-label="Unadjusted bank balance"
                    value={edit.bank}
                    onChange={(bank) => setEdit({ ...edit, bank })}
                    style={{ width: '14rem', display: 'inline-block', textAlign: 'right' }}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <Button size="sm" onClick={saveBalances} loading={saving}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>
                      Cancel
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              <Row
                label="Unadjusted Balances"
                agency={money(brs.unadjusted_book_balance)}
                bank={money(brs.unadjusted_bank_balance)}
                bold
              />
            )}

            <Row label="Add/Deduct: Bank Reconciling Items" agency="" bank="" />
            {brs.bank_items.length === 0 && <Row label="— none —" agency="" bank="" comment="" indent />}
            {brs.bank_items.map((it) => (
              <Row
                key={it.id}
                label={`${it.operation === 'add' ? '(+)' : '(−)'} ${it.label}`}
                agency=""
                bank={money(it.amount)}
                comment={it.schedule_no ? `See ${it.schedule_no}` : it.explanatory_comment}
                indent
              />
            ))}

            <Row label="Add/Deduct: Agency Book Reconciling Items" agency="" bank="" />
            {brs.book_items.length === 0 && <Row label="— none —" agency="" bank="" comment="" indent />}
            {brs.book_items.map((it) => (
              <Row
                key={it.id}
                label={`${it.operation === 'add' ? '(+)' : '(−)'} ${it.label}`}
                agency={money(it.amount)}
                bank=""
                comment={it.schedule_no ? `See ${it.schedule_no}` : it.explanatory_comment}
                indent
              />
            ))}

            <Row
              label="Adjusted Balances"
              agency={money(brs.adjusted_book_balance)}
              bank={money(brs.adjusted_bank_balance)}
              comment={brs.is_balanced ? '' : `Difference: ${money(brs.difference)}`}
              bold
            />
          </tbody>
        </table>

        {signatories?.length > 0 && (
          <div className="fb-sig">
            {signatories.map((s) => (
              <div key={s.id}>
                <p className="fb-sig__role">{s.block_label}:</p>
                <p className="fb-sig__name">{s.name}</p>
                <p className="fb-sig__desig">{s.designation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
