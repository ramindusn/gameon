import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@gameon/ui'
import { getPlayer } from '../roster/api'

// Public, read-only player profile (E02 / TASK-3.3). Anyone can view it without
// logging in. Performance + match history fill in once matches/ranking land
// (E04/E05); for now they show empty states.
export function PlayerProfilePage() {
  const { id = '' } = useParams()
  const {
    data: player,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['player', id],
    queryFn: () => getPlayer(id),
  })

  return (
    <div
      className="flex min-h-screen flex-col bg-bg text-fg"
      data-testid="player-profile"
    >
      <header className="border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-lg font-bold text-accent-strong">
            BadmintonDuo
          </Link>
          <Link to="/" className="text-sm text-fg-muted hover:text-fg">
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        {isLoading && <p className="text-sm text-fg-muted">Loading…</p>}
        {(isError || (!isLoading && !player)) && (
          <p className="text-sm text-fg-muted" data-testid="player-not-found">
            Player not found.
          </p>
        )}

        {player && (
          <>
            <div className="mb-8 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 text-2xl">
                🏸
              </div>
              <div>
                <h1
                  className="font-display text-2xl font-bold"
                  data-testid="profile-name"
                >
                  {player.nickname}
                </h1>
                <p className="text-sm text-fg-muted">
                  Skill {player.skill ?? '—'}
                  {player.isMatchmaker ? ' · Matchmaker' : ''}
                  {player.absent ? ' · Absent' : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card title="Performance" icon="📊">
                <p className="text-sm text-fg-muted">
                  Wins, losses and rating appear once matches are recorded.
                </p>
              </Card>
              <div className="lg:col-span-2">
                <Card title="Match history" icon="🏸">
                  <p
                    className="text-sm text-fg-muted"
                    data-testid="profile-history-empty"
                  >
                    No matches played yet.
                  </p>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
