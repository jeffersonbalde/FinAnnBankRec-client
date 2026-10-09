import { useCallback, useEffect, useState } from 'react'
import { FiZap, FiAlertTriangle, FiSearch } from 'react-icons/fi'
import api from '../../lib/api'
import { notifyError, notifySuccess } from '../../lib/toast'
import { fbConfirm } from '../../lib/confirm'
import { money, shortDate } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useRegisterModalDirty } from '../../context/ModalDirtyContext'
import { useConfirmClose } from '../../hooks/useConfirmClose'
import { ROLES } from '../../lib/roles'
import { CardSkeleton } from '../../components/ui/Skeletons'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { Field, TextInput } from '../../components/ui/Field'

const CHECK_TONE = { cleared: 'green', outstanding: 'slate', stale: 'red', cancelled: 'amber' }

export default function MatchingTab({ reconciliation, onChanged }) {
  const { user } = useAuth()
  const isAnalyst = [ROLES.FINANCIAL_ANALYST, ROLES.ADMIN].includes(user.role)
  const canCancel = isAnalyst || user.role === ROLES.DISBURSING_OFFICER

  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [linking, setLinking] = useState(null)
  const [linkSearch, setLinkSearch] = useState('')
  const [cancelling, setCancelling] = useState(null)
  const [reason, setReason] = useState('')
  const [cancelBusy, setCancelBusy] = useState(false)

  const isCancelDirty = !!cancelling && reason.trim() !== ''
  useRegisterModalDirty(isCancelDirty)
  const requestCloseCancel = useConfirmClose(isCancelDirty, () => setCancelling(null))

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/reconciliations/${reconciliation.id}/matches`)
      setBoard(data)
    } catch (err) {
      notifyError(err)
    } finally {
      setLoading(false)
    }
  }, [reconciliation.id])

  useEffect(() => {
    load()
  }, [load])

  async function runMatch() {
    setRunning(true)
    try {
      const { data } = await api.post(`/reconciliations/${reconciliation.id}/match`)
      setBoard(data)
      notifySuccess(`${data.match.matched} matched · ${data.match.outstanding} outstanding · ${data.match.flags.length} flags`)
      onChanged?.()
    } catch (err) {
      notifyError(err)
    } finally {
      setRunning(false)
    }
  }

  async function link(checkId, check) {
    const ok = await fbConfirm({
      title: 'Link this check?',
      text: `Match ${check.serial_no} · ${check.payee} · ${money(check.amount)} to this bank transaction.`,
      confirmText: 'Link',
    })
    if (!ok) return
    try {
      const { data } = await api.post(`/matches/${linking.id}/link`, { check_issuance_id: checkId })
      setBoard(data)
      setLinking(null)
      onChanged?.()
    } catch (err) {
      notifyError(err)
    }
  }

  async function unlink(txnId) {
    try {
      const { data } = await api.post(`/matches/${txnId}/unlink`)
      setBoard(data)
      onChanged?.()
    } catch (err) {
      notifyError(err)
    }
  }

  async function cancelCheck(e) {
    e.preventDefault()
    const ok = await fbConfirm({
      title: 'Cancel this check?',
      text: `${cancelling.serial_no} · ${cancelling.payee} · ${money(cancelling.amount)}. This voids the check and adds it back to the book balance.`,
      confirmText: 'Cancel check',
      danger: true,
    })
    if (!ok) return
    setCancelBusy(true)
    try {
      await api.post(`/check-issuances/${cancelling.id}/cancel`, { reason })
      notifySuccess(`Check ${cancelling.serial_no} cancelled.`)
      setCancelling(null)
      setReason('')
      await load()
      onChanged?.()
    } catch (err) {
      notifyError(err)
    } finally {
      setCancelBusy(false)
    }
  }

  if (loading) return <CardSkeleton height="16rem" />

  const checks = board?.checks ?? []
  const txns = board?.bank_transactions ?? []
  const flags = board?.flags ?? []
  const outstandingChecks = checks.filter((c) => c.status === 'outstanding' || c.status === 'stale')
  const linkQuery = linkSearch.trim().toLowerCase()
  const linkableChecks = linkQuery
    ? outstandingChecks.filter((c) =>
        `${c.serial_no} ${c.payee} ${c.amount} ${Number(c.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
          .toLowerCase()
          .includes(linkQuery),
      )
    : outstandingChecks
  const editable = reconciliation.is_editable

  return (
    <div>
      <div className="fb-toolbar">
        {isAnalyst && editable && (
          <Button onClick={runMatch} loading={running}>
            <FiZap size={15} /> Run auto-match
          </Button>
        )}
        {board?.last_run_at && (
          <span style={{ fontSize: '0.75rem', color: 'var(--faint)' }}>Last run {shortDate(board.last_run_at)}</span>
        )}
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          {checks.filter((c) => c.status === 'cleared').length} cleared · {outstandingChecks.length} outstanding ·{' '}
          {flags.length} flags
        </span>
      </div>

      {flags.length > 0 && (
        <div className="fb-card" style={{ marginBottom: '1rem', borderColor: 'var(--warn)' }}>
          <div className="fb-card__body" style={{ padding: '0.85rem 1rem' }}>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FiAlertTriangle size={15} /> Needs your attention
            </p>
            <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              {flags.map((f, i) => (
                <li key={i}>{f.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="fb-two">
        <div className="fb-card">
          <div className="fb-card__head">Issued checks ({checks.length})</div>
          <div style={{ maxHeight: '28rem', overflow: 'auto' }}>
            <table className="fb-mini-table">
              <tbody>
                {checks.map((c, i) => (
                  <tr key={c.id}>
                    <td className="fb-mini-table__index">{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.serial_no}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{c.payee}</div>
                      {c.reconciliation_id != null && c.reconciliation_id !== reconciliation.id && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--fb-blue-dark)' }}>
                          Carried over{c.origin_period_label ? ` — issued ${c.origin_period_label}` : ''}, still uncashed
                        </div>
                      )}
                      {c.status === 'cancelled' && c.cancelled_reason && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--warn)' }}>Cancelled — {c.cancelled_reason}</div>
                      )}
                    </td>
                    <td className="fb-brs__num">{money(c.amount)}</td>
                    <td className="fb-mini-table__actions">
                      <span className="fb-mini-table__actions-inner">
                        <Badge tone={CHECK_TONE[c.status] ?? 'slate'}>{c.status_label}</Badge>
                        {canCancel && editable && ['outstanding', 'stale'].includes(c.status) && (
                          <button
                            type="button"
                            className="fb-btn fb-btn--link fb-btn--sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => {
                              setReason('')
                              setCancelling(c)
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
                {checks.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--faint)' }}>
                      No checks yet — record them in the Checks Register first (see step 1).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="fb-card">
          <div className="fb-card__head">Bank transactions ({txns.length})</div>
          <div style={{ maxHeight: '28rem', overflow: 'auto' }}>
            <table className="fb-mini-table">
              <tbody>
                {txns.map((t, i) => (
                  <tr key={t.id}>
                    <td className="fb-mini-table__index">{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.check_no || t.derived_type_label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                        {shortDate(t.txn_date)} · {t.description}
                      </div>
                    </td>
                    <td className="fb-brs__num">
                      {t.debit > 0 ? `− ${money(t.debit)}` : `+ ${money(t.credit)}`}
                    </td>
                    <td className="fb-mini-table__actions">
                      {t.match_status === 'unmatched' ? (
                        t.derived_type === 'check_clearing' && isAnalyst && editable ? (
                          <button
                            type="button"
                            className="fb-btn fb-btn--link fb-btn--sm"
                            onClick={() => {
                              setLinkSearch('')
                              setLinking(t)
                            }}
                          >
                            Link
                          </button>
                        ) : (
                          <Badge tone="slate">{t.derived_type_label}</Badge>
                        )
                      ) : (
                        <span className="fb-mini-table__actions-inner">
                          <Badge tone="green">{t.match_status}</Badge>
                          {isAnalyst && editable && (
                            <button
                              type="button"
                              className="fb-btn fb-btn--link fb-btn--sm"
                              style={{ color: 'var(--faint)' }}
                              onClick={() => unlink(t.id)}
                            >
                              Undo
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {txns.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--faint)' }}>
                      Upload the bank statement in step 2 (Bank Statement) first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={!!linking}
        onClose={() => setLinking(null)}
        title={`Link bank check ${linking?.check_no || ''}`}
      >
        <p style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
          Choose the issued check this bank transaction settles. Search by check number, payee or amount.
        </p>
        <div className="fb-toolbar__search" style={{ marginBottom: '0.6rem', maxWidth: 'none' }}>
          <FiSearch size={15} />
          <input
            className="form-control"
            type="search"
            placeholder="Search check no., payee, amount…"
            value={linkSearch}
            onChange={(e) => setLinkSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ maxHeight: '18rem', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {linkableChecks.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => link(c.id, c)}
              className="fb-link-row"
            >
              <span>
                <strong>{c.serial_no}</strong> · {c.payee}
                {c.reconciliation_id != null && c.reconciliation_id !== reconciliation.id && (
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--fb-blue-dark)' }}>
                    Carried over{c.origin_period_label ? ` — issued ${c.origin_period_label}` : ''}
                  </span>
                )}
              </span>
              <span className="fb-brs__num">{money(c.amount)}</span>
            </button>
          ))}
          {linkableChecks.length === 0 && (
            <p style={{ fontSize: '0.875rem', color: 'var(--faint)' }}>
              {outstandingChecks.length === 0 ? 'No outstanding checks to link.' : 'No checks match your search.'}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={!!cancelling}
        onClose={requestCloseCancel}
        title={`Cancel check ${cancelling?.serial_no || ''}`}
        size="sm"
      >
        <form onSubmit={cancelCheck} className="space-y-4">
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            {cancelling?.payee} · {money(cancelling?.amount)}. This voids the check and adds it back to the book balance.
          </p>
          <Field label="Reason">
            <TextInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
              placeholder="e.g. Cheque spoiled during printing"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={requestCloseCancel}>
              Keep check
            </Button>
            <Button type="submit" variant="danger" loading={cancelBusy}>
              Cancel check
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
