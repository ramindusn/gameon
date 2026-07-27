import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { Card, cx } from '@gameon/ui'
import { Icon } from '../app/Icon'
import { useSession } from '../play/useMatchPlay'
import { usePlayerNames, useGameDayRatingDeltas } from '../ranking/useRanking'
import { buildGameDayBoard, type GameDayResultRow } from '../ranking/api'
import { POINTS_TEXT, RANK_TEXT } from '../ranking/metricColors'
import type { MatchResult } from '../play/api'

// Public, read-only per-game-day page (TASK-37). Anyone can open it from the
// home's Game Day Rank widget: the day's standings (net point differential) on
// top, then the full match score history (rounds → courts) below.
export function GameDayPage() {
  const { id = '' } = useParams()
  const { data, isLoading, isError } = useSession(id)
  const nameOf = usePlayerNames()
  // Ranking points each player gained/lost this game day (TASK-46).
  const { data: ratingDeltas } = useGameDayRatingDeltas(id)

  const session = data?.session
  const results = useMemo(() => data?.results ?? [], [data])

  // Standings from the scored courts, ranked by net point differential then
  // nickname (matching the home widget).
  const standings = useMemo(() => {
    const rows: GameDayResultRow[] = results
      .filter((r) => r.winner !== null && r.scoreA !== null && r.scoreB !== null)
      .map((r) => ({
        teamA: r.teamA,
        teamB: r.teamB,
        scoreA: r.scoreA ?? 0,
        scoreB: r.scoreB ?? 0,
        winner: r.winner === 'b' ? 'b' : 'a',
      }))
    return buildGameDayBoard(rows)
      .map((s) => ({ ...s, name: nameOf(s.playerId) }))
      .sort((a, b) => b.diff - a.diff || a.name.localeCompare(b.name))
  }, [results, nameOf])

  const rounds = useMemo(() => groupByRound(results), [results])

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg" data-testid="game-day-page">
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
        {(isError || (!isLoading && !session)) && (
          <p className="text-sm text-fg-muted" data-testid="game-day-not-found">
            Game day not found.
          </p>
        )}

        {session && (
          <>
            <div className="mb-8">
              <p className="text-sm font-medium text-accent-strong">Game Day</p>
              <h1 className="font-display text-2xl font-bold" data-testid="game-day-title">
                {formatDay(session.playedAt)}
              </h1>
            </div>

            <div className="mb-6">
              <Card title="Game Day Rank" icon={<Icon name="trophy" />}>
                {standings.length === 0 ? (
                  <p className="text-sm text-fg-muted">No scored matches on this game day.</p>
                ) : (
                  <>
                  <p className="mb-3 text-xs text-fg-muted">
                    <span className={cx('font-semibold', POINTS_TEXT)}>Points</span> are from this
                    game day · <span className={cx('font-semibold', RANK_TEXT)}>Ranking</span> counts
                    toward the leaderboard
                  </p>
                  <table className="w-full text-sm" data-testid="game-day-standings">
                    <thead>
                      <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wide">
                        <th className="w-14 py-2 font-medium text-fg-subtle">Rank</th>
                        <th className="py-2 font-medium text-fg-subtle">Player Name</th>
                        <th className="py-2 text-right font-medium text-fg-subtle">W–L</th>
                        <th className={cx('py-2 text-right font-medium', POINTS_TEXT)} title="Rally points scored minus conceded, this game day">
                          Points
                        </th>
                        <th className={cx('py-2 text-right font-medium', RANK_TEXT)} title="Points counted toward the leaderboard">
                          Ranking
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {standings.map((s, i) => (
                        <tr key={s.playerId} data-testid={`standing-${s.playerId}`}>
                          <td className="py-3">
                            <RankBadge n={i + 1} />
                          </td>
                          <td className="py-3 font-medium text-fg">
                            <Link
                              to={`/players/${s.playerId}`}
                              className="hover:text-accent-strong hover:underline"
                            >
                              {s.name}
                            </Link>
                          </td>
                          <td className="py-3 text-right tabular-nums text-fg-muted">
                            {s.wins}–{s.played - s.wins}
                          </td>
                          <td className={cx('py-3 text-right font-display font-bold tabular-nums', POINTS_TEXT)}>
                            {fmtDiff(s.diff)}
                          </td>
                          <td className="py-3 text-right tabular-nums" data-testid={`rating-delta-${s.playerId}`}>
                            <RatingDelta value={ratingDeltas?.[s.playerId]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </>
                )}
              </Card>
            </div>

            <Card title="Match scores" icon={<Icon name="finish" />}>
              {rounds.length === 0 ? (
                <p className="text-sm text-fg-muted">No matches recorded.</p>
              ) : (
                <div className="space-y-6" data-testid="game-day-scores">
                  {rounds.map(({ round, results }) => (
                    <div key={round}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                        Round {round}
                      </h3>
                      <div className="space-y-2">
                        {results.map((r) => (
                          <MatchRow key={r.id} result={r} nameOf={nameOf} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

/** One court: the two sides, their scores, with the winner highlighted. */
function MatchRow({
  result,
  nameOf,
}: {
  result: MatchResult
  nameOf: (id: string | null) => string
}) {
  const aWon = result.winner === 'a'
  const bWon = result.winner === 'b'
  const scored = result.scoreA !== null && result.scoreB !== null
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm"
      data-testid={`match-${result.id}`}
    >
      <span className="w-16 shrink-0 text-xs text-fg-subtle">Court {result.court}</span>
      <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamName ids={result.teamA} nameOf={nameOf} won={aWon} />
        <span className="shrink-0 font-display font-bold tabular-nums text-fg">
          {scored ? `${result.scoreA}–${result.scoreB}` : 'vs'}
        </span>
        <TeamName ids={result.teamB} nameOf={nameOf} won={bWon} align="right" />
      </div>
    </div>
  )
}

function TeamName({
  ids,
  nameOf,
  won,
  align = 'left',
}: {
  ids: [string | null, string | null]
  nameOf: (id: string | null) => string
  won: boolean
  align?: 'left' | 'right'
}) {
  return (
    <span
      className={cx(
        'min-w-0 leading-tight',
        align === 'right' ? 'text-right' : 'text-left',
        won ? 'font-semibold text-accent-strong' : 'text-fg',
      )}
    >
      <span className="block break-words">{nameOf(ids[0])}</span>
      <span className="block break-words">{nameOf(ids[1])}</span>
    </span>
  )
}

function RankBadge({ n }: { n: number }) {
  return (
    <span
      className={cx(
        'grid h-7 w-7 place-items-center rounded-full font-display text-sm',
        n === 1 ? 'bg-accent/15 font-bold text-accent-strong' : 'font-medium text-fg-subtle',
      )}
    >
      {n}
    </span>
  )
}

const fmtDiff = (n: number) => (n > 0 ? `+${n}` : String(n))

/** Ranking points gained/lost that game day, to one decimal so it stays exact
 *  (green up, red down, — while loading). */
function RatingDelta({ value }: { value?: number }) {
  if (value == null) return <span className="text-fg-subtle">—</span>
  // Round to one decimal; treat a hair either side of zero as flat.
  const r = Math.round(value * 10) / 10
  const positive = r > 0
  const negative = r < 0
  return (
    <span
      className={cx(
        'font-display font-semibold',
        positive ? RANK_TEXT : negative ? 'text-negative' : 'text-fg-muted',
      )}
    >
      {positive ? '+' : ''}
      {r.toFixed(1)}
    </span>
  )
}

/** A readable "Wed, 8 Jul 2026, 18:31" style label for the game day. */
function formatDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const datePart = d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
  if (!hasTime) return datePart
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${datePart}, ${time}`
}

interface RoundGroup {
  round: number
  results: MatchResult[]
}

/** Group results (already ordered by round, court) into rounds for display. */
function groupByRound(results: MatchResult[]): RoundGroup[] {
  const groups: RoundGroup[] = []
  for (const r of results) {
    let g = groups.find((x) => x.round === r.round)
    if (!g) {
      g = { round: r.round, results: [] }
      groups.push(g)
    }
    g.results.push(r)
  }
  return groups
}
