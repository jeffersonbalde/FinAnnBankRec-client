import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell } from 'react-icons/fi'
import api from '../lib/api'
import { shortDate } from '../lib/format'
import { useNotificationUnread } from '../context/NotificationUnreadContext'
import './notification-bell.css'

export default function NotificationBell() {
  const navigate = useNavigate()
  const { unread, refresh } = useNotificationUnread()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const loadItems = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications')
      setItems(data.data ?? [])
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    loadItems()
    return undefined
  }, [open, loadItems])

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function openItem(n) {
    if (!n.read_at) await api.post(`/notifications/${n.id}/read`)
    setOpen(false)
    await refresh()
    await loadItems()
    if (n.data?.reconciliation_id) navigate(`/reconciliations/${n.data.reconciliation_id}`)
  }

  async function markAll() {
    await api.post('/notifications/read-all')
    await refresh()
    await loadItems()
  }

  return (
    <div className="fb-bell" ref={wrapRef}>
      <button type="button" className="fb-bell__btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <FiBell size={19} />
        {unread > 0 && <span className="fb-bell__dot">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="fb-bell__menu">
          <div className="fb-bell__menu-head">
            <span>Notifications</span>
            {unread > 0 && (
              <button type="button" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          <div className="fb-bell__list">
            {items.length === 0 && <p className="fb-bell__empty">Nothing yet.</p>}
            {items.slice(0, 12).map((n) => (
              <button
                key={n.id}
                type="button"
                className={`fb-bell__item${n.read_at ? '' : ' is-unread'}`}
                onClick={() => openItem(n)}
              >
                <p className="fb-bell__msg">{n.data?.message}</p>
                <p className="fb-bell__meta">
                  {n.data?.period} · {shortDate(n.created_at)}
                </p>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="fb-bell__all"
            onClick={() => {
              setOpen(false)
              navigate('/notifications')
            }}
          >
            See all
          </button>
        </div>
      )}
    </div>
  )
}
