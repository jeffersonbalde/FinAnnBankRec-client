import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import AppLayout from './components/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MasterDataPage from './pages/MasterData/MasterDataPage'
import ChecksRegisterPage from './pages/ChecksRegisterPage'
import ReconciliationsPage from './pages/Reconciliations/ReconciliationsPage'
import ReconciliationDetailPage from './pages/Reconciliations/ReconciliationDetailPage'
import NotificationsPage from './pages/NotificationsPage'
import OutstandingChecksPage from './pages/OutstandingChecksPage'
import BackupSecurityPage from './pages/BackupSecurityPage'
import AuditTrailPage from './pages/AuditTrailPage'
import MyActivityPage from './pages/MyActivityPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import { ROLES } from './lib/roles'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="outstanding-checks" element={<OutstandingChecksPage />} />

            <Route
              element={
                <ProtectedRoute
                  roles={[
                    ROLES.FINANCIAL_ANALYST,
                    ROLES.ADMIN,
                    ROLES.BUDGET_OFFICER,
                    ROLES.DISBURSING_OFFICER,
                  ]}
                />
              }
            >
              <Route path="checks-register" element={<ChecksRegisterPage />} />
              <Route path="reconciliations" element={<ReconciliationsPage />} />
              <Route path="reconciliations/:id" element={<ReconciliationDetailPage />} />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  roles={[ROLES.FINANCIAL_ANALYST, ROLES.BUDGET_OFFICER, ROLES.DISBURSING_OFFICER]}
                />
              }
            >
              <Route path="profile" element={<ProfilePage />} />
              <Route path="my-activity" element={<MyActivityPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
              <Route path="master-data" element={<MasterDataPage />} />
              <Route path="backup-security" element={<BackupSecurityPage />} />
              <Route path="audit-trail" element={<AuditTrailPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
