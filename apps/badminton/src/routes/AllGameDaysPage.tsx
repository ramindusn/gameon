import { Link } from 'react-router-dom'
import { Card, cx, SkeletonCard } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { Icon } from '../app/Icon'
import { useSessions } from '../play/useMatchPlay'
import { formatPlayedAt } from '../play/datetime'
import type { MatchSession } from '../play/api'
import { POINTS_PILL, POINTS_TEXT } from '../ranking/metricColors'

// All game days for matchmakers/admins (TASK-38). Lists every game day (incl.
// ones hidden from the public home) and links each to its /game-days/:id scores
// + rank page.
export function AllGameDaysPage() {
  const { data, isLoading, isError } = useSessions()
  const sessions = data ?? []

  return (
    <AppShell title="Game Days">
      <div data-testid="all-game-days">
        <Card title="All game days" icon={<Icon name="schedule" />} iconTone={POINTS_TEXT}>
          {isLoading && <SkeletonCard rows={5} />}
          {isError && (
            <p className="text-sm text-negative">Could not load game days.</p>
          )}
          {!isLoading && !isError && sessions.length === 0 && (
            <p className="text-sm text-fg-muted">No game days yet.</p>
          )}
          {sessions.length > 0 && (
            <ul className="divide-y divide-line" data-testid="all-game-days-list">
              {sessions.map((s) => (
                <GameDayRow key={s.id} session={s} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  )
}

function GameDayRow({ session: s }: { session: MatchSession }) {
  const kindLabel =
    s.kind === 'tournament'
      ? 'Fixed-pairs tournament'
      : `${s.mode === 'mixed' ? 'Mixed doubles' : 'Doubles'} · ${s.rounds} rounds`
  return (
    <li>
      <Link
        to={`/game-days/${s.id}`}
        className="flex items-center justify-between gap-3 py-3 hover:text-sky-400"
        data-testid={`game-day-${s.id}`}
      >
        <span className="flex min-w-0 flex-col">
          <span className="font-medium text-fg">{formatPlayedAt(s.playedAt)}</span>
          {/* Who started it. Everything before TASK-86 has no name recorded,
              and there is no trail to recover one from, so those fall back to
              the role rather than to a blank or a fabricated person. */}
          <span className="truncate text-xs text-fg-muted">
            {kindLabel} · {s.createdByName ?? 'Matchmaker'}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {s.hidden && (
            <span
              className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted"
              data-testid={`hidden-tag-${s.id}`}
            >
              Off home
            </span>
          )}
          <span
            className={cx(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              s.status === 'live' ? POINTS_PILL : 'bg-surface-muted text-fg-muted',
            )}
          >
            {s.status === 'live' ? 'Live' : 'Finished'}
          </span>
          <span aria-hidden className="text-fg-subtle">
            →
          </span>
        </span>
      </Link>
    </li>
  )
}
