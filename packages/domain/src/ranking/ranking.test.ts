import { describe, it, expect } from 'vitest'
import {
  ABSENCE_DECAY,
  ABSENCE_FLOOR,
  ABSENCE_GRACE_PERIOD,
  computeRatings,
  scoreShare,
} from './ranking'
import { DEFAULT_RATING, DEFAULT_RD } from './glicko2'
import { pairKey, type MatchRecord, type RatingPeriod } from './types'

const match = (
  teamA: [string, string],
  teamB: [string, string],
  scoreA: number,
  scoreB: number,
): MatchRecord => ({ teamA, teamB, scoreA, scoreB })

const period = (...matches: MatchRecord[]): RatingPeriod => ({ matches })

const playerById = (tables: ReturnType<typeof computeRatings>, id: string) =>
  tables.players.find((p) => p.id === id)!
const pairByKey = (tables: ReturnType<typeof computeRatings>, a: string, b: string) =>
  tables.pairs.find((p) => p.key === pairKey(a, b))!

describe('scoreShare', () => {
  it('is the winner-point fraction and is symmetric', () => {
    expect(scoreShare(21, 0)).toBe(1)
    expect(scoreShare(21, 7)).toBeCloseTo(0.75, 5)
    expect(scoreShare(10, 10)).toBe(0.5)
    expect(scoreShare(21, 7) + scoreShare(7, 21)).toBe(1)
  })

  it('treats an unplayed 0–0 as a draw', () => {
    expect(scoreShare(0, 0)).toBe(0.5)
  })
})

describe('computeRatings — individual board', () => {
  it('rates winners above losers from a single match', () => {
    const tables = computeRatings([period(match(['a', 'b'], ['c', 'd'], 21, 10))])
    expect(playerById(tables, 'a').rating).toBeGreaterThan(DEFAULT_RATING)
    expect(playerById(tables, 'c').rating).toBeLessThan(DEFAULT_RATING)
    // Strongest-first ordering puts a winner at the top.
    expect(['a', 'b']).toContain(tables.players[0].id)
  })

  it('moves ratings further on a larger point margin', () => {
    const blowout = computeRatings([period(match(['a', 'b'], ['c', 'd'], 21, 2))])
    const close = computeRatings([period(match(['a', 'b'], ['c', 'd'], 21, 19))])
    expect(playerById(blowout, 'a').rating).toBeGreaterThan(
      playerById(close, 'a').rating,
    )
  })

  it('counts games and shrinks RD with play', () => {
    const tables = computeRatings([period(match(['a', 'b'], ['c', 'd'], 21, 15))])
    const a = playerById(tables, 'a')
    expect(a.games).toBe(1)
    expect(a.rd).toBeLessThan(DEFAULT_RD)
  })

  it('is independent of match order within a period', () => {
    const m1 = match(['a', 'b'], ['c', 'd'], 21, 10)
    const m2 = match(['a', 'c'], ['b', 'd'], 21, 18)
    const forward = computeRatings([period(m1, m2)])
    const reversed = computeRatings([period(m2, m1)])
    expect(playerById(forward, 'a').rating).toBeCloseTo(
      playerById(reversed, 'a').rating,
      6,
    )
  })

  it('inflates RD for a rated player who sits out a later period', () => {
    const played = computeRatings([period(match(['a', 'b'], ['c', 'd'], 21, 10))])
    const satOut = computeRatings([
      period(match(['a', 'b'], ['c', 'd'], 21, 10)),
      period(match(['e', 'f'], ['g', 'h'], 21, 10)),
    ])
    const aPlayed = playerById(played, 'a')
    const aSatOut = playerById(satOut, 'a')
    expect(aSatOut.rating).toBeCloseTo(aPlayed.rating, 6) // rating unchanged
    expect(aSatOut.games).toBe(1) // no new games
    expect(aSatOut.rd).toBeGreaterThan(aPlayed.rd) // uncertainty grew
  })
})

