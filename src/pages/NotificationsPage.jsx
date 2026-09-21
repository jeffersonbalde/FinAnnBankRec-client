import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCheckSquare } from 'react-icons/fi'
import api from '../lib/api'
import { shortDate } from '../lib/format'
import { notifySuccess } from '../lib/toast'
import { useNotificationUnread } from '../context/NotificationUnreadContext'
import PageHeader from '../components/PageHeader'
import Button from '../components/ui/Button'
import { FullPageSpinner } from '../components/Spinner'
import './notifications.css'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { refresh: refreshUnread } = useNotificationUnread()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [openingId, setOpeningId] = useState(null)

  const load = useCallback(async () => {
    const { data } = await api.get('/notifications')
    setItems(data.data ?? [])
    setLoading(false)
    await refreshUnread()
  }, [refreshUnread])

  useEffect(() => {
    load()
  }, [load])

  async function open(n) {
    setOpeningId(n.id)
    try {
      if (!n.read_at) await api.post(`/notifications/${n.id}/read`)
      await refreshUnread()
      if (n.data?.reconciliation_id) {
        navigate(`/reconciliations/${n.data.reconciliation_id}`)
      } else {
        await load()
      }
    } finally {
      setOpeningId(null)
    }
  }

  async function markAllRead() {
    await api.post('/notifications/read-all')
    notifySuccess('All notifications marked read.')
    await load()
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        actions={
          <Button variant="secondary" size="sm" onClick={markAllRead} disabled={items.every((n) => n.read_at)}>
            <FiCheckSquare size={14} /> Mark all read
          </Button>
        }
      />

      {loading ? (
        <FullPageSpinner />
      ) : (
        <div className="fb-notif-list">
          {items.length === 0 && <p className="fb-notif-list__empty">No notifications.</p>}
          {items.map((n) => {
            const unread = !n.read_at
            return (
              <div key={n.id} className={`fb-notif-row${unread ? ' is-unread' : ''}`}>
                <div className="fb-notif-row__main">
                  {unread ? <span className="fb-notif-row__dot" aria-hidden /> : <span className="fb-notif-row__dot is-read" aria-hidden />}
                  <div className="fb-notif-row__text">
                    <p className="fb-notif-row__msg">{n.data?.message || 'Notification'}</p>
                    <p className="fb-notif-row__meta">
                      {[n.data?.period, n.data?.status_label, shortDate(n.created_at)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  className="fb-notif-row__open"
                  loading={openingId === n.id}
                  onClick={() => open(n)}
                >
                  Open
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
