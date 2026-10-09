import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiRefreshCcw } from 'react-icons/fi'
import api, { extractErrorMessage } from '../../lib/api'
import { fbConfirm } from '../../lib/confirm'
import { useRegisterModalDirty } from '../../context/ModalDirtyContext'
import { useConfirmClose } from '../../hooks/useConfirmClose'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { bankAccountOptions } from '../../lib/options'
import { Field, TextInput, Select } from '../../components/ui/Field'

const BLANK_FORM = {
  bank_account_id: '',
  period_type: 'monthly',
  period_start: '',
  period_end: '',
  statement_label: '',
  report_no: '',
}

function lastDayOfMonth(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const pad = (n) => String(n).padStart(2, '0')
  return `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`
}

export default function NewReconciliationModal({ open, onClose }) {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState(BLANK_FORM)
  const [initialForm, setInitialForm] = useState(BLANK_FORM)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isDirty = open && JSON.stringify(form) !== JSON.stringify(initialForm)
  useRegisterModalDirty(isDirty)
  const requestClose = useConfirmClose(isDirty, onClose)

  const accountOptions = useMemo(() => bankAccountOptions(accounts), [accounts])

  useEffect(() => {
    if (!open) return
    setForm(BLANK_FORM)
    setInitialForm(BLANK_FORM)
    setErrors({})
    setError('')
    api
      .get('/bank-accounts', { params: { active_only: true, per_page: 100 } })
      .then(({ data }) => {
        setAccounts(data.data)
        const defaults = { ...BLANK_FORM, bank_account_id: data.data[0]?.id || '' }
        setForm(defaults)
        setInitialForm(defaults)
      })
      .catch((err) => setError(extractErrorMessage(err, 'Could not load bank accounts.')))
  }, [open])

  function setStart(value) {
    setForm((f) => ({
      ...f,
      period_start: value,
      period_end: f.period_type === 'monthly' ? lastDayOfMonth(value) : f.period_end,
      statement_label:
        f.period_type === 'monthly' && value
          ? `As of ${new Date(lastDayOfMonth(value)).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}`
          : f.statement_label,
    }))
  }

  async function submit(e) {
    e.preventDefault()
    const ok = await fbConfirm({
      title: 'Create reconciliation?',
      text: `Start a new reconciliation for ${form.period_start || '—'} to ${form.period_end || '—'}.`,
      confirmText: 'Create',
    })
    if (!ok) return
    setSaving(true)
    setErrors({})
    setError('')
    try {
      const { data } = await api.post('/reconciliations', form)
      onClose()
      navigate(`/reconciliations/${data.data.id}`)
    } catch (err) {
      setErrors(err?.response?.data?.errors ?? {})
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={requestClose} title="New reconciliation" icon={<FiRefreshCcw size={16} />}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Bank account" error={errors.bank_account_id?.[0]} required>
          <SearchableSelect
            options={accountOptions}
            value={form.bank_account_id}
            onChange={(bank_account_id) => setForm({ ...form, bank_account_id })}
            placeholder="Select bank account…"
            searchPlaceholder="Search bank, account no., or fund…"
            error={!!errors.bank_account_id?.[0]}
            required
            overlayPanel
            panelTitle="Select bank account"
            countLabel="account"
            emptyMessage="No bank accounts match your search."
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Period type">
            <Select
              value={form.period_type}
              onChange={(e) => setForm({ ...form, period_type: e.target.value })}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </Select>
          </Field>
          <Field label="Period start" error={errors.period_start?.[0]}>
            <TextInput type="date" value={form.period_start} onChange={(e) => setStart(e.target.value)} required />
          </Field>
          <Field label="Period end" error={errors.period_end?.[0]}>
            <TextInput
              type="date"
              value={form.period_end}
              onChange={(e) => setForm({ ...form, period_end: e.target.value })}
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Statement label" hint='e.g. "As of July 31, 2026"'>
            <TextInput
              value={form.statement_label}
              onChange={(e) => setForm({ ...form, statement_label: e.target.value })}
            />
          </Field>
          <Field label="Report no." error={errors.report_no?.[0]}>
            <TextInput value={form.report_no} onChange={(e) => setForm({ ...form, report_no: e.target.value })} placeholder="2026-07-001" />
          </Field>
        </div>

        {error && <div className="fb-alert fb-alert--danger">{error}</div>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Create &amp; open
          </Button>
        </div>
      </form>
    </Modal>
  )
}
