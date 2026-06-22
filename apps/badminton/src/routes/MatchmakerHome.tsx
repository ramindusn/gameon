import { Card } from '@gameon/ui'
import { AppShell } from '../app/AppShell'

// Placeholder matchmaker landing — the real generate/players/play areas are
// built in E02/E03/E04. Kept minimal so role-based routing is exercised now.
export function MatchmakerHome() {
  return (
    <AppShell title="Matchmaker">
      <div data-testid="matchmaker-home">
        <Card title="Welcome, Matchmaker" icon="🏸">
          <p className="text-sm text-fg-muted">
            Generate draws and manage players — these tools arrive in the next epics
            (E02/E03).
          </p>
        </Card>
      </div>
    </AppShell>
  )
}
