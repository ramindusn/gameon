import { Navigate, Outlet } from 'react-router-dom'
import type { Role } from '@gameon/supabase'
import { useAuth } from './useAuth'
import { roleHome } from './roleHome'
import { Loading } from '../app/Loading'

// Gate a route subtree by role. Signed-out visitors go to /login; a signed-in
// user with the wrong role is bounced to their own home (no access-denied dead end).
export function ProtectedRoute({ allow }: { allow: Exclude<Role, null>[] }) {
  const { role, loading } = useAuth()
  if (loading) return <Loading />
  if (!role) return <Navigate to="/login" replace />
  if (!allow.includes(role)) return <Navigate to={roleHome(role)} replace />
  return <Outlet />
}
