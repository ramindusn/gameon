import { Link } from 'react-router-dom'
import { Card } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { useSessions } from '../play/useMatchPlay'

// Session history (E04 / TASK-5.3). Lists past + live sessions; each links to
// the scoring view at /play/:id.
export function SessionsPage() {
  const { data: sessions, isLoading, isError } = useSessions()

  return (
    <AppShell title="Sessions">
      <div data-testid="sessions">
        <Card title="History" icon="📋">
          {isLoading && <p className="text-sm text-fg-muted">Loading sessions…</p>}
          {isError && (
            <p className="text-sm text-negative">Could not load sessions.</p>
          )}
          {!isLoading && (sessions?.length ?? 0) === 0 && (
            <p className="text-sm text-fg-muted">
              No sessions yet — generate a draw and start one.
            </p>
          )}

          {(sessions?.length ?? 0) > 0 && (
            <ul className="divide-y divide-line">
              {sessions!.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/play/${s.id}`}
                    className="flex items-center justify-between gap-3 py-3 text-sm hover:text-accent-strong"
                    data-testid={`session-${s.id}`}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium text-fg">
                        {formatDate(s.createdAt)}
                      </span>
                      <span className="text-xs text-fg-muted">
                        {s.mode === 'mixed' ? 'Mixed doubles' : 'Doubles'} ·{' '}
                        {s.rounds} rounds
                      </span>
                    </span>
                    <span
                      className={
                        s.status === 'live'
                          ? 'text-xs font-medium text-accent-strong'
                          : 'text-xs text-fg-subtle'
                      }
                    >
                      {s.status === 'live' ? 'Live' : 'Finished'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
}
