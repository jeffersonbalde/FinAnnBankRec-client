import { useState } from 'react'
import { FiCheck } from 'react-icons/fi'
import api from '../../lib/api'
import { notifyError, notifySuccess } from '../../lib/toast'
import { fbConfirm } from '../../lib/confirm'
import { useAuth } from '../../context/AuthContext'
import { useRegisterModalDirty } from '../../context/ModalDirtyContext'
import { useConfirmClose } from '../../hooks/useConfirmClose'
import { ROLES } from '../../lib/roles'
import { shortDate } from '../../lib/format'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Field, TextInput } from '../../components/ui/Field'

const STEPS = [
  ['draft', 'Draft'],
  ['for_review', 'For Review'],
  ['certified', 'Certified'],
]

const ACTION_LABEL = {
  submit: 'Submitted for review.',
  certify: 'Reconciliation certified.',
  return: 'Returned to the preparer.',
  'roll-forward': 'Rolled forward to the next period.',
}

export default function WorkflowTab({ reconciliation, onChanged }) {
  const { user } = useAuth()
  const [busy, setBusy] = useState('')
  const [returning, setReturning] = useState(false)
  const [remarks, setRemarks] = useState('')

  const isReturnDirty = returning && remarks.trim() !== ''
  useRegisterModalDirty(isReturnDirty)
  const requestCloseReturn = useConfirmClose(isReturnDirty, () => setReturning(false))

  const status = reconciliation.status
  const isFA = [ROLES.FINANCIAL_ANALYST, ROLES.ADMIN].includes(user.role)
  const isReviewer = [ROLES.BUDGET_OFFICER, ROLES.ADMIN].includes(user.role)
  const activeIndex = STEPS.findIndex(([s]) => s === (status === 'returned' ? 'draft' : status))

  async function act(action, body) {
    setBusy(action)
    try {
      await api.post(`/reconciliations/${reconciliation.id}/${action}`, body)
      notifySuccess(ACTION_LABEL[action] ?? 'Done.')
      setReturning(false)
      setRemarks('')
      onChanged?.()
    } catch (err) {
      notifyError(err)
    } finally {
      setBusy('')
    }
  }

  return (
    <div style={{ maxWidth: '42rem' }}>
      <div className="fb-steps">
        {STEPS.map(([key, label], i) => (
          <div key={key} className={`fb-steps__item${i <= activeIndex ? ' is-done' : ''}`}>
            <span className="fb-steps__dot">{i <= activeIndex ? <FiCheck size={14} /> : i + 1}</span>
            <span className="fb-steps__label">{label}</span>
            {i < STEPS.length - 1 && <span className="fb-steps__bar" />}
          </div>
        ))}
      </div>

      {status === 'returned' && reconciliation.review_remarks && (
        <div className="fb-alert fb-alert--danger" style={{ marginBottom: '1rem' }}>
          <span><strong>Returned for revision:</strong> {reconciliation.review_remarks}</span>
        </div>
      )}

      <div className="fb-card" style={{ padding: '1.1rem' }}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1.25rem', margin: 0, fontSize: '0.875rem' }}>
          <dt style={{ color: 'var(--muted)' }}>Current status</dt>
          <dd style={{ margin: 0, fontWeight: 600, color: 'var(--ink)' }}>{reconciliation.status_label}</dd>
          <dt style={{ color: 'var(--muted)' }}>Prepared by</dt>
          <dd style={{ margin: 0, color: 'var(--ink-soft)' }}>
            {reconciliation.prepared_by || '—'}
            {reconciliation.prepared_at ? ` · ${shortDate(reconciliation.prepared_at)}` : ''}
          </dd>
          <dt style={{ color: 'var(--muted)' }}>Reviewed by</dt>
          <dd style={{ margin: 0, color: 'var(--ink-soft)' }}>
            {reconciliation.reviewed_by || '—'}
            {reconciliation.certified_at ? ` · ${shortDate(reconciliation.certified_at)}` : ''}
          </dd>
        </dl>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {isFA && (status === 'draft' || status === 'returned') && (
          <Button onClick={() => act('submit')} loading={busy === 'submit'}>
            Submit for review
          </Button>
        )}
        {isReviewer && status === 'for_review' && (
          <>
            <Button onClick={() => act('certify')} loading={busy === 'certify'}>
              Certify correct
            </Button>
            <Button variant="danger" onClick={() => setReturning(true)}>
              Return for revision
            </Button>
          </>
        )}
        {isFA && status === 'certified' && (
          <Button variant="secondary" onClick={() => act('roll-forward')} loading={busy === 'roll-forward'}>
            Roll forward to next period
          </Button>
        )}
      </div>

      <Modal open={returning} onClose={requestCloseReturn} title="Return for revision" size="sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const ok = await fbConfirm({
              title: 'Return for revision?',
              text: 'This sends the reconciliation back to Draft for the preparer to fix.',
              confirmText: 'Return',
              danger: true,
            })
            if (!ok) return
            act('return', { remarks })
          }}
          className="space-y-4"
        >
          <Field label="Remarks for the preparer">
            <TextInput value={remarks} onChange={(e) => setRemarks(e.target.value)} required minLength={3} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={requestCloseReturn}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={busy === 'return'}>
              Return
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
