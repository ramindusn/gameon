import { Link } from 'react-router-dom'
import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, cx } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { Icon } from '../app/Icon'
import { useSessionPlayerCounts, useSessions } from '../play/useMatchPlay'
import { formatPlayedAt } from '../play/datetime'
import { MyStock } from '../fund/MyStock'
import { useStockContext } from '../fund/GameDayUsage'
import { loadSessionsWithUsage, loadUsageBySession } from '../fund/usageApi'

/** Game days per page in the history card. */
const HISTORY_PAGE_SIZE = 10
const PENDING_LIMIT = 5

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
        <ShuttlesToRecord />
        {/* The barrels this matchmaker is keeping. Sits with the two cards it
            relates to — what is on now and what still needs recording — rather
            than below the history, which pushed it off the first screen. */}
        <MyStock />
        <RecentGameDays />
      </div>
    </AppShell>
  )
}

/**
 * Game days that finished without their shuttle usage recorded (TASK-76.5).
 *
 * There was no route from here to recording usage at all: the matchmaker had to
 * remember which day was outstanding, find it under Game Days, and open it. The
 * days that need them are now on the first screen after signing in, each a
 * single tap from the form.
 */
function ShuttlesToRecord() {
  const { data: ctx } = useStockContext()
  const { data: sessions } = useSessions()
  const { data: answered } = useQuery({
    queryKey: ['sessions-with-usage'],
    queryFn: loadSessionsWithUsage,
  })

  const pending = useMemo(() => {
    const done = new Set(answered ?? [])
    return (sessions ?? [])
      .filter((s) => s.kind === 'casual' && s.status === 'finished' && !done.has(s.id))
      .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
      .slice(0, PENDING_LIMIT)
  }, [sessions, answered])

  // Only people who can actually record it — a matchmaker holding stock, or an
  // admin. Nothing outstanding means no card rather than an empty one.
  if (!ctx || !(ctx.myHolderId || ctx.isAdmin)) return null
  if (pending.length === 0) return null

  return (
    <Card title="Shuttles to record" icon={<Icon name="shuttle" />}>
      <ul className="space-y-2" data-testid="shuttles-to-record">
        {pending.map((s) => (
          <li key={s.id}>
            <Link
              to={`/game-days/${s.id}`}
              data-testid={`record-usage-${s.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2 transition-colors hover:bg-line"
            >
              <span className="min-w-0 truncate font-medium text-fg">
                {formatPlayedAt(s.playedAt)}
              </span>
              <span className="shrink-0 text-sm font-medium text-accent-strong">
                Record →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
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
  // One query for every day's usage, not one per row (see loadUsageBySession).
  const { data: usage } = useQuery({
    queryKey: ['usage-by-session'],
    queryFn: loadUsageBySession,
  })
  const [page, setPage] = useState(0)
  const finished = useMemo(() => (data ?? []).filter((s) => s.status === 'finished'), [data])
  const pageCount = Math.max(1, Math.ceil(finished.length / HISTORY_PAGE_SIZE))
  // Clamped rather than stored blindly: a day finishing while you sit on the
  // last page would otherwise leave you looking at an empty list.
  const current = Math.min(page, pageCount - 1)
  const start = current * HISTORY_PAGE_SIZE
  const recent = finished.slice(start, start + HISTORY_PAGE_SIZE)
  return (
    <Card title="Game day history" icon={<Icon name="schedule" />}>
      {isLoading && <p className="text-sm text-fg-muted">Loading game days…</p>}
      {isError && <p className="text-sm text-negative">Could not load game days.</p>}
      {!isLoading && !isError && recent.length === 0 && (
        <p className="text-sm text-fg-muted">No finished game days yet.</p>
      )}
      {recent.length > 0 && (
        <>
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
                  {/* What the day cost in shuttles. Absent when nothing was
                      recorded — the "Shuttles to record" card above already
                      chases those, so a placeholder here would just repeat it. */}
                  {usage?.[s.id]?.length ? (
                    <span
                      className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle"
                      data-testid={`recent-usage-${s.id}`}
                    >
                      <Icon name="shuttle" className="h-3.5 w-3.5 shrink-0" />
                      {usage[s.id].map((u) => `${u.shuttles} ${u.brand}`).join(' · ')}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
          </ul>
          {/* Only when there is somewhere to go. A club with one page of
              history needs no controls, and an always-present pager reads
              like something is missing. */}
          {pageCount > 1 && (
            <div
              className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3"
              data-testid="history-pager"
            >
              <button
                type="button"
                onClick={() => setPage(current - 1)}
                disabled={current === 0}
                className={PAGER_BTN}
                data-testid="history-prev"
              >
                ‹ Newer
              </button>
              <span className="text-xs tabular-nums text-fg-subtle">
                {start + 1}–{start + recent.length} of {finished.length}
              </span>
              <button
                type="button"
                onClick={() => setPage(current + 1)}
                disabled={current >= pageCount - 1}
                className={PAGER_BTN}
                data-testid="history-next"
              >
                Older ›
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

const PAGER_BTN =
  'rounded-full px-3 py-1 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent/15 disabled:text-fg-subtle disabled:opacity-40 disabled:hover:bg-transparent'
