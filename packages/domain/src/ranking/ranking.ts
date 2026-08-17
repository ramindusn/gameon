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
  DEFAULT_RATING,
  updateGlicko2,
  type Glicko2,
  type Glicko2Game,
} from './glicko2.ts'
import {
  pairKey,
  type PairRating,
  type PlayerRating,
  type RatingPeriod,
  type RatingSeed,
  type RatingTables,
} from './types.ts'

/** Rating points an absent player loses per missed game day (ADR 0011). */
export const ABSENCE_DECAY = 20
/**
 * Grace period before decay starts. We play two game days a week, so a player
 * may miss up to this many CONSECUTIVE game days (~2.5 weeks — a holiday or a
 * short injury) with no rating penalty. Decay only begins on the next
 * consecutive miss, and playing any scored match resets the streak (ADR 0011).
 */
export const ABSENCE_GRACE_PERIOD = 5
/**
 * Absence never drags a player below the starting rating: it pulls established
 * (>1500) players back toward baseline, no further, and never touches players
 * already at/below it.
 */
export const ABSENCE_FLOOR = DEFAULT_RATING

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
 *
 * With a `seed`, the periods are rated on top of those stored ratings instead
 * of from scratch — the same arithmetic with the prefix already done, so one
 * day can be rated without replaying the season before it (TASK-88). Without
 * one, behaviour is exactly as before.
 */
export function computeRatings(periods: RatingPeriod[], seed?: RatingSeed): RatingTables {
  const players = new Map<string, Glicko2>()
  const pairs = new Map<string, Glicko2>()
  const playerGames = new Map<string, number>()
  const pairGames = new Map<string, number>()
  const pairMembers = new Map<string, [string, string]>()
  // Consecutive missed game days per player, carried across periods for the
  // absence grace period (reset when a player next plays).
  const absenceStreak = new Map<string, number>()

  if (seed) {
    for (const p of seed.players) {
      players.set(p.id, { rating: p.rating, rd: p.rd, vol: p.vol })
      playerGames.set(p.id, p.games)
    }
    for (const p of seed.pairs) {
      pairs.set(p.key, { rating: p.rating, rd: p.rd, vol: p.vol })
      pairGames.set(p.key, p.games)
      pairMembers.set(p.key, p.players)
    }
    for (const [id, n] of Object.entries(seed.absenceStreak ?? {})) {
      absenceStreak.set(id, n)
    }
  }

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
    applyAbsenceDecay(
      players,
      period.absentees,
      new Set(playerPeriodGames.keys()),
      absenceStreak,
    )
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

/**
 * Absence decay (ADR 0011). Tracks each player's run of CONSECUTIVE missed game
 * days: playing (any scored match) resets the streak, the first
 * ABSENCE_GRACE_PERIOD misses are free, and from the next consecutive miss on
 * each missed game day docks ABSENCE_DECAY points, floored at ABSENCE_FLOOR.
 * Only already-rated players above the floor are touched (you can't decay
 * someone who never played), so absence pulls established players back toward
 * baseline but never below new players.
 */
function applyAbsenceDecay(
  ratings: Map<string, Glicko2>,
  absentees: string[] | undefined,
  played: Set<string>,
  streak: Map<string, number>,
): void {
  // Anyone who played this game day starts their absence streak over.
  for (const id of played) streak.set(id, 0)
  if (!absentees) return
  for (const id of absentees) {
    const missed = (streak.get(id) ?? 0) + 1
    streak.set(id, missed)
    if (missed <= ABSENCE_GRACE_PERIOD) continue // still within the grace period
    const current = ratings.get(id)
    if (!current || current.rating <= ABSENCE_FLOOR) continue
    const rating = Math.max(ABSENCE_FLOOR, current.rating - ABSENCE_DECAY)
    ratings.set(id, { ...current, rating })
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