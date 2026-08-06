import { describe, expect, it } from 'vitest'
import { nextTournamentRound, roundRobin } from './roundRobin'

function allMatchups(rounds: Array<Array<[number, number]>>): string[] {
  return rounds.flat().map(([a, b]) => (a < b ? `${a}-${b}` : `${b}-${a}`))
}

describe('roundRobin', () => {
  it('returns nothing for fewer than two teams', () => {
    expect(roundRobin(0)).toEqual([])
    expect(roundRobin(1)).toEqual([])
  })

  it('schedules every pairing exactly once (even teams)', () => {
    const rounds = roundRobin(4)
    const matchups = allMatchups(rounds)
    // C(4,2) = 6 distinct matchups, no repeats.
    expect(matchups.length).toBe(6)
    expect(new Set(matchups).size).toBe(6)
    // 4 teams → 3 rounds of 2 courts each.
    expect(rounds).toHaveLength(3)
    rounds.forEach((round) => expect(round).toHaveLength(2))
  })

  it('no team plays twice within a round', () => {
    const rounds = roundRobin(6)
    for (const round of rounds) {
      const seen = new Set<number>()
      for (const [a, b] of round) {
        expect(seen.has(a)).toBe(false)
        expect(seen.has(b)).toBe(false)
        seen.add(a)
        seen.add(b)
      }
    }
    // C(6,2) = 15 matchups, all distinct.
    expect(new Set(allMatchups(rounds)).size).toBe(15)
  })

  it('handles an odd team count (each plays every other once, one byes per round)', () => {
    const rounds = roundRobin(5)
    const matchups = allMatchups(rounds)
    expect(matchups.length).toBe(10) // C(5,2)
    expect(new Set(matchups).size).toBe(10)
    // 5 teams → 5 rounds, each with 2 matches (one team byes).
    expect(rounds).toHaveLength(5)
    rounds.forEach((round) => expect(round).toHaveLength(2))
  })
})

describe('nextTournamentRound (TASK-80)', () => {
  it('walks the schedule so pairs never re-pair, only re-match', () => {
    // 4 pairs -> 3 rounds covering all 6 matchups exactly once.
    const seen = [0, 1, 2].map((r) => nextTournamentRound(4, r))
    const flat = seen.flat().map(([a, b]) => (a < b ? `${a}${b}` : `${b}${a}`))
    expect(new Set(flat).size).toBe(6)
    expect(seen.every((round) => round.length === 2)).toBe(true)
  })

  it('wraps into a second pass once the round-robin is exhausted', () => {
    expect(nextTournamentRound(4, 3)).toEqual(nextTournamentRound(4, 0))
    expect(nextTournamentRound(4, 4)).toEqual(nextTournamentRound(4, 1))
  })

  it('sits one pair out when the count is odd, rotating who', () => {
    const rounds = [0, 1, 2, 3, 4].map((r) => nextTournamentRound(5, r))
    // 5 pairs -> 2 matches a round, so exactly one pair rests each time.
    expect(rounds.every((r) => r.length === 2)).toBe(true)
    const rested = rounds.map((r) => {
      const playing = new Set(r.flat())
      return [0, 1, 2, 3, 4].find((i) => !playing.has(i))
    })
    expect(new Set(rested).size).toBe(5) // everyone rests once
  })

  it('returns nothing when there are not two pairs', () => {
    expect(nextTournamentRound(1, 0)).toEqual([])
    expect(nextTournamentRound(0, 0)).toEqual([])
  })
})
