// Ranking computation (E05 / TASK-6.2) — see ADR 0011. Pure + deterministic:
// replay ordered rating periods (locked game days) through Glicko-2 to produce
// both an individual board and a per-pair board. No DB, no clock.
//
// Per ADR 0011:
//  - Outcome score is the point share: s = pointsFor / totalPoints (margin-aware).
//  - Individual: each player faces a synthetic opponent = the mean rating of the
//    two opponents (RD = root-mean-square of their RDs).
//  - Pair: each partnership faces the opposing partnership directly.
//  - Within a period, opponents are read from the *pre-period* snapshot, so the
//    order of matches inside one game day does not bias the result.
//  - Rated entities that did not play a period have their RD inflated (idle
//    uncertainty) and rating unchanged.

import {
  defaultGlicko2,
  updateGlicko2,
  type Glicko2,
  type Glicko2Game,
} from './glicko2'
import {
  pairKey,
  type PairRating,
  type PlayerRating,
  type RatingPeriod,
  type RatingTables,
} from './types'

/** Point share for side A; a 0–0 (unplayed) match is treated as a draw. */
export function scoreShare(scoreA: number, scoreB: number): number {
  const total = scoreA + scoreB
  return total > 0 ? scoreA / total : 0.5
}

/** Synthetic opponent for the individual board: mean rating, RMS deviation. */
function teamOpponent(x: Glicko2, y: Glicko2): { rating: number; rd: number } {
  return {
    rating: (x.rating + y.rating) / 2,
    rd: Math.sqrt((x.rd * x.rd + y.rd * y.rd) / 2),
  }
}

const push = <T>(map: Map<string, T[]>, key: string, value: T) => {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

/**
 * Compute both leaderboards from ordered rating periods. Entities default to a
 * fresh Glicko-2 state on first appearance; results are sorted strongest-first
 * (rating desc, then fewer-RD, then key for stability).
 */
export function computeRatings(periods: RatingPeriod[]): RatingTables {
  const players = new Map<string, Glicko2>()
  const pairs = new Map<string, Glicko2>()
  const playerGames = new Map<string, number>()
  const pairGames = new Map<string, number>()
  const pairMembers = new Map<string, [string, string]>()

  for (const period of periods) {
    // Opponents are read from the pre-period snapshot (defaults if unseen), so
    // match order within a game day is irrelevant.
    const snapPlayer = (id: string) => players.get(id) ?? defaultGlicko2()
    const snapPair = (key: string) => pairs.get(key) ?? defaultGlicko2()

    const playerPeriodGames = new Map<string, Glicko2Game[]>()
    const pairPeriodGames = new Map<string, Glicko2Game[]>()

    for (const m of period.matches) {
      const sA = scoreShare(m.scoreA, m.scoreB)
      const sB = 1 - sA
      const [a1, a2] = m.teamA
      const [b1, b2] = m.teamB

      // Individual: each player vs the average of the two opponents.
      const oppForA = teamOpponent(snapPlayer(b1), snapPlayer(b2))
      const oppForB = teamOpponent(snapPlayer(a1), snapPlayer(a2))
      push(playerPeriodGames, a1, { ...oppForA, score: sA })
      push(playerPeriodGames, a2, { ...oppForA, score: sA })
      push(playerPeriodGames, b1, { ...oppForB, score: sB })
      push(playerPeriodGames, b2, { ...oppForB, score: sB })

      // Pair: partnership vs opposing partnership.
      const keyA = pairKey(a1, a2)
      const keyB = pairKey(b1, b2)
      pairMembers.set(keyA, [a1, a2])
      pairMembers.set(keyB, [b1, b2])
      const prA = snapPair(keyA)
      const prB = snapPair(keyB)
      push(pairPeriodGames, keyA, { rating: prB.rating, rd: prB.rd, score: sA })
      push(pairPeriodGames, keyB, { rating: prA.rating, rd: prA.rd, score: sB })
    }

    applyPeriod(players, playerPeriodGames, playerGames)
    applyPeriod(pairs, pairPeriodGames, pairGames)
  }

  const playerBoard: PlayerRating[] = [...players.entries()].map(([id, g]) => ({
    id,
    games: playerGames.get(id) ?? 0,
    ...g,
  }))
  const pairBoard: PairRating[] = [...pairs.entries()].map(([key, g]) => ({
    key,
    players: pairMembers.get(key) as [string, string],
    games: pairGames.get(key) ?? 0,
    ...g,
  }))

  return { players: sortBoard(playerBoard), pairs: sortBoard(pairBoard) }
}

/**
 * Apply one period to a board: entities that played get a full Glicko-2 update;
 * previously-rated entities that sat out get RD inflation only.
 */
function applyPeriod(
  ratings: Map<string, Glicko2>,
  periodGames: Map<string, Glicko2Game[]>,
  totals: Map<string, number>,
): void {
  const ids = new Set<string>([...ratings.keys(), ...periodGames.keys()])
  for (const id of ids) {
    const current = ratings.get(id) ?? defaultGlicko2()
    const games = periodGames.get(id) ?? []
    ratings.set(id, updateGlicko2(current, games))
    if (games.length > 0) totals.set(id, (totals.get(id) ?? 0) + games.length)
  }
}

/** Strongest-first: higher rating, then lower RD (more certain), then key. */
function sortBoard<T extends { rating: number; rd: number; id?: string; key?: string }>(
  board: T[],
): T[] {
  return [...board].sort(
    (a, b) => b.rating - a.rating || a.rd - b.rd || keyOf(a).localeCompare(keyOf(b)),
  )
}

const keyOf = (r: { id?: string; key?: string }) => r.id ?? r.key ?? ''
