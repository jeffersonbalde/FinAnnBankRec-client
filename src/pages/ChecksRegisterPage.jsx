import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiPlus, FiDownload, FiSearch } from 'react-icons/fi'
import api, { apiBaseUrl, extractErrorMessage } from '../lib/api'
import { notifyError, notifySuccess } from '../lib/toast'
import { fbConfirm } from '../lib/confirm'
import { bulkRemove } from '../lib/bulk'
import { useRowSelection } from '../hooks/useRowSelection'
import { money, shortDate } from '../lib/format'
import { ROLES } from '../lib/roles'
import { useAuth } from '../context/AuthContext'
import { useRegisterModalDirty } from '../context/ModalDirtyContext'
import { useConfirmClose } from '../hooks/useConfirmClose'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/ui/DataTable'
import { BulkBar, selectColumn, selectedRowClass } from '../components/ui/RowSelect'
import { StatSkeleton } from '../components/ui/Skeletons'
import Pagination from '../components/ui/Pagination'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { Select } from '../components/ui/Field'
import SearchableSelect from '../components/ui/SearchableSelect'
import CheckFormFields from './CheckFormFields'
import { bankAccountOptions, uacsOptions } from '../lib/options'
import './Reconciliations/reconciliation.css'

const CHECK_TONE = { cleared: 'green', outstanding: 'slate', stale: 'red', cancelled: 'amber' }
const PER_PAGE_OPTIONS = [10, 25, 50]
// Matches the server's limit for one bulk removal.
const BULK_LIMIT = 500

const BLANK = {
  bank_account_id: '',
  serial_no: '',
  check_date: '',
  payee: '',
  amount: '',
  dv_no: '',
  or_burs_no: '',
  responsibility_center_code: '',
  uacs_object_code: '',
  nature_of_payment: '',
  gross_taxable_amount: '',
  withholding_tax: '',
  report_no: '',
  notes: '',
}

/**
 * The shared Report of Checks Issued: every check, across every bank account,
 * in one place. Any permitted user can add to it or review it; reconciliations
 * read from it automatically, and the whole list (or a filtered slice) exports
 * to Excel.
 */
