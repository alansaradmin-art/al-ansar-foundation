import { Navigate, Outlet } from 'react-router-dom'
import { useProfile } from '@/contexts/ProfileContext'
import type { Role } from '@/types'

/**
 * UX convenience only — sends a manager away from /admin/* and vice versa.
 * The real authorization boundary is Postgres RLS (see
 * supabase/migrations/0003_rls.sql); this just avoids showing someone a
 * screen for data they can't query anyway.
 */
export default function RequireRole({ role }: { role: Role }) {
  const { isAdmin, isManager } = useProfile()
  const hasRole = role === 'ADMIN' ? isAdmin : isManager

  if (!hasRole) {
    return <Navigate to={isAdmin ? '/admin' : '/manager'} replace />
  }

  return <Outlet />
}
