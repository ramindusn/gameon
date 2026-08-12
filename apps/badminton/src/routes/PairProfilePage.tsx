import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { Icon } from '../app/Icon'
import { loadPlayerHistory } from '../play/api'
import { usePairBoard, usePairRatingHistory, usePlayerNames } from '../ranking/useRanking'
import { pairKey } from '../ranking/api'
import { RANK_TEXT } from '../ranking/metricColors'
import { PerformanceChart } from '../profile/PerformanceChart'
import { computeOpponentStats } from '../profile/headToHead'
import { BigStat, DuoList, HistoryRow, formatDay } from './PlayerProfilePage'

/** Below this many games together, a partnership's rating is noise. */
const MIN_RATED_GAMES = 5
/** How many opponents the insights lists show. */
const INSIGHT_LIMIT = 4

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

  // Deliberately not toughestOpponents(): that needs two meetings to qualify
  // and ranks by win rate, so on a pair with a handful of games it listed
  // opponents this pair had beaten every time under "toughest". Wins and
  // losses, plainly.
  const lostTo = useMemo(
    () =>
      computeOpponentStats(matches)
        .filter((o) => o.games - o.wins > 0)
        .sort((x, y) => y.games - y.wins - (x.games - x.wins) || y.games - x.games)
        .slice(0, INSIGHT_LIMIT),
    [matches],
  )
  const beaten = useMemo(
    () =>
      computeOpponentStats(matches)
        .filter((o) => o.wins > 0)
        .sort((x, y) => y.wins - x.wins || y.games - x.games)
        .slice(0, INSIGHT_LIMIT),
    [matches],
  )

  // Newest day first; matches keep their order within a day.
  const byDay = useMemo(() => {
    const groups = new Map<string, typeof matches>()
    for (const m of matches) groups.set(m.date, [...(groups.get(m.date) ?? []), m])
    return [...groups.entries()].sort((x, y) => y[0].localeCompare(x[0]))
  }, [matches])

  const title = `${nameOf(a)} & ${nameOf(b)}`

  return (
    <AppShell title="Pair">
      <div className="mx-auto max-w-3xl" data-testid="pair-profile">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-fg">{title}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            <Link to={`/players/${a}`} className="hover:text-accent-strong">
              {nameOf(a)}
            </Link>
            {' · '}
            <Link to={`/players/${b}`} className="hover:text-accent-strong">
              {nameOf(b)}
            </Link>
          </p>
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

            {(beaten.length > 0 || lostTo.length > 0) && (
              <div className="mb-6">
                <Card title="Opponents" icon={<Icon name="pairs" />}>
                  <div
                    className="grid grid-cols-1 gap-6 sm:grid-cols-2"
                    data-testid="pair-opponents"
                  >
                    <DuoList
                      heading="Beaten most"
                      caption="this pair's record vs them"
                      stats={beaten}
                      nameOf={nameOf}
                      empty="No wins yet."
                    />
                    <DuoList
                      heading="Lost to most"
                      caption="this pair's record vs them"
                      stats={lostTo}
                      nameOf={nameOf}
                      empty="Unbeaten so far."
                    />
                  </div>
                </Card>
              </div>
            )}

            <Card title="Matches together" icon={<Icon name="matches" />}>
              {/* Grouped by game day so the date is a header, not repeated on
                  every row — HistoryRow is itself an <li>, so it goes straight
                  into the list. */}
              <div className="space-y-4" data-testid="pair-history">
                {byDay.map(([day, ms]) => (
                  <div key={day}>
                    <p className="mb-1.5 text-xs text-fg-subtle">{formatDay(day)}</p>
                    <ul className="space-y-2">
                      {ms.map((m) => (
                        <HistoryRow key={m.id} m={m} nameOf={nameOf} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
