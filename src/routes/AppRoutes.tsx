import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import RequireAuth from './RequireAuth'
import RequireRole from './RequireRole'
import RoleHome from './RoleHome'
import LoginPage from '@/pages/LoginPage'
import SsoCallbackPage from '@/pages/SsoCallbackPage'
import NotFoundPage from '@/pages/NotFoundPage'
import { LoadingState } from '@/components/StateViews'

// Manager and Admin are two distinct experiences used by different people —
// lazy-loading each role's tree means a manager's phone never downloads the
// Admin bundle (reports, import, audit logs) and vice versa.
const ManagerLayout = lazy(() => import('@/layouts/ManagerLayout'))
const ManagerHomePage = lazy(() => import('@/pages/manager/HomePage'))
const ManagerMembersPage = lazy(() => import('@/pages/manager/MembersPage'))
const ManagerMemberDetailPage = lazy(() => import('@/pages/manager/MemberDetailPage'))
const ManagerPendingPage = lazy(() => import('@/pages/manager/PendingPage'))
const ManagerDonationsPage = lazy(() => import('@/pages/manager/DonationsPage'))
const ManagerFollowupsPage = lazy(() => import('@/pages/manager/FollowupsPage'))
const ManagerMorePage = lazy(() => import('@/pages/manager/MorePage'))

const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminMembersPage = lazy(() => import('@/pages/admin/MembersPage'))
const AdminMemberDetailPage = lazy(() => import('@/pages/admin/MemberDetailPage'))
const AdminManagersPage = lazy(() => import('@/pages/admin/ManagersPage'))
const AdminDonationsPage = lazy(() => import('@/pages/admin/DonationsPage'))
const AdminFollowupsPage = lazy(() => import('@/pages/admin/FollowupsPage'))
const AdminReportsPage = lazy(() => import('@/pages/admin/ReportsPage'))
const AdminAuditLogsPage = lazy(() => import('@/pages/admin/AuditLogsPage'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))
const AdminImportPage = lazy(() => import('@/pages/admin/ImportPage'))

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sso-callback" element={<SsoCallbackPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<RoleHome />} />

          <Route element={<RequireRole role="MANAGER" />}>
            <Route path="/manager" element={<ManagerLayout />}>
              <Route index element={<ManagerHomePage />} />
              <Route path="members" element={<ManagerMembersPage />} />
              <Route path="members/:memberId" element={<ManagerMemberDetailPage />} />
              <Route path="pending" element={<ManagerPendingPage />} />
              <Route path="donations" element={<ManagerDonationsPage />} />
              <Route path="followups" element={<ManagerFollowupsPage />} />
              <Route path="more" element={<ManagerMorePage />} />
            </Route>
          </Route>

          <Route element={<RequireRole role="ADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="members" element={<AdminMembersPage />} />
              <Route path="members/:memberId" element={<AdminMemberDetailPage />} />
              <Route path="members/import" element={<AdminImportPage />} />
              <Route path="managers" element={<AdminManagersPage />} />
              <Route path="donations" element={<AdminDonationsPage />} />
              <Route path="followups" element={<AdminFollowupsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
