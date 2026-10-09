import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useResource } from '../../hooks/useResource'
import { extractErrorMessage } from '../../lib/api'
import api from '../../lib/api'
import { notifyError, notifySuccess } from '../../lib/toast'
import { fbAlert, fbConfirm } from '../../lib/confirm'
import { useRegisterModalDirty } from '../../context/ModalDirtyContext'
import { useConfirmClose } from '../../hooks/useConfirmClose'
import DataTable from '../../components/ui/DataTable'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Field, TextInput, Checkbox } from '../../components/ui/Field'
import { ActiveBadge } from '../../components/ui/Badge'
import SignatoriesEditor from './SignatoriesEditor'

const DEFAULT_SIGNATORIES = [
  {
    block: 'prepared_by',
    label: 'Prepared by',
    name: 'JOE ANN D. NISNISAN',
    designation: 'Administrative Officer IV / Financial Analyst',
  },
  {
    block: 'certified_correct',
    label: 'Certified Correct',
    name: 'FERNANDO M. MANLARAN',
    designation: 'Administrative Assistant III',
  },
  {
    block: 'disbursing_officer',
    label: 'Disbursing Officer',
    name: 'FERNANDO M. MANLARAN',
    designation: 'Disbursing Officer',
  },
]

const BLANK = {
  bank_name: 'Land Bank of the Philippines',
  bank_short_name: 'LBP',
  account_number: '',
  account_name: 'TECHNICAL EDUCATION AND SKILLS DEVELOPMENT AUTHORITY',
  entity_name: 'TESDA-Mis. Occ.',
  fund_cluster: '',
  is_active: true,
  signatories: DEFAULT_SIGNATORIES.map(({ block, name, designation }) => ({ block, name, designation })),
}

