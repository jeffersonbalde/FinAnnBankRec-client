import { useEffect, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useResource } from '../../hooks/useResource'
import { useRowSelection } from '../../hooks/useRowSelection'
import { bulkRemove } from '../../lib/bulk'
import { extractErrorMessage } from '../../lib/api'
import { notifyError, notifySuccess } from '../../lib/toast'
import { fbConfirm } from '../../lib/confirm'
import { useRegisterModalDirty } from '../../context/ModalDirtyContext'
import { useConfirmClose } from '../../hooks/useConfirmClose'
import DataTable from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import { BulkBar, selectColumn, selectedRowClass } from '../../components/ui/RowSelect'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Field, TextInput, Checkbox, Select } from '../../components/ui/Field'
import { ActiveBadge } from '../../components/ui/Badge'

const BLANK = { code: '', description: '', is_active: true }
const PER_PAGE_OPTIONS = [10, 25, 50]

export default function UacsTab() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => {
    setPage(1)
  }, [perPage])

  const { items, meta, loading, error, reload, create, update, remove } = useResource('/reference-uacs', {
    params: { page, per_page: perPage },
  })
  const startIndex = meta ? (meta.current_page - 1) * meta.per_page : 0

  // Removing the last rows of the last page leaves it empty: step back to a page that has rows.
  if (!loading && items.length === 0 && meta && page > meta.last_page && meta.last_page >= 1) setPage(meta.last_page)

  // Ticked codes stay ticked while paging, but not across a change of page size.
  const selection = useRowSelection(String(perPage), 100)
  const [bulkBusy, setBulkBusy] = useState(false)

  function removePicked() {
    return bulkRemove({
      url: '/reference-uacs/bulk-delete',
      ids: selection.list.map((r) => r.id),
      noun: 'UACS code',
      text: 'Checks that already use these codes keep the code they were saved with. This cannot be undone.',
      setBusy: setBulkBusy,
      onDone: async () => {
        selection.clear()
        await reload()
      },
    })
  }

  const [editing, setEditing] = useState(null) // object | 'new' | null
  const [form, setForm] = useState(BLANK)
  const [initialForm, setInitialForm] = useState(BLANK)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const isDirty = !!editing && JSON.stringify(form) !== JSON.stringify(initialForm)
  useRegisterModalDirty(isDirty)
  const requestClose = useConfirmClose(isDirty, () => setEditing(null))

  function openNew() {
    setForm(BLANK)
    setInitialForm(BLANK)
    setFieldErrors({})
    setFormError('')
    setEditing('new')
  }

  function openEdit(row) {
    const next = { code: row.code, description: row.description, is_active: row.is_active }
    setForm(next)
    setInitialForm(next)
    setFieldErrors({})
    setFormError('')
    setEditing(row)
  }

  async function save(e) {
    e.preventDefault()
    const isNewSave = editing === 'new'
    const ok = await fbConfirm({
      title: isNewSave ? 'Create UACS code?' : 'Save changes?',
      text: `${form.code} — ${form.description}`,
      confirmText: isNewSave ? 'Create' : 'Save',
    })
    if (!ok) return
    setSaving(true)
    setFormError('')
    setFieldErrors({})
    try {
      if (editing === 'new') await create(form)
      else await update(editing.id, form)
      notifySuccess('UACS code saved.')
      setEditing(null)
      await reload()
    } catch (err) {
      setFieldErrors(err?.response?.data?.errors ?? {})
      setFormError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function removeRow(row) {
    const ok = await fbConfirm({
      title: 'Delete UACS code?',
      text: `${row.code} — this cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    })
    if (!ok) return
    try {
      await remove(row.id)
      notifySuccess('UACS code deleted.')
      await reload()
    } catch (err) {
      notifyError(err)
    }
  }

  const columns = [
    selectColumn(selection, items, () => true),
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
        <>
          <Button size="sm" variant="primary" onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => removeRow(r)}>
            Delete
          </Button>
        </>
      ),
    },
    { key: 'code', header: 'UACS Code', className: 'fb-table__num' },
    { key: 'description', header: 'Description' },
    { key: 'is_active', header: 'Status', render: (r) => <ActiveBadge active={r.is_active} /> },
  ]

  return (
    <div>
      <div className="fb-toolbar">
        <span className="fb-toolbar__spacer" />
        <label
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}
        >
          Rows
          <Select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ width: '5rem' }}>
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </label>
        <Button size="sm" onClick={openNew}>
          <FiPlus size={14} /> Add code
        </Button>
      </div>

      {error && (
        <div className="fb-alert fb-alert--danger" style={{ marginBottom: '0.9rem' }}>
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={items}
        head={<BulkBar count={selection.count} onClear={selection.clear} onAction={removePicked} busy={bulkBusy} />}
        rowClassName={selectedRowClass(selection)}
        loading={loading}
        empty="No UACS codes yet."
        footer={<Pagination meta={meta} onPageChange={setPage} />}
      />

      <Modal
        open={!!editing}
        onClose={requestClose}
        icon={<FiPlus size={16} />}
        title={editing === 'new' ? 'New UACS code' : 'Edit UACS code'}
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="UACS Object Code" error={fieldErrors.code?.[0]}>
            <TextInput
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              error={fieldErrors.code}
              placeholder="5020202000"
              required
            />
          </Field>
          <Field label="Description" error={fieldErrors.description?.[0]}>
            <TextInput
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              error={fieldErrors.description}
              required
            />
          </Field>
          <Checkbox
            label="Active"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          {formError && <div className="fb-alert fb-alert--danger">{formError}</div>}
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
