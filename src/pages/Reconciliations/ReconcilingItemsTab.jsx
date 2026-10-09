import { useCallback, useEffect, useState } from 'react'
import { FiPlus, FiRefreshCw } from 'react-icons/fi'
import api from '../../lib/api'
import { notifyError, notifySuccess } from '../../lib/toast'
import { fbConfirm } from '../../lib/confirm'
import { money } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useRegisterModalDirty } from '../../context/ModalDirtyContext'
import { useConfirmClose } from '../../hooks/useConfirmClose'
import { ROLES } from '../../lib/roles'
import { CardSkeleton } from '../../components/ui/Skeletons'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { Field, TextInput, Select } from '../../components/ui/Field'
import MoneyInput from '../../components/ui/MoneyInput'

const MANUAL_CATEGORIES = [
  ['error_understating_bank', 'Error — understates bank balance (+ bank)'],
  ['error_overstating_bank', 'Error — overstates bank balance (− bank)'],
  ['error_understating_book', 'Error — understates book balance (+ book)'],
  ['error_overstating_book', 'Error — overstates book balance (− book)'],
  ['deposit_in_transit', 'Deposit in transit (+ bank)'],
  ['unrecorded_credit', 'Unrecorded credit / interest (+ book)'],
  ['cancelled_check', 'Cancelled check (+ book)'],
]

const BLANK = { category: 'error_overstating_book', amount: '', explanatory_comment: '', schedule_no: '' }

function Column({ title, items, onEdit, onDelete, editable }) {
  return (
    <div className="fb-card">
      <div className="fb-card__head">{title}</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.length === 0 && (
          <li style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--faint)' }}>No items.</li>
        )}
        {items.map((it) => (
          <li key={it.id} style={{ padding: '0.7rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
                  {it.operation === 'add' ? '(+)' : '(−)'} {it.label}
                </p>
                {it.explanatory_comment && (
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {it.explanatory_comment}
                  </p>
                )}
                <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {it.schedule_no && <span style={{ fontSize: '0.72rem', color: 'var(--faint)' }}>{it.schedule_no}</span>}
                  <Badge tone={it.is_auto_generated ? 'blue' : 'slate'}>{it.is_auto_generated ? 'auto' : 'manual'}</Badge>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                  {money(it.amount)}
                </p>
                {!it.is_auto_generated && editable && (
                  <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="fb-btn fb-btn--link fb-btn--sm" onClick={() => onEdit(it)}>
                      edit
                    </button>
                    <button
                      type="button"
                      className="fb-btn fb-btn--link fb-btn--sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => onDelete(it)}
                    >
                      delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ReconcilingItemsTab({ reconciliation, onChanged }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [initialForm, setInitialForm] = useState(BLANK)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const isDirty = !!editing && JSON.stringify(form) !== JSON.stringify(initialForm)
  useRegisterModalDirty(isDirty)
  const requestClose = useConfirmClose(isDirty, () => setEditing(null))

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/reconciliations/${reconciliation.id}/reconciling-items`)
      setItems(data.data)
    } catch (err) {
      notifyError(err)
    } finally {
      setLoading(false)
    }
  }, [reconciliation.id])

  useEffect(() => {
    load()
  }, [load])

  async function regenerate() {
    setBusy(true)
    try {
      await api.post(`/reconciliations/${reconciliation.id}/regenerate-items`)
      notifySuccess('Reconciling items regenerated.')
      await load()
      onChanged?.()
    } catch (err) {
      notifyError(err)
    } finally {
      setBusy(false)
    }
  }

  async function save(e) {
    e.preventDefault()
    const isNewSave = editing === 'new'
    const ok = await fbConfirm({
      title: isNewSave ? 'Add manual adjustment?' : 'Save changes?',
      text: `${form.explanatory_comment || 'Adjustment'} — ${money(form.amount || 0)}`,
      confirmText: isNewSave ? 'Add' : 'Save',
    })
    if (!ok) return
    setSaving(true)
    setFieldErrors({})
    try {
      if (editing === 'new') {
        await api.post(`/reconciliations/${reconciliation.id}/reconciling-items`, form)
      } else {
        await api.put(`/reconciling-items/${editing.id}`, form)
      }
      notifySuccess('Adjustment saved.')
      setEditing(null)
      await load()
      onChanged?.()
    } catch (err) {
      setFieldErrors(err?.response?.data?.errors ?? {})
      notifyError(err)
    } finally {
      setSaving(false)
    }
  }

  async function remove(it) {
    if (!(await fbConfirm({ title: 'Delete adjustment?', text: it.label, confirmText: 'Delete', danger: true }))) return
    try {
      await api.delete(`/reconciling-items/${it.id}`)
      notifySuccess('Adjustment deleted.')
      await load()
      onChanged?.()
    } catch (err) {
      notifyError(err)
    }
  }

  if (loading) return <CardSkeleton height="16rem" />

  const editable =
    reconciliation.is_editable && [ROLES.FINANCIAL_ANALYST, ROLES.ADMIN].includes(user.role)
  const bankItems = items.filter((i) => i.side === 'bank')
  const bookItems = items.filter((i) => i.side === 'book')

  return (
    <div>
      <div className="fb-toolbar">
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Auto items come from the imported data; add manual adjustments for errors.
        </span>
        <span className="fb-toolbar__spacer" />
        {editable && (
          <>
            <Button variant="secondary" onClick={regenerate} loading={busy}>
              <FiRefreshCw size={15} /> Regenerate
            </Button>
            <Button
              onClick={() => {
                setForm(BLANK)
                setInitialForm(BLANK)
                setFieldErrors({})
                setEditing('new')
              }}
            >
              <FiPlus size={16} /> Manual adjustment
            </Button>
          </>
        )}
      </div>

      <div className="fb-two">
        <Column
          title="Bank side"
          items={bankItems}
          onEdit={(it) => { setForm(it); setInitialForm(it); setEditing(it) }}
          onDelete={remove}
          editable={editable}
        />
        <Column
          title="Book side"
          items={bookItems}
          onEdit={(it) => { setForm(it); setInitialForm(it); setEditing(it) }}
          onDelete={remove}
          editable={editable}
        />
      </div>

      <Modal
        open={!!editing}
        onClose={requestClose}
        icon={<FiPlus size={16} />}
        title={editing === 'new' ? 'Manual adjustment' : 'Edit adjustment'}
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Category" error={fieldErrors.category?.[0]}>
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {MANUAL_CATEGORIES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount" error={fieldErrors.amount?.[0]}>
            <MoneyInput
              prefix
              positive
              value={form.amount}
              onChange={(amount) => setForm({ ...form, amount })}
              placeholder="0.00"
              error={!!fieldErrors.amount?.[0]}
              required
            />
          </Field>
          <Field label="Explanatory comment" error={fieldErrors.explanatory_comment?.[0]}>
            <TextInput
              value={form.explanatory_comment}
              onChange={(e) => setForm({ ...form, explanatory_comment: e.target.value })}
              required
            />
          </Field>
          <Field label="Schedule ref. (optional)">
            <TextInput value={form.schedule_no ?? ''} onChange={(e) => setForm({ ...form, schedule_no: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
