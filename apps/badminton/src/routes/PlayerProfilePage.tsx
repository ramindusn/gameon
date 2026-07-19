import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, cx } from '@gameon/ui'
import { Icon } from '../app/Icon'
import { getPlayer } from '../roster/api'
import { loadPlayerHistory, type PlayerMatch } from '../play/api'
import {
  usePlayerBoard,
  usePlayerNames,
  useRatingHistory,
  useRecentForm,
} from '../ranking/useRanking'
import { FormStrip } from '../ranking/Leaderboard'
import { effectiveSkill } from '../ranking/effectiveSkill'
import { POINTS_TEXT } from '../ranking/metricColors'
import { PerformanceChart } from '../profile/PerformanceChart'

// Public, read-only player profile (E02/E08, TASK-3.3 + 9.3). Anyone can view it
// without logging in: rating + record + recent form, and full match history.
export function PlayerProfilePage() {
  const { id = '' } = useParams()
  const { data: player, isLoading, isError } = useQuery({
    queryKey: ['player', id],
    queryFn: () => getPlayer(id),
  })
  const { data: history = [] } = useQuery({
    queryKey: ['player-history', id],
    queryFn: () => loadPlayerHistory(id),
    enabled: !!id,
  })
  const board = usePlayerBoard()
  const form = useRecentForm()
  const nameOf = usePlayerNames()

  const rated = board.data?.find((p) => p.playerId === id)
  const wins = history.filter((m) => m.won).length
  const losses = history.length - wins
  // Live, results-aware skill (manual seed blended with rating); the manual value
  // stays the reference (TASK-44).
  const liveSkill = player
    ? effectiveSkill(player.skill, rated?.rating, rated?.games ?? history.length)
    : null
  // "Improving" = recently winning more than losing (motivating up-signal only).
  const recentForm = form.data?.[id] ?? []
  const recentWins = recentForm.filter((r) => r === 'W').length
  const recentLosses = recentForm.filter((r) => r === 'L').length
  const improving = recentForm.length >= 3 && recentWins > recentLosses

  // Leaderboard context: rating-over-time + current rank and movement (TASK-55).
  const ratingCtx = useRatingHistory(id)
  const rank = ratingCtx.data?.rank ?? null
  const rankMove =
    rank != null && ratingCtx.data?.prevRank != null ? ratingCtx.data.prevRank - rank : null

  // Match history grouped by game day, newest first (history arrives sorted).
  const days = useMemo(() => {
    const map = new Map<string, PlayerMatch[]>()
    for (const m of history) {
      ;(map.get(m.sessionId) ?? map.set(m.sessionId, []).get(m.sessionId)!).push(m)
    }
    return [...map.entries()].map(([sessionId, matches]) => {
      const dayWins = matches.filter((m) => m.won).length
      const diff = matches.reduce((s, m) => s + (m.scoreFor - m.scoreAgainst), 0)
      return { sessionId, date: matches[0].date, matches, wins: dayWins, losses: matches.length - dayWins, diff }
    })
  }, [history])

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg" data-testid="player-profile">
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
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 font-display text-2xl font-bold text-accent-strong">
                {player.nickname.trim().charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold" data-testid="profile-name">
                    {player.nickname}
                  </h1>
                  {improving && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent-strong"
                      title="Winning more than losing lately — keep it up!"
                      data-testid="improving-badge"
                    >
                      <svg
                        aria-hidden
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5"
                      >
                        <polyline points="3 17 9 11 13 15 21 7" />
                        <polyline points="16 7 21 7 21 12" />
                      </svg>
                      Improving
                    </span>
                  )}
                  {rank != null && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-fg"
                      title="Leaderboard rank (movement vs the previous game day)"
                      data-testid="rank-chip"
                    >
                      #{rank}
                      {rankMove != null && rankMove !== 0 && (
                        <span className={rankMove > 0 ? 'text-accent-strong' : 'text-negative'}>
                          {rankMove > 0 ? '▲' : '▼'}
                          {Math.abs(rankMove)}
                        </span>
                      )}
                    </span>
                  )}
                  {rank == null && ratingCtx.data?.provisional && history.length > 0 && (
                    <span
                      className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted"
                      title="Rating still settling — keep playing to enter the leaderboard"
                      data-testid="provisional-chip"
                    >
                      Provisional
                    </span>
                  )}
                </div>
                <p className="text-sm text-fg-muted">
                  {/* Public sees the live (results-aware) skill; base is staff-only. */}
                  Skill {liveSkill != null ? liveSkill.toFixed(1) : '—'}
                  {player.isMatchmaker ? ' · Matchmaker' : ''}
                  {player.absent ? ' · Absent' : ''}
                </p>
              </div>
            </div>

            {history.length >= 2 && (
              <div className="mb-6">
                <Card title="Performance trend" icon={<Icon name="ranking" />}>
                  <PerformanceChart matches={history} ratingHistory={ratingCtx.data?.points} />
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card title="Performance" icon={<Icon name="stats" />}>
                <dl className="space-y-3 text-sm" data-testid="profile-performance">
                  <Stat label="Rating" value={rated ? String(Math.round(rated.rating)) : '—'} />
                  {/* Base skill is a manual matchmaking seed — never shown here;
                      everyone sees the live (results-aware) skill only. */}
                  <Stat label="Skill" value={liveSkill != null ? liveSkill.toFixed(1) : '—'} />
                  <Stat label="Record" value={`${wins}W – ${losses}L`} />
                  <Stat label="Games" value={String(history.length)} />
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-fg-muted">Recent form</dt>
                    <dd>
                      <FormStrip results={form.data?.[id]} />
                    </dd>
                  </div>
                </dl>
              </Card>

              <div className="lg:col-span-2">
                <Card title="Match history" icon={<Icon name="matches" />}>
                  {history.length === 0 ? (
                    <p className="text-sm text-fg-muted" data-testid="profile-history-empty">
                      No matches played yet.
                    </p>
                  ) : (
                    <div className="space-y-5" data-testid="profile-history">
                      {days.map((day) => (
                        <div key={day.sessionId} data-testid={`history-day-${day.sessionId}`}>
                          <div className="mb-2 flex items-baseline justify-between gap-3">
                            <Link
                              to={`/game-days/${day.sessionId}`}
                              className="text-xs font-semibold uppercase tracking-wide text-fg-subtle hover:text-accent-strong hover:underline"
                            >
                              {formatDay(day.date)}
                            </Link>
                            <span className="text-xs tabular-nums">
                              <span className="text-fg-muted">
                                {day.wins}–{day.losses}
                              </span>{' '}
                              <span className={cx('font-semibold', POINTS_TEXT)}>
                                {day.diff > 0 ? `+${day.diff}` : day.diff}
                              </span>
                            </span>
                          </div>
                          <ul className="space-y-2">
                            {day.matches.map((m) => (
                              <HistoryRow key={m.id} m={m} nameOf={nameOf} />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-semibold text-fg">{value}</dd>
    </div>
  )
}

function HistoryRow({
  m,
  nameOf,
}: {
  m: PlayerMatch
  nameOf: (id: string | null) => string
}) {
  // The date lives on the game-day group header, so rows stay one line.
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm">
      <span
        className={cx(
          'grid h-6 w-6 shrink-0 place-items-center rounded text-xs font-bold',
          m.won ? 'bg-accent/15 text-accent-strong' : 'bg-negative/15 text-negative',
        )}
      >
        {m.won ? 'W' : 'L'}
      </span>
      <div className="min-w-0 flex-1 truncate text-fg">
        with <span className="font-medium">{nameOf(m.partnerId)}</span> vs{' '}
        <span className="font-medium">{nameOf(m.opponentIds[0])}</span> &amp;{' '}
        <span className="font-medium">{nameOf(m.opponentIds[1])}</span>
      </div>
      <span className="shrink-0 font-semibold tabular-nums text-fg">
        {m.scoreFor}–{m.scoreAgainst}
      </span>
    </li>
  )
}

/** "Wed, 8 Jul 2026" — the game-day group header label. */
function formatDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
