// Fixed-pairs tournament standings (E11) — a pure, points-based board that is
// kept ISOLATED from the Glicko individual/doubles ranking. Pairs are ranked by
// total points scored across tournament matches, with an absence penalty: once a
// pair has played, every later tournament game day it misses costs it points.
//
// Pure + deterministic (no I/O); the app feeds it the club's finished tournament
// sessions + their scored results and renders the returned table.

/** A finished tournament game day (chronology comes from `playedAt`). */
export interface StandingsSession {
  id: string
  playedAt: string
}

/** One scored court from a tournament session. */
export interface StandingsResult {
  sessionId: string
  teamA: [string | null, string | null]
  teamB: [string | null, string | null]
  scoreA: number | null
  scoreB: number | null
}

/** One pair's row on the fixed-pairs board (strongest first by `points`). */
export interface PairStanding {
  player1Id: string
  player2Id: string
  played: number
  wins: number
  losses: number
  /** Raw points scored across all tournament matches. */
  pointsFor: number
  /** Tournament game days missed after the pair's first appearance. */
  missedDays: number
  /** Ranked total: `max(0, pointsFor − missedDays × penalty)`. */
  points: number
}

export interface StandingsOptions {
  /** Points deducted per missed tournament game day. */
  absencePenalty?: number
}

/** Default points lost for each tournament game day a pair sits out. */
export const FIXED_PAIR_ABSENCE_PENALTY = 5

/** Canonical, order-independent pair key (matches the pair_ratings convention). */
function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

interface Acc {
  player1Id: string
  player2Id: string
  played: number
  wins: number
  losses: number
  pointsFor: number
  days: Set<string>
}

/**
 * Build the fixed-pairs standings table from finished tournament sessions and
 * their scored results. Only matches with both teams complete AND both point
 * scores recorded contribute (the board ranks on points scored).
 */
export function computeFixedPairStandings(
  sessions: StandingsSession[],
  results: StandingsResult[],
  opts: StandingsOptions = {},
): PairStanding[] {
  const penalty = opts.absencePenalty ?? FIXED_PAIR_ABSENCE_PENALTY
  // Tournament game days, oldest first, for the absence walk.
  const order = [...sessions].sort((a, b) => a.playedAt.localeCompare(b.playedAt))
  const orderIndex = new Map(order.map((s, i) => [s.id, i]))

  const acc = new Map<string, Acc>()
  const get = (a: string, b: string): Acc => {
    const [p1, p2] = pairKey(a, b)
    const key = `${p1}|${p2}`
    let row = acc.get(key)
    if (!row) {
      row = { player1Id: p1, player2Id: p2, played: 0, wins: 0, losses: 0, pointsFor: 0, days: new Set() }
      acc.set(key, row)
    }
    return row
  }

  for (const r of results) {
    // Need a complete pair on both sides and both point scores to count.
    if (!r.teamA[0] || !r.teamA[1] || !r.teamB[0] || !r.teamB[1]) continue
    if (r.scoreA == null || r.scoreB == null) continue
    if (!orderIndex.has(r.sessionId)) continue

    const a = get(r.teamA[0], r.teamA[1])
    const b = get(r.teamB[0], r.teamB[1])
    a.played += 1
    b.played += 1
    a.pointsFor += r.scoreA
    b.pointsFor += r.scoreB
    a.days.add(r.sessionId)
    b.days.add(r.sessionId)
    if (r.scoreA > r.scoreB) {
      a.wins += 1
      b.losses += 1
    } else if (r.scoreB > r.scoreA) {
      b.wins += 1
      a.losses += 1
    }
  }

  const rows: PairStanding[] = [...acc.values()].map((row) => {
    // Missed days = tournament game days at/after the pair's first appearance
    // that it did not play in.
    const playedIdx = [...row.days].map((id) => orderIndex.get(id)!).sort((x, y) => x - y)
    const firstIdx = playedIdx[0]
    let missedDays = 0
    for (let i = firstIdx; i < order.length; i++) {
      if (!row.days.has(order[i].id)) missedDays += 1
    }
    const points = Math.max(0, row.pointsFor - missedDays * penalty)
    return {
      player1Id: row.player1Id,
      player2Id: row.player2Id,
      played: row.played,
      wins: row.wins,
      losses: row.losses,
      pointsFor: row.pointsFor,
      missedDays,
      points,
    }
  })

  // Rank by adjusted points, then raw points, then more games, then key.
  rows.sort(
    (x, y) =>
      y.points - x.points ||
      y.pointsFor - x.pointsFor ||
      y.played - x.played ||
      x.player1Id.localeCompare(y.player1Id) ||
      x.player2Id.localeCompare(y.player2Id),
  )
  return rows
}