describe('computeRatings — absence decay (grace period)', () => {
  const skip = (): RatingPeriod => ({ matches: [], absentees: ['a'] })
  // 'a' wins (rating climbs above the floor), then skips `misses` game days.
  const winThenSkip = (misses: number) =>
    computeRatings([
      period(match(['a', 'b'], ['c', 'd'], 21, 5)),
      ...Array.from({ length: misses }, skip),
    ])

  it('does not decay within the grace period (first 5 missed game days)', () => {
    const baseline = playerById(winThenSkip(0), 'a').rating
    for (let m = 1; m <= ABSENCE_GRACE_PERIOD; m++) {
      // Idle periods hold the rating (RD inflates, rating does not move).
      expect(playerById(winThenSkip(m), 'a').rating).toBeCloseTo(baseline, 6)
    }
  })

  it('decays ABSENCE_DECAY per game day only from the 6th consecutive miss', () => {
    const baseline = playerById(winThenSkip(0), 'a').rating
    // 6th miss = first decay; 7th = second.
    expect(playerById(winThenSkip(ABSENCE_GRACE_PERIOD + 1), 'a').rating).toBeCloseTo(
      baseline - ABSENCE_DECAY,
      6,
    )
    expect(playerById(winThenSkip(ABSENCE_GRACE_PERIOD + 2), 'a').rating).toBeCloseTo(
      baseline - 2 * ABSENCE_DECAY,
      6,
    )
  })

  it('resets the streak when the player returns and plays', () => {
    // Miss 5 (grace), return and play, then miss 5 more. The trailing misses are
    // all within a fresh grace window, so they must cost nothing — proving the
    // streak reset. (Without the reset, misses 6–10 would decay.)
    const win = () => period(match(['a', 'b'], ['c', 'd'], 21, 5))
    const withTrailing = computeRatings([
      win(),
      ...Array.from({ length: 5 }, skip),
      win(), // 'a' returns
      ...Array.from({ length: 5 }, skip),
    ])
    const withoutTrailing = computeRatings([
      win(),
      ...Array.from({ length: 5 }, skip),
      win(),
    ])
    expect(playerById(withTrailing, 'a').rating).toBeCloseTo(
      playerById(withoutTrailing, 'a').rating,
      6,
    )
  })

  it('never decays below the floor', () => {
    // Small win -> just above 1500; enough post-grace misses to clamp to the floor.
    const tables = computeRatings([
      period(match(['a', 'b'], ['c', 'd'], 21, 20)),
      ...Array.from({ length: ABSENCE_GRACE_PERIOD + 3 }, skip),
    ])
    expect(playerById(tables, 'a').rating).toBe(ABSENCE_FLOOR)
  })

  it('leaves players already at/below the floor untouched (even past grace)', () => {
    // 'c' lost badly (rating below the floor); absence must never move it.
    const skipC = (): RatingPeriod => ({ matches: [], absentees: ['c'] })
    const baseline = computeRatings([period(match(['a', 'b'], ['c', 'd'], 21, 2))])
    const withAbsence = computeRatings([
      period(match(['a', 'b'], ['c', 'd'], 21, 2)),
      ...Array.from({ length: ABSENCE_GRACE_PERIOD + 3 }, skipC),
    ])
    const cBase = playerById(baseline, 'c')
    const cAbsent = playerById(withAbsence, 'c')
    expect(cBase.rating).toBeLessThan(ABSENCE_FLOOR)
    expect(cAbsent.rating).toBeCloseTo(cBase.rating, 6) // unchanged by absence
  })

  it('does not create a board entry for an absentee who never played', () => {
    const tables = computeRatings([
      { matches: [match(['a', 'b'], ['c', 'd'], 21, 10)], absentees: ['zzz'] },
    ])
    expect(tables.players.find((p) => p.id === 'zzz')).toBeUndefined()
  })
})

describe('computeRatings — pair board', () => {
  it('rates the winning partnership above the losing one', () => {
    const tables = computeRatings([period(match(['a', 'b'], ['c', 'd'], 21, 8))])
    expect(pairByKey(tables, 'a', 'b').rating).toBeGreaterThan(DEFAULT_RATING)
    expect(pairByKey(tables, 'c', 'd').rating).toBeLessThan(DEFAULT_RATING)
  })

  it('keys pairs order-independently and records members', () => {
    const tables = computeRatings([period(match(['b', 'a'], ['c', 'd'], 21, 8))])
    const pair = pairByKey(tables, 'a', 'b')
    expect(pair.key).toBe('a|b')
    expect([...pair.players].sort()).toEqual(['a', 'b'])
    expect(pair.games).toBe(1)
  })

  it('treats different partnerships of the same player independently', () => {
    // 'a' wins with 'b', then loses with 'c'. The two pairs diverge.
    const tables = computeRatings([
      period(match(['a', 'b'], ['c', 'd'], 21, 5)),
      period(match(['a', 'c'], ['b', 'd'], 5, 21)),
    ])
    expect(pairByKey(tables, 'a', 'b').rating).toBeGreaterThan(
      pairByKey(tables, 'a', 'c').rating,
    )
  })
})

