import { Card, Button, Field } from '@gameon/ui'
import { greet } from '@gameon/domain'
import { isSupabaseConfigured } from '@gameon/supabase'

// E2E builds run with VITE_E2E=1; auth (E01) will use this to bypass real sign-in.
const e2e = import.meta.env.VITE_E2E === '1'

export function App() {
  return (
    <main
      data-testid="app-root"
      data-e2e={e2e ? '1' : undefined}
      className="mx-auto max-w-2xl p-6"
    >
      <h1 className="mb-1 font-display text-2xl font-bold text-fg">{greet('Coach')}</h1>
      <p className="mb-6 text-sm text-fg-muted">Emerald Pro design system — packages/ui</p>

      <Card title="Design system check" icon="🏸">
        <div className="space-y-4">
          <Field label="Nickname" placeholder="SmashKing" />
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <p className="text-xs text-fg-muted">
            Supabase configured: {String(isSupabaseConfigured)}
          </p>
        </div>
      </Card>
    </main>
  )
}
