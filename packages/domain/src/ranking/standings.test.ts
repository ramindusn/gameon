import { describe, expect, it } from 'vitest'
import {
  computeFixedPairStandings,
  FIXED_PAIR_ABSENCE_PENALTY,
  type StandingsResult,
  type StandingsSession,
} from './standings'

const sessions: StandingsSession[] = [
  { id: 's1', playedAt: '2026-06-01T10:00:00Z' },
  { id: 's2', playedAt: '2026-06-08T10:00:00Z' },
]

function match(
  sessionId: string,
  a: [string, string],
  b: [string, string],
  scoreA: number,
  scoreB: number,
): StandingsResult {
  return { sessionId, teamA: a, teamB: b, scoreA, scoreB }
}

describe('computeFixedPairStandings', () => {
  it('ranks pairs by total points scored', () => {
    const results = [
      match('s1', ['p1', 'p2'], ['p3', 'p4'], 21, 15),
      match('s1', ['p1', 'p2'], ['p5', 'p6'], 21, 10),
    ]
    // Single game day → no absences to penalise.
    const table = computeFixedPairStandings([sessions[0]], results)
    expect(table[0]).toMatchObject({ player1Id: 'p1', player2Id: 'p2', pointsFor: 42, points: 42 })
    // p3+p4 scored 15, p5+p6 scored 10 → ordered by points.
    expect(table.map((r) => r.pointsFor)).toEqual([42, 15, 10])
    expect(table[0].wins).toBe(2)
  })

  it('uses the canonical (sorted) pair key regardless of slot order', () => {
    const results = [
      match('s1', ['p2', 'p1'], ['p4', 'p3'], 21, 18),
      match('s1', ['p1', 'p2'], ['p3', 'p4'], 19, 21),
    ]
    const table = computeFixedPairStandings(sessions, results)
    const pair = table.find((r) => r.player1Id === 'p1' && r.player2Id === 'p2')!
    expect(pair.played).toBe(2)
    expect(pair.pointsFor).toBe(40)
    expect(pair.wins).toBe(1)
    expect(pair.losses).toBe(1)
  })

  it('penalises a pair for tournament days missed after its first appearance', () => {
    const results = [
      // Day 1: both pairs play.
      match('s1', ['p1', 'p2'], ['p3', 'p4'], 21, 17),
      // Day 2: only p1+p2 play; p3+p4 are absent.
      match('s2', ['p1', 'p2'], ['p5', 'p6'], 21, 12),
    ]
    const table = computeFixedPairStandings(sessions, results)
    const absent = table.find((r) => r.player1Id === 'p3' && r.player2Id === 'p4')!
    expect(absent.missedDays).toBe(1)
    expect(absent.points).toBe(17 - FIXED_PAIR_ABSENCE_PENALTY)
    // p1+p2 played both days — no penalty.
    const present = table.find((r) => r.player1Id === 'p1' && r.player2Id === 'p2')!
    expect(present.missedDays).toBe(0)
    expect(present.points).toBe(42)
  })

  it('does not penalise days before a pair first appears, and floors at 0', () => {
    const results = [
      // Day 1: p3+p4 only.
      match('s1', ['p3', 'p4'], ['p5', 'p6'], 21, 5),
      // Day 2: p1+p2 first appear (scoring just 3), then absent never after.
      match('s2', ['p1', 'p2'], ['p3', 'p4'], 3, 21),
    ]
    const table = computeFixedPairStandings(sessions, results, { absencePenalty: 100 })
    // p1+p2 first appeared on day 2 (the last day) → no missed days, no penalty.
    const newcomer = table.find((r) => r.player1Id === 'p1' && r.player2Id === 'p2')!
    expect(newcomer.missedDays).toBe(0)
    // p5+p6 played day 1 then missed day 2 → penalty 100 but floored at 0.
    const floored = table.find((r) => r.player1Id === 'p5' && r.player2Id === 'p6')!
    expect(floored.missedDays).toBe(1)
    expect(floored.points).toBe(0)
  })

  it('ignores matches with incomplete teams or missing scores', () => {
    const results: StandingsResult[] = [
      { sessionId: 's1', teamA: ['p1', null], teamB: ['p3', 'p4'], scoreA: 21, scoreB: 9 },
      { sessionId: 's1', teamA: ['p1', 'p2'], teamB: ['p3', 'p4'], scoreA: null, scoreB: null },
    ]
    expect(computeFixedPairStandings(sessions, results)).toEqual([])
  })
})
