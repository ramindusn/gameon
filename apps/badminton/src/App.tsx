import { Hello } from '@gameon/ui'
import { greet } from '@gameon/domain'
import { SUPABASE_CONFIGURED } from '@gameon/supabase'

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>{greet('Coach')}</h1>
      <p>Monorepo scaffold is wired:</p>
      <ul>
        <li>
          <Hello />
        </li>
        <li>@gameon/domain ✔</li>
        <li>@gameon/supabase configured: {String(SUPABASE_CONFIGURED)}</li>
      </ul>
    </main>
  )
}
