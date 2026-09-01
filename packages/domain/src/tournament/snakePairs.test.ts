import { describe, expect, it } from 'vitest'
import { snakePairs } from './snakePairs'

describe('snakePairs', () => {
  it('cross-pairs strongest with weakest so pair sums stay balanced (even count)', () => {
    const players = [
      { id: 'a', skill: 8 },
      { id: 'b', skill: 7 },
      { id: 'c', skill: 6 },
      { id: 'd', skill: 5 },
      { id: 'e', skill: 4 },
      { id: 'f', skill: 3 },
      { id: 'g', skill: 2 },
      { id: 'h', skill: 1 },
    ]
    const { pairs, leftover } = snakePairs(players)
    expect(leftover).toEqual([])
    expect(pairs.map(([x, y]) => [x.id, y.id])).toEqual([
      ['a', 'h'],
      ['b', 'g'],
      ['c', 'f'],
      ['d', 'e'],
    ])
    // Every pair sums to the same combined skill (9) — perfectly balanced here.
    for (const [x, y] of pairs) expect(x.skill + y.skill).toBe(9)
  })

  it('leaves the median player unpaired (odd count)', () => {
    const players = [
      { id: 'a', skill: 8 },
      { id: 'b', skill: 7 },
      { id: 'c', skill: 6 },
      { id: 'd', skill: 5 },
      { id: 'e', skill: 4 },
      { id: 'f', skill: 3 },
      { id: 'g', skill: 2 },
    ]
    const { pairs, leftover } = snakePairs(players)
    expect(pairs.map(([x, y]) => [x.id, y.id])).toEqual([
      ['a', 'g'],
      ['b', 'f'],
      ['c', 'e'],
    ])
    expect(leftover.map((p) => p.id)).toEqual(['d'])
  })

  it('preserves input order among tied skills (stable sort)', () => {
    const players = [
      { id: 'a', skill: 5 },
      { id: 'b', skill: 5 },
      { id: 'c', skill: 5 },
      { id: 'd', skill: 5 },
    ]
    const { pairs } = snakePairs(players)
    // All tied: stable sort keeps a,b,c,d order, so cross-pairing is a+d, b+c.
    expect(pairs.map(([x, y]) => [x.id, y.id])).toEqual([
      ['a', 'd'],
      ['b', 'c'],
    ])
  })

  it('pairs nothing for fewer than two players', () => {
    expect(snakePairs([{ id: 'a', skill: 5 }])).toEqual({
      pairs: [],
      leftover: [{ id: 'a', skill: 5 }],
    })
    expect(snakePairs([])).toEqual({ pairs: [], leftover: [] })
  })
})
