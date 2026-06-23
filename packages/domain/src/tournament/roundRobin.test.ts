import { describe, expect, it } from 'vitest'
import { roundRobin } from './roundRobin'

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