export default function ChecksRegisterPage() {
  const { user } = useAuth()
  const canManage = [ROLES.FINANCIAL_ANALYST, ROLES.ADMIN, ROLES.DISBURSING_OFFICER].includes(user.role)

  const [accounts, setAccounts] = useState([])
  const [uacsCodes, setUacsCodes] = useState([])
  const [data, setData] = useState({ rows: [], meta: null, summary: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  // The reconciliation's "Open the Checks Register" link pre-selects its account.
  const [searchParams] = useSearchParams()
  const [accountId, setAccountId] = useState(searchParams.get('bank_account_id') ?? '')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [editing, setEditing] = useState(null) // 'new' | check row | null
  const [shown, setShown] = useState(null) // last non-null `editing`, for the closing animation
  const [form, setForm] = useState(BLANK)
  const [initialForm, setInitialForm] = useState(BLANK)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [bulkBusy, setBulkBusy] = useState(false)

  const isDirty = editing !== null && JSON.stringify(form) !== JSON.stringify(initialForm)
  useRegisterModalDirty(isDirty)
  const requestClose = useConfirmClose(isDirty, () => setEditing(null))

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, accountId, status, dateFrom, dateTo, perPage])

  useEffect(() => {
    api
      .get('/check-register/bank-accounts')
      .then(({ data: res }) => setAccounts(res.data ?? []))
      .catch(() => setAccounts([]))
    api
      .get('/check-register/uacs-codes')
      .then(({ data: res }) => setUacsCodes(res.data ?? []))
      .catch(() => setUacsCodes([]))
  }, [])

  const filterAccountOptions = useMemo(() => bankAccountOptions(accounts, { allLabel: 'All bank accounts' }), [accounts])
  const formAccountOptions = useMemo(() => {
    const opts = bankAccountOptions(accounts)
    // A recorded check on an account that has since been deactivated still shows its own account.
    if (editing && editing !== 'new' && editing.bank_account && !accounts.some((a) => a.id === editing.bank_account.id)) {
      opts.push({ value: editing.bank_account.id, label: editing.bank_account.name, displayLabel: editing.bank_account.name, keywords: editing.bank_account.name })
    }
    return opts
  }, [accounts, editing])
  const formUacsOptions = useMemo(() => uacsOptions(uacsCodes, form.uacs_object_code ?? ''), [uacsCodes, form.uacs_object_code])

  const filters = useMemo(
    () => ({
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(accountId && { bank_account_id: accountId }),
      ...(status && { status }),
      ...(dateFrom && { date_from: dateFrom }),
      ...(dateTo && { date_to: dateTo }),
    }),
    [debouncedSearch, accountId, status, dateFrom, dateTo],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await api.get('/check-register', { params: { ...filters, page, per_page: perPage } })
      setData({ rows: res.data ?? [], meta: res.meta ?? null, summary: res.summary ?? null })
      // Removing the last rows of the last page leaves it empty — step back to a page that has rows.
      if ((res.data ?? []).length === 0 && res.meta && page > res.meta.last_page && res.meta.last_page >= 1) {
        setPage(res.meta.last_page)
      }
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [filters, page, perPage])

  useEffect(() => {
    load()
  }, [load])

  const exportHref = `${apiBaseUrl}/check-register/export.xlsx${
    Object.keys(filters).length ? `?${new URLSearchParams(filters).toString()}` : ''
  }`

  function openNew() {
    const next = { ...BLANK, bank_account_id: accountId || (accounts.length === 1 ? String(accounts[0].id) : '') }
    setForm(next)
    setInitialForm(next)
    setFieldErrors({})
    setFormError('')
    setEditing('new')
  }

  function openEdit(check) {
    const next = Object.fromEntries(Object.keys(BLANK).map((k) => [k, check[k] ?? '']))
    setForm(next)
    setInitialForm(next)
    setFieldErrors({})
    setFormError('')
    setEditing(check)
  }

  async function save(e) {
    e.preventDefault()
    const isNew = editing === 'new'
    if (isNew && !form.bank_account_id) {
      setFieldErrors({ bank_account_id: ['Choose which bank account this check was drawn on.'] })
      return
    }
    const account = accounts.find((a) => String(a.id) === String(form.bank_account_id))
    const ok = await fbConfirm({
      title: isNew ? 'Add this check?' : 'Save changes?',
      text: `${form.serial_no || '—'} · ${form.payee || '—'} · ${money(form.amount)}${account ? ` · ${account.name}` : ''}`,
      confirmText: isNew ? 'Add check' : 'Save',
    })
    if (!ok) return

    setSaving(true)
    setFieldErrors({})
    setFormError('')
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]))
    payload.serial_no = form.serial_no
    payload.payee = form.payee
    payload.amount = form.amount
    try {
      if (isNew) {
        await api.post('/check-register', payload)
      } else {
        delete payload.bank_account_id // a recorded check keeps its bank account
        await api.put(`/check-issuances/${editing.id}`, payload)
      }
      notifySuccess(isNew ? 'Check added.' : 'Check updated.')
      setEditing(null)
      await load()
    } catch (err) {
      setFieldErrors(err?.response?.data?.errors ?? {})
      setFormError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function removeCheck(check) {
    const ok = await fbConfirm({
      title: 'Remove this check?',
      text: `${check.serial_no} · ${check.payee} · ${money(check.amount)}. ${
        check.is_manual ? '' : 'It came from an imported file; the file itself is not changed. '
      }This cannot be undone.`,
      confirmText: 'Remove',
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/check-issuances/${check.id}`)
      notifySuccess('Check removed.')
      setEditing(null)
      await load()
    } catch (err) {
      notifyError(err)
    }
  }

  // Why a check is shown read-only, in plain words.
  function lockedReason(check) {
    if (!check) return ''
    if (!canManage) return 'You can view this check but not change it.'
    if (check.status === 'cleared') return 'This check has already cleared the bank, so it can no longer be changed.'
    if (check.status === 'cancelled') return 'This check was cancelled, so it is kept as is for the record.'
    if (check.period_locked) return `This check cannot be changed. ${check.lock_reason}`
    return 'Only a check that is still outstanding can be changed.'
  }

  // The modal fades out after `editing` is cleared; keep showing the last check meanwhile
  // so its buttons and title don't flicker into the "edit" state during the close animation.
  if (editing !== null && shown !== editing) setShown(editing)
  const current = editing ?? shown
  const readOnly = current !== null && current !== 'new' && (!canManage || current.status !== 'outstanding' || current.period_locked)
  const { rows, meta, summary } = data
  const startIndex = meta ? (meta.current_page - 1) * meta.per_page : 0
  const filtered = Object.keys(filters).length > 0

  // --- Bulk selection: only outstanding checks can be removed ---
  const selection = useRowSelection(JSON.stringify(filters), BULK_LIMIT)
  const isSelectable = (c) => canManage && c.status === 'outstanding' && !c.period_locked
  const pickedTotal = selection.list.reduce((sum, c) => sum + Number(c.amount), 0)

  function removePicked() {
    const fromFiles = selection.list.some((c) => !c.is_manual)
    return bulkRemove({
      url: '/check-register/bulk-delete',
      ids: selection.list.map((c) => c.id),
      noun: 'check',
      text: `${money(pickedTotal)} in total. ${
        fromFiles ? 'Some came from imported files; the files themselves are not changed. ' : ''
      }Only outstanding checks in a reconciliation that can still change are removed. This cannot be undone.`,
      setBusy: setBulkBusy,
      onDone: async () => {
        selection.clear()
        await load()
      },
    })
  }

  const columns = [
    ...(canManage ? [selectColumn(selection, rows, isSelectable)] : []),
    { key: 'num', header: '#', className: 'fb-table__index', render: (_c, i) => startIndex + i + 1 },
    {
      key: 'actions',
      header: '',
      className: 'fb-table__actions',
      // One button per row: Edit when the check can still be changed, View when it can't.
      render: (c) => {
        const changeable = canManage && c.status === 'outstanding' && !c.period_locked
        return (
          <Button size="sm" onClick={() => openEdit(c)}>
            {changeable ? 'Edit' : 'View'}
          </Button>
        )
      },
    },
    { key: 'date', header: 'Date', className: 'fb-table__nowrap', render: (c) => shortDate(c.check_date) },
    { key: 'serial', header: 'Check no.', render: (c) => <span className="fb-table__mono">{c.serial_no}</span> },
    { key: 'payee', header: 'Payee', render: (c) => c.payee },
    { key: 'bank', header: 'Bank account', render: (c) => c.bank_account?.name ?? '—' },
    { key: 'amount', header: 'Amount', className: 'fb-table__num', render: (c) => money(c.amount) },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <Badge tone={CHECK_TONE[c.status] ?? 'slate'}>{c.status_label}</Badge>,
    },
    {
      key: 'by',
      header: 'Added by',
      render: (c) => (
        <>
          {c.created_by_name ?? '—'}
          <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--faint)' }}>
            {c.is_manual ? 'Typed in' : 'File import'}
          </span>
        </>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Checks Register"
        subtitle="All checks issued, across every bank account."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a className="fb-btn fb-btn--ghost" href={exportHref}>
              <FiDownload size={15} /> Export to Excel
            </a>
            {canManage && (
              <Button onClick={openNew}>
                <FiPlus size={16} /> Add check
              </Button>
            )}
          </div>
        }
      />

      {!summary && loading && <StatSkeleton count={4} style={{ marginBottom: '1.1rem' }} />}
      {summary && (
        <div className="fb-stats fb-reveal" style={{ marginBottom: '1.1rem' }}>
          <div className="fb-stat">
            <span className="fb-stat__label">{filtered ? 'Checks (filtered)' : 'Checks recorded'}</span>
            <span className="fb-stat__value">{summary.count}</span>
          </div>
          <div className="fb-stat">
            <span className="fb-stat__label">Total issued (not cancelled)</span>
            <span className="fb-stat__value fb-stat__value--money">{money(summary.amount)}</span>
          </div>
          <div className="fb-stat">
            <span className="fb-stat__label">Not yet cashed</span>
            <span className="fb-stat__value">{summary.outstanding_count}</span>
          </div>
          <div className="fb-stat">
            <span className="fb-stat__label">Not yet cashed — amount</span>
            <span className="fb-stat__value fb-stat__value--money">{money(summary.outstanding_amount)}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="fb-alert fb-alert--danger" style={{ marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      <div className="fb-toolbar">
        <div className="fb-toolbar__search">
          <FiSearch size={15} />
          <input
            className="form-control"
            type="search"
            placeholder="Search check no., payee, DV no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="fb-toolbar__account">
          <SearchableSelect
            options={filterAccountOptions}
            value={accountId}
            onChange={(id) => setAccountId(id === '' || id == null ? '' : String(id))}
            placeholder="All bank accounts"
            searchPlaceholder="Search bank, account no., or fund…"
            panelTitle="Filter by bank account"
            overlayPanel
            countLabel="account"
            emptyMessage="No bank accounts match your search."
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '10rem' }} aria-label="Status">
          <option value="">All statuses</option>
          <option value="outstanding">Outstanding</option>
          <option value="cleared">Cleared</option>
          <option value="stale">Stale</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <label className="fb-toolbar__date">
          From
          <input className="form-control" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="fb-toolbar__date">
          To
          <input className="form-control" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <span className="fb-toolbar__spacer" />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          Rows
          <Select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} style={{ width: '5rem' }}>
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        head={
          <BulkBar
            count={selection.count}
            summary={money(pickedTotal)}
            onClear={selection.clear}
            onAction={removePicked}
            busy={bulkBusy}
          />
        }
        rowClassName={selectedRowClass(selection)}
        loading={loading}
        empty={
          filtered
            ? 'No checks match these filters.'
            : canManage
              ? 'No checks yet. Click “Add check” to record the first one.'
              : 'No checks have been recorded yet.'
        }
        footer={<Pagination meta={meta} onPageChange={setPage} />}
      />

      <Modal
        open={!!editing}
        onClose={requestClose}
        icon={<FiPlus size={16} />}
        title={current === 'new' ? 'Add a check' : `${readOnly ? 'Check' : 'Edit check'} ${current?.serial_no || ''}`}
        size="lg"
        footer={
          <>
            {!readOnly && current !== 'new' && (
              <Button type="button" variant="danger" className="fb-check-form__remove" onClick={() => removeCheck(current)}>
                Remove check
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={requestClose}>
              {readOnly ? 'Close' : 'Cancel'}
            </Button>
            {!readOnly && (
              <Button type="submit" form="check-form" loading={saving}>
                {current === 'new' ? 'Add check' : 'Save'}
              </Button>
            )}
          </>
        }
      >
        <form id="check-form" onSubmit={save} className="space-y-4">
          {readOnly && <div className="fb-alert fb-alert--muted">{lockedReason(current)}</div>}
          <fieldset disabled={readOnly} className="fb-check-form__fieldset">
            <CheckFormFields
              form={form}
              setForm={setForm}
              fieldErrors={fieldErrors}
              accountOptions={formAccountOptions}
              uacsOptions={formUacsOptions}
              accountLocked={current !== 'new'}
            />
          </fieldset>

          {formError && <div className="fb-alert fb-alert--danger">{formError}</div>}
        </form>
      </Modal>
    </div>
  )
}
