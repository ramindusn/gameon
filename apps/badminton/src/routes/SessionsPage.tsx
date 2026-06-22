import { Link } from 'react-router-dom'
import { Card } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { useSessions } from '../play/useMatchPlay'
import { formatPlayedAt } from '../play/datetime'

// Game-day history (E04 / E09). Lists past + live game days, newest game-day
// date first; each links to the scoring view at /play/:id.
export function SessionsPage() {
  const { data: sessions, isLoading, isError } = useSessions()

  return (
    <AppShell title="Game days">
      <div data-testid="sessions">
        <Card title="History" icon="📋">
          {isLoading && <p className="text-sm text-fg-muted">Loading game days…</p>}
          {isError && (
            <p className="text-sm text-negative">Could not load game days.</p>
          )}
          {!isLoading && (sessions?.length ?? 0) === 0 && (
            <p className="text-sm text-fg-muted">
              No game days yet — generate a draw and create one.
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
                        {formatPlayedAt(s.playedAt)}
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
