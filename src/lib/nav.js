import { FiGrid, FiRefreshCcw, FiCheckSquare, FiBell, FiDatabase, FiShield, FiUser } from 'react-icons/fi'
import { ROLES } from './roles'

/**
 * Sidebar navigation. `roles` (when present) limits visibility to those roles.
 */
export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', Icon: FiGrid, end: true },
  {
    to: '/reconciliations',
    label: 'Reconciliations',
    Icon: FiRefreshCcw,
    roles: [ROLES.FINANCIAL_ANALYST, ROLES.ADMIN, ROLES.BUDGET_OFFICER, ROLES.DISBURSING_OFFICER],
  },
  { to: '/outstanding-checks', label: 'Outstanding Checks', Icon: FiCheckSquare },
  { to: '/notifications', label: 'Notifications', Icon: FiBell },
  {
    to: '/profile',
    label: 'My Profile',
    Icon: FiUser,
    roles: [ROLES.FINANCIAL_ANALYST, ROLES.BUDGET_OFFICER, ROLES.DISBURSING_OFFICER],
  },
  { to: '/master-data', label: 'Master Data', Icon: FiDatabase, roles: [ROLES.ADMIN] },
  { to: '/backup-security', label: 'Backup & Security', Icon: FiShield, roles: [ROLES.ADMIN] },
]

export function visibleNavItems(role) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
}
