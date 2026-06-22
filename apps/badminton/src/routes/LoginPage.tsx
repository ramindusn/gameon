import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button } from '@gameon/ui'
import { isSupabaseConfigured } from '@gameon/supabase'
import { useAuth } from '../auth/useAuth'
import { roleHome } from '../auth/roleHome'
import { AdminLogin } from '../auth/AdminLogin'
import { MatchmakerLogin } from '../auth/MatchmakerLogin'
import { Loading } from '../app/Loading'

type LoginTab = 'admin' | 'matchmaker'

export function LoginPage() {
  const { role, loading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<LoginTab>('admin')

  // Once a role resolves (after sign-in), send the user to their home.
  useEffect(() => {
    if (!loading && role) navigate(roleHome(role), { replace: true })
  }, [loading, role, navigate])

  if (loading) return <Loading />

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mb-2 inline-grid h-10 w-10 place-items-center rounded-xl bg-accent text-white">
          🏸
        </div>
        <h1 className="font-display text-2xl font-bold text-fg">GameOn</h1>
        <p className="text-sm text-fg-muted">Sign in to manage your club</p>
      </div>

      <Card title="Sign in" icon="🔐">
        <div className="mb-4 flex gap-2" role="tablist">
          <Button
            variant={tab === 'admin' ? 'primary' : 'secondary'}
            onClick={() => setTab('admin')}
            data-testid="tab-admin"
          >
            Admin
          </Button>
          <Button
            variant={tab === 'matchmaker' ? 'primary' : 'secondary'}
            onClick={() => setTab('matchmaker')}
            data-testid="tab-matchmaker"
          >
            Matchmaker
          </Button>
        </div>
        {tab === 'admin' ? <AdminLogin /> : <MatchmakerLogin />}
        {!isSupabaseConfigured && (
          <p className="mt-3 text-xs text-warning">
            Supabase isn’t configured — sign-in will fail until env vars are set.
          </p>
        )}
      </Card>
    </div>
  )
}
