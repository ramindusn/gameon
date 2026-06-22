import { useState } from 'react'
import { Card, Button, Field } from '@gameon/ui'
import { greet } from '@gameon/domain'
import { isSupabaseConfigured } from '@gameon/supabase'
import { useAuth } from './auth/useAuth'
import { AdminLogin } from './auth/AdminLogin'
import { MatchmakerLogin } from './auth/MatchmakerLogin'

// E2E builds run with VITE_E2E=1; auth (E01) will use this to bypass real sign-in.
const e2e = import.meta.env.VITE_E2E === '1'

type LoginTab = 'admin' | 'matchmaker'

function LoginChooser() {
  const [tab, setTab] = useState<LoginTab>('admin')

  return (
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
      <p className="mt-3 text-xs text-fg-muted">
        Supabase configured: {String(isSupabaseConfigured)}
      </p>
    </Card>
  )
}

function SignedIn() {
  const { role, signOut } = useAuth()
  return (
    <Card title="Auth (E01)" icon="🔐">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-fg" data-testid="auth-role">
          Role: {role}
        </p>
        <Button variant="ghost" onClick={() => void signOut()} data-testid="sign-out">
          Sign out
        </Button>
      </div>
    </Card>
  )
}

export function App() {
  const { role, loading } = useAuth()

  return (
    <main
      data-testid="app-root"
      data-e2e={e2e ? '1' : undefined}
      className="mx-auto max-w-2xl p-6"
    >
      <h1 className="mb-1 font-display text-2xl font-bold text-fg">{greet('Coach')}</h1>
      <p className="mb-6 text-sm text-fg-muted">
        Emerald Pro design system — packages/ui
      </p>

      {loading ? (
        <p className="text-sm text-fg-muted" data-testid="auth-role">
          Role: …
        </p>
      ) : role ? (
        <SignedIn />
      ) : (
        <LoginChooser />
      )}

      <div className="mt-6">
        <Card title="Design system check" icon="🏸">
          <div className="space-y-4">
            <Field label="Nickname" placeholder="SmashKing" />
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
