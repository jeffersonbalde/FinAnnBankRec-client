import { useAuth } from '../context/AuthContext'

/** Render children only when the current user holds one of `roles`. */
export default function RoleGate({ roles, children, fallback = null }) {
  const { user } = useAuth()
  if (!user || (roles && !roles.includes(user.role))) return fallback
  return children
}
