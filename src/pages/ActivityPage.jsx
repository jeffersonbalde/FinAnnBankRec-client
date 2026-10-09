import { useEffect, useMemo, useState } from 'react'
import { FiSearch, FiTrash2, FiUsers } from 'react-icons/fi'
import api from '../lib/api'
import { fbConfirm } from '../lib/confirm'
import { formatDateTime, shortDate } from '../lib/format'
import { notifyError, notifySuccess } from '../lib/toast'
import { useRowSelection } from '../hooks/useRowSelection'
import PageHeader from '../components/PageHeader'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import PersonAvatar from '../components/ui/PersonAvatar'
import Pagination from '../components/ui/Pagination'
import SearchableSelect from '../components/ui/SearchableSelect'
import { BulkBar, selectColumn, selectedRowClass } from '../components/ui/RowSelect'
import { Field, Select } from '../components/ui/Field'

const PER_PAGE_OPTIONS = [10, 25, 50]
const BULK_LIMIT = 500

const KIND_TONE = {
  created: 'green',
  updated: 'amber',
  deleted: 'red',
  login: 'blue',
  logout: 'slate',
  exported: 'blue',
  system: 'slate',
  other: 'slate',
}

const ACTION_FILTERS = [
  ['', 'All activity'],
  ['created', 'Added'],
  ['updated', 'Changed'],
  ['deleted', 'Removed'],
  ['login', 'Signed in'],
  ['logout', 'Signed out'],
  ['exported', 'Downloaded'],
]

const RETENTION_LABELS = {
  7: '7 days',
  30: '30 days',
  90: '3 months',
  180: '6 months',
  365: '1 year',
  730: '2 years',
}

const todayIso = () => new Date().toISOString().slice(0, 10)

/**
 * The footprints screen, in two flavours:
 *  - scope "mine": a person's own activity — they can clear it from their list or have it
 *    clear itself after a while; the administrator still keeps the audit copy;
 *  - scope "all": the administrator's view of everyone's activity — deleting here removes
 *    the audit copy for good, and a system-wide schedule can do it automatically.
 */
