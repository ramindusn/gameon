import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Card, cx } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { useSessions } from '../play/useMatchPlay'
import { useRoster } from '../roster/useRoster'
import { formatPlayedAt } from '../play/datetime'

const RECENT_LIMIT = 5

// Matchmaker landing (E10 / TASK-11.1). The first screen after a matchmaker
// signs in: resume any live game day, jump into a new draw or the roster, see
// attendance at a glance, and review recent game days.
export function MatchmakerHome() {
  return (
    <AppShell title="Matchmaker">
      <div className="space-y-6" data-testid="matchmaker-home">
        <QuickActions />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LiveNow />
          <RosterSnapshot />
        </div>
        <RecentGameDays />
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

// ---- Quick actions --------------------------------------------------------

function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3" data-testid="quick-actions">
      <LinkButton to="/generate" data-testid="action-generate">
        🎲 New draw
      </LinkButton>
      <LinkButton to="/players" variant="secondary" data-testid="action-players">
        👥 Manage players
      </LinkButton>
    </div>
  )
}

// ---- Live now -------------------------------------------------------------

function LiveNow() {
  const { data, isLoading, isError } = useSessions()
  const live = (data ?? []).filter((s) => s.status === 'live')
  return (
    <Card title="Live now" icon="🟢">
      {isLoading && <p className="text-sm text-fg-muted">Loading game days…</p>}
      {isError && <p className="text-sm text-negative">Could not load game days.</p>}
      {!isLoading && !isError && live.length === 0 && (
        <div data-testid="live-empty">
          <p className="mb-3 text-sm text-fg-muted">
            No game day in progress. Generate a draw to start one.
          </p>
          <LinkButton to="/generate" data-testid="live-empty-generate">
            🎲 Generate a draw
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
                <span className="font-medium text-fg">{formatPlayedAt(s.playedAt)}</span>
                <span className="text-xs text-fg-muted">{s.rounds} rounds</span>
              </span>
              <LinkButton to={`/play/${s.id}`} data-testid={`resume-${s.id}`}>
                Resume
              </LinkButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ---- Roster snapshot ------------------------------------------------------

function RosterSnapshot() {
  const { data, isLoading, isError } = useRoster()
  const players = data?.players ?? []
  const total = players.length
  const present = players.filter((p) => !p.absent).length
  const absent = total - present
  return (
    <Card
      title="Roster"
      icon="📋"
      action={
        <Link to="/players" className="text-sm text-accent-strong hover:underline">
          Manage
        </Link>
      }
    >
      {isLoading && <p className="text-sm text-fg-muted">Loading roster…</p>}
      {isError && <p className="text-sm text-negative">Could not load roster.</p>}
      {!isLoading && !isError && total === 0 && (
        <p className="text-sm text-fg-muted">
          No players yet — add some on the Players page.
        </p>
      )}
      {!isLoading && !isError && total > 0 && (
        <div className="flex items-end gap-6" data-testid="roster-snapshot">
          <Stat label="Present" value={present} tone="accent" />
          <Stat label="Absent" value={absent} />
          <Stat label="Total" value={total} />
        </div>
      )}
    </Card>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'accent'
}) {
  return (
    <div>
      <p
        className={cx(
          'font-display text-3xl font-bold',
          tone === 'accent' ? 'text-accent-strong' : 'text-fg',
        )}
      >
        {value}
      </p>
      <p className="text-xs uppercase tracking-wide text-fg-muted">{label}</p>
    </div>
  )
}

// ---- Recent game days -----------------------------------------------------

function RecentGameDays() {
  const { data, isLoading, isError } = useSessions()
  const recent = (data ?? []).filter((s) => s.status === 'finished').slice(0, RECENT_LIMIT)
  return (
    <Card
      title="Recent game days"
      icon="🗓️"
      action={
        <Link to="/play" className="text-sm text-accent-strong hover:underline">
          View all
        </Link>
      }
    >
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
                to={`/play/${s.id}`}
                className="flex items-center justify-between gap-3 py-3 text-sm hover:text-accent-strong"
                data-testid={`recent-${s.id}`}
              >
                <span className="font-medium text-fg">{formatPlayedAt(s.playedAt)}</span>
                <span className="text-xs text-fg-subtle">{s.rounds} rounds</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
