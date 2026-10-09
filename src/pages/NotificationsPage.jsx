import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCheckSquare, FiTrash2 } from 'react-icons/fi'
import api from '../lib/api'
import { fbConfirm } from '../lib/confirm'
import { formatDateTime } from '../lib/format'
import { notifyError, notifySuccess } from '../lib/toast'
import { useNotificationUnread } from '../context/NotificationUnreadContext'
import { useRowSelection } from '../hooks/useRowSelection'
import PageHeader from '../components/PageHeader'
import Button from '../components/ui/Button'
import DataTable from '../components/ui/DataTable'
import Pagination from '../components/ui/Pagination'
import { BulkBar, selectColumn, selectedRowClass } from '../components/ui/RowSelect'
import { Select } from '../components/ui/Field'
import './notifications.css'

const PER_PAGE_OPTIONS = [10, 25, 50]

const RETENTION_LABELS = {
  7: '7 days',
  30: '30 days',
  90: '3 months',
  180: '6 months',
  365: '1 year',
}

const STATUS_FILTERS = [
  ['all', 'All notifications'],
  ['unread', 'Unread only'],
  ['read', 'Read only'],
]

const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { refresh: refreshUnread } = useNotificationUnread()

  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [counts, setCounts] = useState({ unread: 0, total: 0 })
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [status, setStatus] = useState('all')
  const [reloadKey, setReloadKey] = useState(0)

  const [openingId, setOpeningId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Ticked notifications stay ticked while paging, but not when the filter or page size changes.
  const selection = useRowSelection(`${status}|${perPage}`, 500)

  useEffect(() => {
    setPage(1)
  }, [status, perPage])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get('/notifications', { params: { status, page, per_page: perPage } })
      .then(({ data }) => {
        if (cancelled) return
        setRows(data.data ?? [])
        setMeta(data.meta ?? null)
        setCounts({ unread: data.unread_count ?? 0, total: data.total ?? 0 })
        if (data.settings) setSettings(data.settings)
        // Deleting the last rows of the last page leaves it empty: step back to a page that has rows.
        if ((data.data ?? []).length === 0 && data.meta && page > data.meta.last_page && data.meta.last_page >= 1) {
          setPage(data.meta.last_page)
        }
      })
      .catch((err) => !cancelled && notifyError(err, 'Failed to load notifications.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [status, page, perPage, reloadKey])

  const reload = useCallback(async () => {
    setReloadKey((k) => k + 1)
    await refreshUnread()
  }, [refreshUnread])

  async function open(n) {
    setOpeningId(n.id)
    try {
      if (!n.read_at) await api.post(`/notifications/${n.id}/read`)
      await refreshUnread()
      if (n.data?.reconciliation_id) {
        navigate(`/reconciliations/${n.data.reconciliation_id}`)
      } else {
        await reload()
      }
    } catch (err) {
      notifyError(err, 'Could not open this notification.')
    } finally {
      setOpeningId(null)
    }
  }

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all')
      notifySuccess('All notifications marked read.')
      await reload()
    } catch (err) {
      notifyError(err)
    }
  }

  // --- deleting ------------------------------------------------------------------------
  async function run(request, { title, text, confirmText }) {
    const ok = await fbConfirm({ title, text, confirmText, danger: true })
    if (!ok) return false
    setBusy(true)
    try {
      const { data } = await request()
      notifySuccess(data.deleted === 0 ? 'Nothing to delete.' : `${plural(data.deleted, 'notification')} deleted.`)
      selection.clear()
      await reload()
      return true
    } catch (err) {
      notifyError(err)
      return false
    } finally {
      setBusy(false)
    }
  }

  const forGood = 'This cannot be undone.'

  const deleteOne = (n) =>
    run(() => api.post('/notifications/bulk-delete', { ids: [n.id] }), {
      title: 'Delete this notification?',
      text: forGood,
      confirmText: 'Delete',
    })

  const deletePicked = () =>
    run(() => api.post('/notifications/bulk-delete', { ids: selection.list.map((r) => r.id) }), {
      title: `Delete ${plural(selection.count, 'notification')}?`,
      text: forGood,
      confirmText: `Delete ${selection.count}`,
    })

  const deleteAll = () =>
    run(() => api.post('/notifications/clear', { mode: 'all' }), {
      title: 'Delete all notifications?',
      text: `Every notification is removed, including ${counts.unread} you have not read. ${forGood}`,
      confirmText: 'Delete all',
    })

  async function saveRetention(value) {
    setSavingSettings(true)
    try {
      const retention_days = value === '' ? null : Number(value)
      const { data } = await api.put('/notifications/settings', { retention_days })
      setSettings((s) => ({ ...s, ...data }))
      notifySuccess(
        retention_days === null
          ? 'Auto-delete turned off.'
          : `Saved.${data.deleted ? ` ${plural(data.deleted, 'old notification')} deleted now.` : ''}`,
      )
      if (data.deleted) await reload()
    } catch (err) {
      notifyError(err)
    } finally {
      setSavingSettings(false)
    }
  }

  // --- table ---------------------------------------------------------------------------
  const startIndex = meta ? (meta.from ?? 1) - 1 : 0

  const columns = [
    selectColumn(selection, rows, () => true),
    { key: 'num', header: '#', className: 'fb-table__index', render: (_n, i) => startIndex + i + 1 },
    {
      key: 'actions',
      header: 'Actions',
      render: (n) => (
        <div className="fb-notif-actions">
          <Button size="sm" loading={openingId === n.id} onClick={() => open(n)}>
            Open
          </Button>
          <Button size="sm" variant="secondary" onClick={() => deleteOne(n)} disabled={busy}>
            <FiTrash2 size={14} /> Delete
          </Button>
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Notification',
      render: (n) => (
        <div className={`fb-notif-cell${n.read_at ? '' : ' is-unread'}`}>
          <p className="fb-notif-cell__msg">
            {!n.read_at && <span className="fb-notif-cell__dot" title="Not read yet" />}
            {n.data?.message || 'Notification'}
          </p>
          <p className="fb-notif-cell__meta">{[n.data?.period, n.data?.status_label].filter(Boolean).join(' · ')}</p>
        </div>
      ),
    },
    { key: 'created_at', header: 'Received', className: 'fb-table__nowrap', render: (n) => formatDateTime(n.created_at) },
  ]

  const retentionLabel = 'Delete read notifications automatically after'

  return (
    <div>
      <PageHeader
        title="Notifications"
        actions={
          <>
            <label className="fb-activity__auto">
              {retentionLabel}
              <Select
                value={settings?.retention_days ?? ''}
                disabled={!settings || savingSettings}
                onChange={(e) => saveRetention(e.target.value)}
                aria-label={retentionLabel}
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
            <Button variant="secondary" size="sm" onClick={markAllRead} disabled={counts.unread === 0}>
              <FiCheckSquare size={14} /> Mark all read
            </Button>
          </>
        }
      />

      <div className="fb-toolbar">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ width: '11.5rem' }}
          aria-label="Show notifications"
        >
          {STATUS_FILTERS.map(([value, label]) => (
            <option key={value} value={value}>
              {value === 'unread' ? `${label} (${counts.unread})` : label}
            </option>
          ))}
        </Select>
        <span className="fb-toolbar__spacer" />
        <Button variant="danger" onClick={deleteAll} loading={busy} disabled={counts.total === 0}>
          Delete all
        </Button>
        <label className="fb-notif-rows">
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
        loading={loading}
        rowClassName={selectedRowClass(selection)}
        head={<BulkBar count={selection.count} onClear={selection.clear} onAction={deletePicked} actionLabel="Delete" busy={busy} />}
        empty={status === 'all' ? 'No notifications.' : `No ${status} notifications.`}
        footer={<Pagination meta={meta} onPageChange={setPage} />}
      />
    </div>
  )
}