describe('computeRatings — edge cases', () => {
  it('returns empty boards for no periods', () => {
    expect(computeRatings([])).toEqual({ players: [], pairs: [] })
  })

  it('handles an empty period without creating entities', () => {
    expect(computeRatings([period()])).toEqual({ players: [], pairs: [] })
  })

  it('accumulates ratings across multiple periods', () => {
    const tables = computeRatings([
      period(match(['a', 'b'], ['c', 'd'], 21, 10)),
      period(match(['a', 'b'], ['c', 'd'], 21, 12)),
    ])
    expect(playerById(tables, 'a').games).toBe(2)
    expect(playerById(tables, 'a').rating).toBeGreaterThan(DEFAULT_RATING)
  })
})

// TASK-88: rating one day on top of stored ratings must be indistinguishable
// from replaying every day before it. If these ever diverge, the live-day
// preview silently disagrees with the leaderboard it is previewing.
describe('seeding from stored ratings', () => {
  const m = (a1: string, a2: string, b1: string, b2: string, sa: number, sb: number) => ({
    teamA: [a1, a2] as [string, string],
    teamB: [b1, b2] as [string, string],
    scoreA: sa,
    scoreB: sb,
  })
  const season = [
    { matches: [m('a', 'b', 'c', 'd', 21, 15), m('a', 'c', 'b', 'd', 18, 21)] },
    { matches: [m('a', 'd', 'b', 'c', 21, 19), m('b', 'd', 'a', 'c', 12, 21)] },
    { matches: [m('c', 'd', 'a', 'b', 21, 17)] },
  ]
  const today = { matches: [m('a', 'b', 'c', 'd', 21, 11), m('a', 'c', 'b', 'd', 9, 21)] }

  it('gives the same boards as replaying the whole history', () => {
    const full = computeRatings([...season, today])
    const prefix = computeRatings(season)
    const seeded = computeRatings([today], { players: prefix.players, pairs: prefix.pairs })

    const norm = (b: { id?: string; key?: string; rating: number; rd: number; vol: number; games: number }[]) =>
      b.map((r) => [r.id ?? r.key, r.rating.toFixed(10), r.rd.toFixed(10), r.vol.toFixed(10), r.games])
    expect(norm(seeded.players)).toEqual(norm(full.players))
    expect(norm(seeded.pairs)).toEqual(norm(full.pairs))
  })

  it('carries the games count forward rather than restarting it', () => {
    const prefix = computeRatings(season)
    const seeded = computeRatings([today], { players: prefix.players, pairs: prefix.pairs })
    const before = prefix.players.find((p) => p.id === 'a')!.games
    const after = seeded.players.find((p) => p.id === 'a')!.games
    expect(after).toBe(before + 2)
  })

  it('behaves exactly as before when no seed is given', () => {
    const a = computeRatings(season)
    const b = computeRatings(season, undefined)
    expect(b).toEqual(a)
  })

  // The streak decides when absence decay starts biting, and it is not stored
  // with the ratings — a caller passing absentees must pass it too.
  it('continues an absence streak when the seed carries it', () => {
    const played = [{ matches: [m('a', 'b', 'c', 'd', 21, 15)] }]
    const base = computeRatings(played)
    const idle = { matches: [], absentees: ['a'] }
    const withStreak = computeRatings([idle], {
      players: base.players,
      pairs: base.pairs,
      absenceStreak: { a: ABSENCE_GRACE_PERIOD },
    })
    const withoutStreak = computeRatings([idle], { players: base.players, pairs: base.pairs })
    const ratingOf = (t: typeof base, id: string) => t.players.find((p) => p.id === id)!.rating
    // Past the grace period the seeded streak decays; a fresh streak does not.
    expect(ratingOf(withStreak, 'a')).toBeLessThan(ratingOf(withoutStreak, 'a'))
  })
})
