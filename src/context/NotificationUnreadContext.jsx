import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from './AuthContext'

const NotificationUnreadContext = createContext(null)

export function NotificationUnreadProvider({ children }) {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) {
      setUnread(0)
      return 0
    }
    try {
      const { data } = await api.get('/notifications')
      const count = data.unread_count ?? 0
      setUnread(count)
      return count
    } catch {
      return 0
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setUnread(0)
      return undefined
    }
    refresh()
    const timer = setInterval(refresh, 30000)
    return () => clearInterval(timer)
  }, [user, refresh])

  return (
    <NotificationUnreadContext.Provider value={{ unread, setUnread, refresh }}>
      {children}
    </NotificationUnreadContext.Provider>
  )
}

export function useNotificationUnread() {
  const ctx = useContext(NotificationUnreadContext)
  if (!ctx) {
    throw new Error('useNotificationUnread must be used within NotificationUnreadProvider')
  }
  return ctx
}