export default function BankAccountsTab() {
  const { items, loading, error, reload, create, update } = useResource('/bank-accounts')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [initialForm, setInitialForm] = useState(BLANK)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const isDirty = !!editing && JSON.stringify(form) !== JSON.stringify(initialForm)
  useRegisterModalDirty(isDirty)

  function closeModal() {
    setEditing(null)
    reload()
  }
  const requestClose = useConfirmClose(isDirty, closeModal)

  function openNew() {
    const blank = {
      ...BLANK,
      signatories: DEFAULT_SIGNATORIES.map(({ block, name, designation }) => ({ block, name, designation })),
    }
    setForm(blank)
    setInitialForm(blank)
    setFieldErrors({})
    setFormError('')
    setEditing('new')
  }

  function openEdit(row) {
    const next = {
      bank_name: row.bank_name,
      bank_short_name: row.bank_short_name ?? '',
      account_number: row.account_number,
      account_name: row.account_name,
      entity_name: row.entity_name,
      fund_cluster: row.fund_cluster,
      is_active: row.is_active,
      signatories: DEFAULT_SIGNATORIES.map(({ block, name, designation }) => ({ block, name, designation })),
    }
    setForm(next)
    setInitialForm(next)
    setFieldErrors({})
    setFormError('')
    setEditing(row)
  }

  function setSignatory(index, key, value) {
    setForm((prev) => {
      const signatories = prev.signatories.map((s, i) => (i === index ? { ...s, [key]: value } : s))
      return { ...prev, signatories }
    })
  }

  async function save(e) {
    e.preventDefault()
    const isNewSave = editing === 'new'
    const ok = await fbConfirm({
      title: isNewSave ? 'Create bank account?' : 'Save changes?',
      text: isNewSave
        ? `Add ${form.bank_short_name || form.bank_name} · ${form.account_number} to the system.`
        : `Update ${form.bank_short_name || form.bank_name} · ${form.account_number}.`,
      confirmText: isNewSave ? 'Create' : 'Save',
    })
    if (!ok) return
    setSaving(true)
    setFieldErrors({})
    setFormError('')
    try {
      if (editing === 'new') {
        const { signatories, ...account } = form
        await create({ ...account, signatories })
        await reload()
        notifySuccess('Bank account created with signatories.')
        setEditing(null)
      } else {
        const { signatories: _ignore, ...account } = form
        await update(editing.id, account)
        await reload()
        notifySuccess('Bank account updated.')
        setEditing(null)
      }
    } catch (err) {
      setFieldErrors(err?.response?.data?.errors ?? {})
      setFormError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(row) {
    // Check first, so nobody confirms a delete that the system would refuse (or that would wipe real records).
    if (row.deletable === false) {
      await fbAlert(
        'This account cannot be deleted',
        `${row.account_number} has reconciliations or checks recorded against it. Deactivate it instead (Edit, then untick Active) to keep that history.`,
      )
      return
    }
    const ok = await fbConfirm({
      title: 'Delete bank account?',
      text: `${row.account_number} — its signatories are removed too. This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/bank-accounts/${row.id}`)
      notifySuccess('Bank account deleted.')
      await reload()
    } catch (err) {
      // The server refuses an account that has records: say why in a dialog, not a passing toast.
      if (err?.response?.status === 422) await fbAlert('This account cannot be deleted', extractErrorMessage(err))
      else notifyError(err)
      await reload()
    }
  }

  const columns = [
    {
      key: 'num',
      header: '#',
      className: 'fb-table__index',
      render: (_r, i) => i + 1,
    },
    {
      key: 'actions',
      header: '',
      className: 'fb-table__actions',
      render: (r) => (
        <>
          <Button size="sm" variant="primary" onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => remove(r)}>
            Delete
          </Button>
        </>
      ),
    },
    {
      key: 'bank',
      header: 'Bank',
      render: (r) => <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.bank_short_name || r.bank_name}</span>,
    },
    { key: 'account_number', header: 'Account No.', className: 'fb-table__num' },
    { key: 'account_name', header: 'Account Name' },
    { key: 'fund_cluster', header: 'Fund Cluster' },
    { key: 'signatories_count', header: 'Signatories', render: (r) => r.signatories_count ?? 0 },
    { key: 'is_active', header: 'Status', render: (r) => <ActiveBadge active={r.is_active} /> },
  ]

  const isNew = editing === 'new'
  const editingId = editing && editing !== 'new' ? editing.id : null

  return (
    <div>
      <div className="fb-toolbar">
        <span className="fb-toolbar__spacer" />
        <Button onClick={openNew}>
          <FiPlus size={16} /> Add bank account
        </Button>
      </div>

      {error && (
        <div className="fb-alert fb-alert--danger" style={{ marginBottom: '0.9rem' }}>
          {error}
        </div>
      )}

      <DataTable columns={columns} rows={items} loading={loading} empty="No bank accounts yet." />

      <Modal
        open={!!editing}
        onClose={requestClose}
        icon={<FiPlus size={16} />}
        title={isNew ? 'New bank account' : 'Edit bank account'}
        size="lg"
      >
        <form onSubmit={save} className="fb-account-form">
          <div className="fb-account-form__grid">
            <Field label="Bank name" required error={fieldErrors.bank_name?.[0]}>
              <TextInput
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                placeholder="e.g. Land Bank of the Philippines"
                required
              />
            </Field>
            <Field label="Short name" required error={fieldErrors.bank_short_name?.[0]}>
              <TextInput
                value={form.bank_short_name}
                onChange={(e) => setForm({ ...form, bank_short_name: e.target.value })}
                placeholder="e.g. LBP"
                required
              />
            </Field>
            <Field label="Account number" required error={fieldErrors.account_number?.[0]}>
              <TextInput
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                placeholder="e.g. 1292-0001-01"
                required
              />
            </Field>
            <Field label="Fund cluster" required error={fieldErrors.fund_cluster?.[0]}>
              <TextInput
                value={form.fund_cluster}
                onChange={(e) => setForm({ ...form, fund_cluster: e.target.value })}
                placeholder="e.g. 101-MOOE"
                required
              />
            </Field>
          </div>

          <Field label="Account name" required error={fieldErrors.account_name?.[0]}>
            <TextInput
              value={form.account_name}
              onChange={(e) => setForm({ ...form, account_name: e.target.value })}
              placeholder="e.g. TECHNICAL EDUCATION AND SKILLS DEVELOPMENT AUTHORITY"
              required
            />
          </Field>
          <Field label="Entity name" required error={fieldErrors.entity_name?.[0]}>
            <TextInput
              value={form.entity_name}
              onChange={(e) => setForm({ ...form, entity_name: e.target.value })}
              placeholder="e.g. TESDA-Mis. Occ."
              required
            />
          </Field>

          <Checkbox label="Active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />

          {isNew && (
            <div className="fb-signatories-box">
              <div className="fb-signatories-box__head">
                <p className="fb-signatories-box__title">Signatories</p>
                <p className="fb-signatories-box__sub">Pre-filled for BRS forms — edit if needed. All required.</p>
              </div>
              {fieldErrors.signatories?.[0] && (
                <p className="fb-field__error" style={{ marginBottom: '0.65rem' }}>
                  {fieldErrors.signatories[0]}
                </p>
              )}
              <div className="fb-signatories-box__list">
                {DEFAULT_SIGNATORIES.map((meta, index) => (
                  <div key={meta.block} className="fb-signatories-box__row">
                    <span className="fb-signatories-box__role">{meta.label}</span>
                    <Field
                      label="Name"
                      required
                      error={fieldErrors[`signatories.${index}.name`]?.[0]}
                    >
                      <TextInput
                        value={form.signatories[index]?.name ?? ''}
                        onChange={(e) => setSignatory(index, 'name', e.target.value)}
                        placeholder="Full name"
                        required
                      />
                    </Field>
                    <Field
                      label="Designation"
                      required
                      error={fieldErrors[`signatories.${index}.designation`]?.[0]}
                    >
                      <TextInput
                        value={form.signatories[index]?.designation ?? ''}
                        onChange={(e) => setSignatory(index, 'designation', e.target.value)}
                        placeholder="Position / designation"
                        required
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formError && <div className="fb-alert fb-alert--danger">{formError}</div>}

          <div className="fb-account-form__actions">
            <Button type="button" variant="secondary" onClick={requestClose}>
              Close
            </Button>
            <Button type="submit" loading={saving}>
              {isNew ? 'Create' : 'Save changes'}
            </Button>
          </div>
        </form>

        {editingId && (
          <div style={{ marginTop: '1rem' }}>
            <SignatoriesEditor bankAccountId={editingId} />
          </div>
        )}
      </Modal>
    </div>
  )
}
