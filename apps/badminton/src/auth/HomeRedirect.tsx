import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { roleHome } from './roleHome'
import { Loading } from '../app/Loading'

// "/" sends each visitor to their home: admins -> dashboard, matchmakers ->
// their area, signed-out -> login. (The public home page is TASK-9.1.)
export function HomeRedirect() {
  const { role, loading } = useAuth()
  if (loading) return <Loading />
  return <Navigate to={roleHome(role)} replace />
}
