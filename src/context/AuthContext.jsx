import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { ensureCsrfCookie } from '../lib/api'
import { hideSplash } from '../lib/splash'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/me')
      setUser(data.data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
      hideSplash()
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email, password) => {
    await ensureCsrfCookie()
    const { data } = await api.post('/login', { email, password })
    setUser(data.data)
    return data.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const value = { user, loading, login, logout, refresh, hasRole: (...r) => !!user && r.includes(user.role) }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