export default function ActivityPage({ scope }) {
  const isAll = scope === 'all'
  const base = isAll ? '/audit-logs' : '/my-activity'

  // --- listing -----------------------------------------------------------------------
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [action, setAction] = useState('')
  const [userId, setUserId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [people, setPeople] = useState([])
  const [reloadKey, setReloadKey] = useState(0)

  // --- schedule ----------------------------------------------------------------------
  const [settings, setSettings] = useState(null)
  const [savingSettings, setSavingSettings] = useState(false)

  const [busy, setBusy] = useState(false)
  const [clearBefore, setClearBefore] = useState(false)
  const [beforeDate, setBeforeDate] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, action, userId, dateFrom, dateTo, perPage])

  useEffect(() => {
    if (!isAll) return
    api
      .get('/audit-logs/people')
      .then(({ data }) => setPeople(data.data ?? []))
      .catch(() => setPeople([]))
    api
      .get('/audit-logs/settings')
      .then(({ data }) => setSettings(data))
      .catch(() => setSettings(null))
  }, [isAll])

  const filters = useMemo(
    () => ({
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(action && { action }),
      ...(userId && { user_id: userId }),
      ...(dateFrom && { date_from: dateFrom }),
      ...(dateTo && { date_to: dateTo }),
    }),
    [debouncedSearch, action, userId, dateFrom, dateTo],
  )
  const filtered = Object.keys(filters).length > 0
  const invalidRange = !!dateFrom && !!dateTo && dateFrom > dateTo

  useEffect(() => {
    if (invalidRange) return undefined
    let cancelled = false
    setLoading(true)
    api
      .get(base, { params: { ...filters, page, per_page: perPage } })
      .then(({ data }) => {
        if (cancelled) return
        setRows(data.data ?? [])
        setMeta(data.meta ?? null)
        setSummary(data.summary ?? null)
        if (!isAll && data.settings) setSettings(data.settings)
        // Clearing the last rows of the last page leaves it empty — step back to a page that has rows.
        if ((data.data ?? []).length === 0 && data.meta && page > data.meta.last_page && data.meta.last_page >= 1) {
          setPage(data.meta.last_page)
        }
      })
      .catch((err) => !cancelled && notifyError(err))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [base, filters, page, perPage, reloadKey, invalidRange, isAll])

  const selection = useRowSelection(JSON.stringify(filters), BULK_LIMIT)
  const startIndex = meta ? (meta.current_page - 1) * meta.per_page : 0
  const personOptions = useMemo(
    () => [
      {
        value: '',
        label: 'All users',
        displayLabel: 'All users',
        keywords: 'all everyone users',
        leading: (
          <PersonAvatar>
            <FiUsers size={14} />
          </PersonAvatar>
        ),
      },
      ...people.map((p) => ({
        value: p.id,
        label: p.name,
        displayLabel: p.name,
        meta: p.role_label ?? undefined,
        keywords: `${p.name} ${p.role_label ?? ''}`,
        leading: <PersonAvatar name={p.name} url={p.avatar_url} />,
      })),
    ],
    [people],
  )
  const personName = people.find((p) => String(p.id) === String(userId))?.name

  // --- actions -----------------------------------------------------------------------
  async function run(body, { title, text, confirmText }) {
    const ok = await fbConfirm({ title, text, confirmText, danger: true })
    if (!ok) return false
    setBusy(true)
    try {
      const { data } = await api.post(`${base}/clear`, body)
      const n = data.cleared ?? data.deleted ?? 0
      notifySuccess(
        n === 0 ? 'Nothing to remove.' : `${n} ${n === 1 ? 'entry' : 'entries'} ${isAll ? 'deleted' : 'cleared'}.`,
      )
      selection.clear()
      setReloadKey((k) => k + 1)
      return true
    } catch (err) {
      notifyError(err)
      return false
    } finally {
      setBusy(false)
    }
  }

  const ownerNote = isAll
    ? 'This removes it for good and cannot be undone.'
    : 'This only removes it from your list. The administrator can still see it.'

  const removePicked = () =>
    run(
      { mode: 'ids', ids: selection.list.map((r) => r.id) },
      {
        title: `${isAll ? 'Delete' : 'Clear'} ${selection.count} ${selection.count === 1 ? 'entry' : 'entries'}?`,
        text: ownerNote,
        confirmText: `${isAll ? 'Delete' : 'Clear'} ${selection.count}`,
      },
    )

  const removeAll = () =>
    isAll
      ? userId
        ? run(
            { mode: 'user', user_id: Number(userId) },
            {
              title: `Delete all of ${personName ?? 'this user'}’s activity?`,
              text: ownerNote,
              confirmText: 'Delete all',
            },
          )
        : run(
            { mode: 'all', confirm: 'CLEAR' },
            {
              title: 'Delete the whole activity log?',
              text: `Every user’s activity is removed. ${ownerNote}`,
              confirmText: 'Delete everything',
            },
          )
      : run({ mode: 'all' }, { title: 'Clear all your activity?', text: ownerNote, confirmText: 'Clear all' })

  async function removeBefore(e) {
    e.preventDefault()
    if (!beforeDate) return
    const done = await run(
      { mode: 'before', before: beforeDate },
      {
        title: `${isAll ? 'Delete' : 'Clear'} everything up to ${shortDate(beforeDate)}?`,
        text: ownerNote,
        confirmText: isAll ? 'Delete' : 'Clear',
      },
    )
    if (done) setClearBefore(false)
  }

  async function saveRetention(value) {
    setSavingSettings(true)
    try {
      const retention_days = value === '' ? null : Number(value)
      const { data } = await api.put(`${base}/settings`, { retention_days })
      setSettings((s) => ({ ...s, ...data }))
      const extra = isAll ? data.purged : data.cleared
      notifySuccess(
        retention_days === null
          ? 'Auto-clear turned off.'
          : `Saved.${extra ? ` ${extra} old ${extra === 1 ? 'entry' : 'entries'} ${isAll ? 'deleted' : 'cleared'} now.` : ''}`,
      )
      if (extra) setReloadKey((k) => k + 1)
    } catch (err) {
      notifyError(err)
    } finally {
      setSavingSettings(false)
    }
  }

  // --- table -------------------------------------------------------------------------
  const columns = [
    selectColumn(selection, rows, () => true),
    { key: 'num', header: '#', className: 'fb-table__index', render: (_r, i) => startIndex + i + 1 },
    {
      key: 'created_at',
      header: 'When',
      className: 'fb-table__nowrap',
      render: (r) => formatDateTime(r.created_at),
    },
    ...(isAll
      ? [
          {
            key: 'who',
            header: 'User',
            render: (r) => (
              <>
                {r.who}
                {r.cleared_by_user && <span className="fb-activity__note">Also cleared by the user</span>}
              </>
            ),
          },
        ]
      : []),
    {
      key: 'action',
      header: 'Action',
      render: (r) => <Badge tone={KIND_TONE[r.kind] ?? 'slate'}>{r.action_label}</Badge>,
    },
    {
      key: 'summary',
      header: 'Activity',
      // The finer detail (which fields changed) stays out of sight; hover to see it.
      render: (r) => <span title={r.details?.length ? r.details.join(' · ') : undefined}>{r.summary}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title={isAll ? 'Activity Log' : 'My Activity'}
        subtitle={isAll ? 'Recent actions of all users.' : 'Your recent actions in the system.'}
        actions={
          <label className="fb-activity__auto">
            {isAll ? 'Delete old activity automatically after' : 'Clear my history automatically after'}
            <Select
              value={settings?.retention_days ?? ''}
              disabled={!settings || savingSettings}
              onChange={(e) => saveRetention(e.target.value)}
              aria-label={isAll ? 'Delete old activity automatically after' : 'Clear my history automatically after'}
              style={{ width: '9rem' }}
            >
              <option value="">Never</option>
              {(settings?.options ?? []).map((days) => (
                <option key={days} value={days}>
                  {RETENTION_LABELS[days] ?? `${days} days`}
                </option>
              ))}
            </Select>
          </label>
        }
      />

      <div className="fb-toolbar">
        <div className="fb-toolbar__search">
          <FiSearch size={15} />
          <input
            className="form-control"
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAll && (
          <div className="fb-toolbar__account">
            <SearchableSelect
              options={personOptions}
              value={userId}
              onChange={(id) => setUserId(id === '' || id == null ? '' : String(id))}
              placeholder="All users"
              searchPlaceholder="Search a user..."
              panelTitle="Choose a user"
              overlayPanel
              countLabel="user"
              emptyMessage="No user matches your search."
            />
          </div>
        )}
        <Select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          style={{ width: '10.5rem' }}
          aria-label="Type of activity"
        >
          {ACTION_FILTERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <label className="fb-toolbar__date">
          From
          <input
            className="form-control"
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="fb-toolbar__date">
          To
          <input
            className="form-control"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <span className="fb-toolbar__spacer" />
        <Button
          variant="secondary"
          onClick={() => {
            setBeforeDate('')
            setClearBefore(true)
          }}
          disabled={busy || !summary?.total}
        >
          <FiTrash2 size={14} /> {isAll ? 'Delete up to a date' : 'Clear up to a date'}
        </Button>
        <Button variant="danger" onClick={removeAll} loading={busy} disabled={!summary?.total}>
          {isAll && userId ? "Delete this user's activity" : isAll ? 'Delete all' : 'Clear all'}
        </Button>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: 'var(--muted)',
          }}
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
      </div>

      {invalidRange && (
        <p className="fb-help" style={{ color: 'var(--danger)' }}>
          The From date must be on or before the To date.
        </p>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowClassName={selectedRowClass(selection)}
        head={
          <BulkBar
            count={selection.count}
            onClear={selection.clear}
            onAction={removePicked}
            actionLabel={isAll ? 'Delete' : 'Clear'}
            busy={busy}
          />
        }
        empty={
          filtered
            ? 'No activity matches these filters.'
            : isAll
              ? 'No activity recorded yet.'
              : 'No activity yet. What you do in the system will show up here.'
        }
        footer={<Pagination meta={meta} onPageChange={setPage} />}
      />

      <Modal
        open={clearBefore}
        onClose={() => setClearBefore(false)}
        icon={<FiTrash2 size={16} />}
        title={isAll ? 'Delete up to a date' : 'Clear up to a date'}
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setClearBefore(false)}>
              Cancel
            </Button>
            <Button type="submit" form="clear-before-form" variant="danger" disabled={!beforeDate} loading={busy}>
              {isAll ? 'Delete' : 'Clear'}
            </Button>
          </>
        }
      >
        <form id="clear-before-form" onSubmit={removeBefore}>
          <p className="fb-help">
            Everything on or before this date will be {isAll ? 'deleted' : 'cleared'}. {ownerNote}
          </p>
          <Field label="Up to and including" required>
            <input
              className="form-control"
              type="date"
              value={beforeDate}
              max={todayIso()}
              onChange={(e) => setBeforeDate(e.target.value)}
              required
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
