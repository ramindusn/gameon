import { describe, it, expect } from 'vitest'
import { ABSENCE_DECAY, ABSENCE_FLOOR, computeRatings, scoreShare } from './ranking'
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

describe('computeRatings — absence decay', () => {
  // 'a' wins a match (rating climbs above the floor), then skips the next day.
  const winThenAbsent = (absentLater: boolean) =>
    computeRatings([
      period(match(['a', 'b'], ['c', 'd'], 21, 5)),
      {
        matches: [match(['e', 'f'], ['g', 'h'], 21, 10)],
        absentees: absentLater ? ['a'] : [],
      },
    ])

  it('docks an absent established player ABSENCE_DECAY points', () => {
    const present = winThenAbsent(false)
    const absent = winThenAbsent(true)
    expect(playerById(absent, 'a').rating).toBeCloseTo(
      playerById(present, 'a').rating - ABSENCE_DECAY,
      6,
    )
  })

  it('never decays below the floor', () => {
    // 'a' is only just above the floor; repeated absence clamps to the floor.
    const tables = computeRatings([
      period(match(['a', 'b'], ['c', 'd'], 21, 20)), // small win -> just above 1500
      { matches: [], absentees: ['a'] },
      { matches: [], absentees: ['a'] },
      { matches: [], absentees: ['a'] },
    ])
    expect(playerById(tables, 'a').rating).toBe(ABSENCE_FLOOR)
  })

  it('leaves players already at/below the floor untouched', () => {
    // 'c' lost badly (rating below the floor); absence must not move it.
    const baseline = computeRatings([period(match(['a', 'b'], ['c', 'd'], 21, 2))])
    const withAbsence = computeRatings([
      period(match(['a', 'b'], ['c', 'd'], 21, 2)),
      { matches: [], absentees: ['c'] },
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
