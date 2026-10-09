import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { FiMenu, FiChevronDown, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useModalDirty } from '../context/ModalDirtyContext'
import { useNotificationUnread } from '../context/NotificationUnreadContext'
import { visibleNavItems } from '../lib/nav'
import { ROLE_LABELS, ROLES } from '../lib/roles'
import useLocalBackupSync from '../hooks/useLocalBackupSync'
import { fbConfirm, fbLoading, fbClose } from '../lib/confirm'
import { notifyError } from '../lib/toast'
import NotificationBell from './NotificationBell'
import fabresLogo from '../assets/fabres_logo.png'
import './layout.css'

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // true = sidebar hidden. Below the mobile breakpoint that visually flips
  // (the sidebar starts off-canvas there, so "collapsed" is what brings it
  // on screen as a drawer) — see layout.css for the two rule sets.
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const userRef = useRef(null)
  const items = visibleNavItems(user?.role)
  const hasUnsavedChanges = useModalDirty()
  const { unread } = useNotificationUnread()
  useLocalBackupSync(user?.role === ROLES.ADMIN)

  async function guardedNavigate(e, to) {
    if (!hasUnsavedChanges) return
    e.preventDefault()
    const ok = await fbConfirm({
      title: 'Leave this page?',
      text: "You have unsaved changes in an open form. They'll be lost if you leave.",
      confirmText: 'Leave',
      cancelText: 'Stay',
      danger: true,
    })
    if (ok) navigate(to)
  }

  useEffect(() => setCollapsed(false), [location.pathname])

  useEffect(() => {
    function onDoc(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Safety net: if the drawer was left open on mobile and the viewport is
  // then resized past the breakpoint, drop back to the resting state
  // instead of leaving the (now differently-meaning) class applied.
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setCollapsed(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  async function handleLogout() {
    setMenuOpen(false)
    const ok = await fbConfirm({
      title: 'Sign out?',
      text: "You'll need to sign in again to continue.",
      confirmText: 'Sign out',
      cancelText: 'Stay signed in',
    })
    if (!ok) return

    fbLoading('Signing out…')
    try {
      await logout()
      fbClose()
      navigate('/login', { replace: true })
    } catch (err) {
      fbClose()
      notifyError(err, 'Sign out failed. Please try again.')
    }
  }

  return (
    <div className={`fb-dash${collapsed ? ' is-collapsed' : ''}`}>
      <div className="fb-dash__overlay" onClick={() => setCollapsed(false)} />

      <aside className="fb-dash__sidebar">
        <NavLink to="/" className="fb-dash__brand" onClick={(e) => guardedNavigate(e, '/')}>
          <img src={fabresLogo} alt="FABReS" className="fb-dash__brand-mark" />
          <span className="fb-dash__brand-title">FABReS</span>
        </NavLink>

        <nav className="fb-dash__nav">
          <p className="fb-dash__nav-heading">Menu</p>
          {items.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={(e) => guardedNavigate(e, to)}
              className={({ isActive }) => `fb-dash__nav-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={18} className="fb-dash__nav-icon" />
              <span className="fb-dash__nav-label">{label}</span>
              {to === '/notifications' && unread > 0 ? (
                <span className="fb-dash__nav-badge">{unread > 9 ? '9+' : unread}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="fb-dash__content">
        <header className="fb-dash__topbar">
          <button
            type="button"
            className="fb-dash__toggle"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
          >
            <FiMenu size={20} />
          </button>

          <div className="fb-dash__top-actions">
            <NotificationBell />

            <div className="fb-dash__user" ref={userRef}>
              <button
                type="button"
                className="fb-dash__user-btn"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className="fb-dash__avatar">
                  {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : initials(user?.name)}
                </span>
                <span>
                  <span className="fb-dash__user-name" style={{ display: 'block' }}>
                    {user?.name}
                  </span>
                  <span className="fb-dash__user-role" style={{ display: 'block' }}>
                    {ROLE_LABELS[user?.role]}
                  </span>
                </span>
                <FiChevronDown size={15} />
              </button>

              {menuOpen && (
                <div className="fb-dash__user-menu">
                  <div className="fb-dash__user-menu-head">
                    <p>{user?.email}</p>
                    <p>{user?.designation}</p>
                  </div>
                  <button type="button" className="fb-dash__user-menu-item is-danger" onClick={handleLogout}>
                    <FiLogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="fb-dash__main">
          {/* Keyed by path so every page change replays the fade-in. */}
          <div key={location.pathname} className="fb-page-fade">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
