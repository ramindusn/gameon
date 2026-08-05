import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Card, cx } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { Icon } from '../app/Icon'
import { useSessionPlayerCounts, useSessions } from '../play/useMatchPlay'
import { formatPlayedAt } from '../play/datetime'
import { MyStock } from '../fund/MyStock'

const RECENT_LIMIT = 20

// Matchmaker landing (E10 / TASK-11.1). The first screen after a matchmaker
// signs in: resume any live game day (with the active player count) and review
// recent game days.
export function MatchmakerHome() {
  return (
    <AppShell title="Matchmaker">
      <div
        className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start"
        data-testid="matchmaker-home"
      >
        <LiveNow />
        <RecentGameDays />
        {/* The barrels this matchmaker is keeping (renders nothing if none). */}
        <MyStock />
      </div>
    </AppShell>
  )
}

/** A Link styled to read as a button (Button is a plain <button>). */
function LinkButton({
  to,
  variant = 'primary',
  children,
  ...rest
}: {
  to: string
  variant?: 'primary' | 'secondary'
  children: ReactNode
  'data-testid'?: string
}) {
  return (
    <Link
      to={to}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-bg',
        variant === 'primary'
          ? 'bg-accent text-neutral-950 hover:bg-accent-strong focus:ring-accent'
          : 'bg-surface-muted text-fg hover:bg-line focus:ring-line',
      )}
      {...rest}
    >
      {children}
    </Link>
  )
}

// ---- Live now -------------------------------------------------------------

function LiveNow() {
  const { data, isLoading, isError } = useSessions()
  const live = (data ?? []).filter((s) => s.status === 'live')
  const { data: playerCounts } = useSessionPlayerCounts(live.map((s) => s.id))
  return (
    <Card title="Live now" icon={<Icon name="live" className="text-positive" />}>
      {isLoading && <p className="text-sm text-fg-muted">Loading game days…</p>}
      {isError && <p className="text-sm text-negative">Could not load game days.</p>}
      {!isLoading && !isError && live.length === 0 && (
        <div data-testid="live-empty">
          <p className="mb-3 text-sm text-fg-muted">
            No game day in progress. Generate a draw to start one.
          </p>
          <LinkButton to="/generate" data-testid="live-empty-generate">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="generate" className="h-4 w-4" />
              Generate a draw
            </span>
          </LinkButton>
        </div>
      )}
      {live.length > 0 && (
        <ul className="divide-y divide-line" data-testid="live-list">
          {live.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 py-3"
              data-testid={`live-${s.id}`}
            >
              <span className="flex flex-col">
                <span className="flex items-center gap-2 font-medium text-fg">
                  {formatPlayedAt(s.playedAt)}
                  {s.kind === 'tournament' && <TournamentTag />}
                </span>
                <span className="text-xs text-fg-muted" data-testid={`live-active-${s.id}`}>
                  {s.kind === 'tournament' ? (
                    'Fixed-pairs tournament'
                  ) : (
                    <>
                      {s.rounds} rounds
                      {playerCounts?.[s.id] != null && (
                        <>
                          {' '}
                          · {playerCounts[s.id]} player
                          {playerCounts[s.id] === 1 ? '' : 's'}
                        </>
                      )}
                    </>
                  )}
                </span>
              </span>
              <LinkButton to={`/game-days/${s.id}`} data-testid={`resume-${s.id}`}>
                Resume
              </LinkButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function TournamentTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-strong">
      <Icon name="trophy" className="h-3 w-3" />
      Tournament
    </span>
  )
}

// ---- Recent game days -----------------------------------------------------

function RecentGameDays() {
  const { data, isLoading, isError } = useSessions()
  const recent = (data ?? []).filter((s) => s.status === 'finished').slice(0, RECENT_LIMIT)
  return (
    <Card title="Game day history" icon={<Icon name="schedule" />}>
      {isLoading && <p className="text-sm text-fg-muted">Loading game days…</p>}
      {isError && <p className="text-sm text-negative">Could not load game days.</p>}
      {!isLoading && !isError && recent.length === 0 && (
        <p className="text-sm text-fg-muted">No finished game days yet.</p>
      )}
      {recent.length > 0 && (
        <ul className="divide-y divide-line" data-testid="recent-list">
          {recent.map((s) => (
            <li key={s.id}>
              <Link
                to={`/game-days/${s.id}`}
                className="flex items-center justify-between gap-3 py-3 text-sm hover:text-accent-strong"
                data-testid={`recent-${s.id}`}
              >
                <span className="flex flex-col">
                  <span className="flex items-center gap-2 font-medium text-fg">
                    {formatPlayedAt(s.playedAt)}
                    {s.kind === 'tournament' && <TournamentTag />}
                  </span>
                  <span className="text-xs text-fg-muted">
                    {s.kind === 'tournament'
                      ? 'Fixed-pairs tournament'
                      : `${s.mode === 'mixed' ? 'Mixed doubles' : 'Doubles'} · ${s.rounds} rounds`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
