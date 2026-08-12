import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, cx } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { Icon } from '../app/Icon'
import { loadPlayerHistory } from '../play/api'
import { usePairBoard, usePairRatingHistory, usePlayerNames } from '../ranking/useRanking'
import { pairKey } from '../ranking/api'
import { POINTS_TEXT, RANK_TEXT } from '../ranking/metricColors'
import { PerformanceChart } from '../profile/PerformanceChart'
import { computeOpponentPairs } from '../profile/headToHead'
import { BigStat, HistoryRow, formatDay } from './PlayerProfilePage'

/** Below this many games together, a partnership's rating is noise. */
const MIN_RATED_GAMES = 5
/** How many opposing pairs the head-to-head list shows. */
const H2H_LIMIT = 8
/** How many recent game days the match history shows before "Show all". */
const HISTORY_PREVIEW_DAYS = 3

/**
 * Public profile for a doubles partnership (TASK-90).
 *
 * A pair is rated in its own right — the Doubles board ranks partnerships, not
 * people — but until now there was nowhere to look one up. This mirrors the
 * player profile so the two read as the same app.
 *
 * The URL carries both player ids. pairKey sorts them, so /pairs/a/b and
 * /pairs/b/a are the same partnership rather than two half-empty pages.
 */
export function PairProfilePage() {
  const { a = '', b = '' } = useParams()
  const nameOf = usePlayerNames()
  const board = usePairBoard()
  const trend = usePairRatingHistory(a, b)

  // One player's history filtered to the matches they played WITH the other.
  // Cheaper than a new query, and it is the same data either way.
  const { data: allMatches = [], isLoading } = useQuery({
    queryKey: ['player-history', a],
    queryFn: () => loadPlayerHistory(a),
    enabled: !!a,
  })
  const matches = useMemo(
    () => allMatches.filter((m) => m.partnerId === b),
    [allMatches, b],
  )

  const rated = board.data?.find(
    (p) => pairKey(p.player1Id, p.player2Id) === pairKey(a, b),
  )
  const wins = matches.filter((m) => m.won).length
  const losses = matches.length - wins
  const diff = matches.reduce((s, m) => s + (m.scoreFor - m.scoreAgainst), 0)
  const winRate = matches.length ? Math.round((wins / matches.length) * 100) : null
  // Few games means the rating has not settled; showing a number there invites
  // people to read a rank into two lucky matches.
  const provisional = matches.length < MIN_RATED_GAMES

  // Every opposing partnership they have met, most-played first.
  const rivalPairs = useMemo(
    () => computeOpponentPairs(matches).slice(0, H2H_LIMIT),
    [matches],
  )

  // Grouped by game day, newest first, with that day's record and points —
  // the same shape the player profile's history uses.
  const days = useMemo(() => {
    const map = new Map<string, typeof matches>()
    for (const m of matches) {
      ;(map.get(m.sessionId) ?? map.set(m.sessionId, []).get(m.sessionId)!).push(m)
    }
    return [...map.entries()]
      .map(([sessionId, ms]) => {
        const wins = ms.filter((m) => m.won).length
        const diff = ms.reduce((t, m) => t + (m.scoreFor - m.scoreAgainst), 0)
        return { sessionId, date: ms[0].date, matches: ms, wins, losses: ms.length - wins, diff }
      })
      .sort((x, y) => y.date.localeCompare(x.date))
  }, [matches])

  // Long partnerships: show the most recent game days, reveal the rest on
  // demand. 42 matches in one list is a lot of scrolling past.
  const [showAllHistory, setShowAllHistory] = useState(false)
  const visibleDays = showAllHistory ? days : days.slice(0, HISTORY_PREVIEW_DAYS)

  const title = `${nameOf(a)} & ${nameOf(b)}`
  const initials =
    (nameOf(a).trim().charAt(0) + nameOf(b).trim().charAt(0)).toUpperCase() || '??'
  const rankMove =
    trend.data?.rank != null && trend.data?.prevRank != null
      ? trend.data.prevRank - trend.data.rank
      : null

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl" data-testid="pair-profile">
        {/* Mirrors the player profile's header — two initials instead of one,
            because the subject is the partnership. */}
        <div className="mb-8 flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent/15 font-display text-xl font-bold text-accent-strong">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold" data-testid="pair-name">
                {title}
              </h1>
              {trend.data?.rank != null && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-fg"
                  title="Doubles rank (movement vs the previous game day)"
                  data-testid="pair-rank-chip"
                >
                  #{trend.data.rank}
                  {rankMove != null && rankMove !== 0 && (
                    <span className={rankMove > 0 ? 'text-accent-strong' : 'text-negative'}>
                      {rankMove > 0 ? '▲' : '▼'}
                      {Math.abs(rankMove)}
                    </span>
                  )}
                </span>
              )}
              {provisional && matches.length > 0 && (
                <span
                  className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted"
                  title="Rating still settling — keep playing together"
                  data-testid="pair-provisional-chip"
                >
                  Provisional
                </span>
              )}
            </div>
            <p className="text-sm text-fg-muted">
              <Link to={`/players/${a}`} className="hover:text-accent-strong hover:underline">
                {nameOf(a)}
              </Link>
              {' · '}
              <Link to={`/players/${b}`} className="hover:text-accent-strong hover:underline">
                {nameOf(b)}
              </Link>
            </p>
          </div>
        </div>

        {isLoading && <p className="text-sm text-fg-muted">Loading…</p>}

        {!isLoading && matches.length === 0 && (
          <Card title="Never partnered" icon={<Icon name="pairs" />}>
            <p className="text-sm text-fg-muted" data-testid="pair-empty">
              {nameOf(a)} and {nameOf(b)} have not played a match together yet.
            </p>
          </Card>
        )}

        {matches.length > 0 && (
          <>
            <div className="mb-6">
              <Card title="Together" icon={<Icon name="stats" />}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="pair-stats">
                  <BigStat
                    label="Rating"
                    value={
                      provisional || !rated ? 'Provisional' : String(Math.round(rated.rating))
                    }
                    tone={provisional || !rated ? undefined : RANK_TEXT}
                  />
                  <BigStat
                    label="Doubles rank"
                    value={trend.data?.rank != null ? `#${trend.data.rank}` : '—'}
                  />
                  <BigStat label="Record" value={`${wins}W – ${losses}L`} />
                  <BigStat label="Win rate" value={winRate != null ? `${winRate}%` : '—'} />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
                  <span className="text-fg-muted">Points won vs lost</span>
                  <span className="font-semibold tabular-nums text-fg" data-testid="pair-diff">
                    {diff > 0 ? `+${diff}` : diff}
                  </span>
                </div>
                {provisional && (
                  <p className="mt-2 text-xs text-fg-subtle" data-testid="pair-provisional">
                    Ratings settle after about {MIN_RATED_GAMES} games together — this pair has
                    played {matches.length}.
                  </p>
                )}
              </Card>
            </div>

            {matches.length >= 2 && (
              <div className="mb-6">
                <Card title="Rating trend" icon={<Icon name="ranking" />}>
                  {/* Only the days they partnered appear; a day one of them
                      played with somebody else is not this pair's story. */}
                  <PerformanceChart matches={matches} ratingHistory={trend.data?.points} />
                </Card>
              </div>
            )}

            {rivalPairs.length > 0 && (
              <div className="mb-6">
                <Card title="Head to head" icon={<Icon name="pairs" />}>
                  {/* Against opposing PAIRS, not individuals. A per-person list
                      splits one rivalry into two halves and counts every match
                      twice, which on a partnership's own page is the wrong
                      question — "how do we do against them" is. */}
                  <ul className="divide-y divide-line" data-testid="pair-h2h">
                    {rivalPairs.map((r) => {
                      const losses = r.games - r.wins
                      const pct = Math.round((r.wins / r.games) * 100)
                      return (
                        <li key={r.key}>
                          <Link
                            to={`/pairs/${r.playerIds[0]}/${r.playerIds[1]}`}
                            className="group flex items-center gap-3 rounded-lg py-2.5 transition-colors hover:bg-accent/10"
                            data-testid={`h2h-${r.key}`}
                          >
                            <span className="min-w-0 flex-1 truncate text-sm text-fg">
                              {nameOf(r.playerIds[0])}{' '}
                              <span className="text-fg-subtle">&amp;</span>{' '}
                              {nameOf(r.playerIds[1])}
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums">
                              <span className={r.wins >= losses ? RANK_TEXT : 'text-negative'}>
                                {r.wins}W
                              </span>
                              <span className="text-fg-subtle"> – </span>
                              <span className="text-fg">{losses}L</span>
                            </span>
                            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-fg-subtle">
                              {pct}%
                            </span>
                            <span
                              aria-hidden
                              className="shrink-0 text-fg-subtle transition-colors group-hover:text-accent-strong"
                            >
                              ›
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              </div>
            )}

            <Card title="Matches together" icon={<Icon name="matches" />}>
              <div className="space-y-5" data-testid="pair-history">
                {visibleDays.map((day) => (
                  <div key={day.sessionId}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <Link
                        to={`/game-days/${day.sessionId}`}
                        className="text-xs font-semibold uppercase tracking-wide text-fg-subtle hover:text-accent-strong hover:underline"
                      >
                        {formatDay(day.date)}
                      </Link>
                      <span className="flex items-baseline gap-2 text-xs tabular-nums">
                        <span className="text-fg-muted">
                          {day.wins}–{day.losses}
                        </span>
                        <span
                          className={cx('font-semibold', POINTS_TEXT)}
                          title="Game-day points (rally point differential)"
                        >
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
                {days.length > HISTORY_PREVIEW_DAYS && (
                  <button
                    type="button"
                    onClick={() => setShowAllHistory((v) => !v)}
                    className="w-full rounded-lg border border-line py-2 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
                    data-testid="pair-history-toggle"
                  >
                    {showAllHistory ? 'Show fewer' : `Show all ${days.length} game days`}
                  </button>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
