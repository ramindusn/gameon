import { Hello } from '@gameon/ui'
import { greet } from '@gameon/domain'
import { isSupabaseConfigured } from '@gameon/supabase'

// E2E builds run with VITE_E2E=1; auth (E01) will use this to bypass real sign-in.
const e2e = import.meta.env.VITE_E2E === '1'

export function App() {
  return (
    <main
      data-testid="app-root"
      data-e2e={e2e ? '1' : undefined}
      style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}
    >
      <h1>{greet('Coach')}</h1>
      <p>Monorepo scaffold is wired:</p>
      <ul>
        <li>
          <Hello />
        </li>
        <li>@gameon/domain ✔</li>
        <li>@gameon/supabase configured: {String(isSupabaseConfigured)}</li>
      </ul>
    </main>
  )
}
