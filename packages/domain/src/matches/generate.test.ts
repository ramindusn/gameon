import { describe, it, expect } from 'vitest'
import { generateRounds } from './generate'
import { makeMatchPlayer, seededRng } from './fixtures'
import type { Gender, MatchPlayer, Round } from './types'

function players(skills: number[], genders?: Gender[]): MatchPlayer[] {
  return skills.map((skill, i) =>
    makeMatchPlayer({ id: `p${i + 1}`, skill, gender: genders?.[i] }),
  )
}

// Every present player either plays in exactly one match or sits — never both,
// never twice, and everyone is accounted for.
function assertPlayOrSit(round: Round, presentIds: string[]) {
  const playing = round.matches.flatMap((m) => [...m[0], ...m[1]]).map((p) => p.id)
  const sitting = round.sitting.map((p) => p.id)
  const all = [...playing, ...sitting]
  expect(new Set(all).size).toBe(all.length) // no duplicates
  expect(new Set(all)).toEqual(new Set(presentIds)) // covers everyone
}

describe('generateRounds — open mode', () => {
  it('returns null with fewer than 4 present players', () => {
    expect(generateRounds(players([5, 5, 5]), 3)).toBeNull()
  })

  it('8 players → 2 courts, no sitting, play-or-sit holds each round', () => {
    const ps = players([10, 9, 8, 7, 6, 5, 4, 3])
    const res = generateRounds(ps, 4, { rng: seededRng(1) })!
    expect(res).not.toBeNull()
    expect(res.courts).toBe(2)
    expect(res.sittingCount).toBe(0)
    expect(res.rounds).toHaveLength(4)
    const ids = ps.map((p) => p.id)
    for (const round of res.rounds) {
      expect(round.matches).toHaveLength(2)
      assertPlayOrSit(round, ids)
    }
  })

  it('is deterministic for a fixed seed', () => {
    const ps = players([10, 9, 8, 7, 6, 5, 4, 3])
    const a = generateRounds(ps, 4, { rng: seededRng(42) })
    const b = generateRounds(ps, 4, { rng: seededRng(42) })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('balances each court (team skill sums close)', () => {
    const ps = players([10, 9, 8, 7, 6, 5, 4, 3])
    const res = generateRounds(ps, 3, { rng: seededRng(7) })!
    for (const round of res.rounds) {
      for (const [a, b] of round.matches) {
        const diff = Math.abs(a[0].skill + a[1].skill - (b[0].skill + b[1].skill))
        expect(diff).toBeLessThanOrEqual(4)
      }
    }
  })

  it('6 players → 1 court + 2 sitting; rotates who sits', () => {
    const ps = players([8, 7, 6, 5, 4, 3])
    const res = generateRounds(ps, 6, { rng: seededRng(3) })!
    expect(res.courts).toBe(1)
    expect(res.sittingCount).toBe(2)
    const sitCounts = new Map<string, number>()
    for (const round of res.rounds) {
      assertPlayOrSit(
        round,
        ps.map((p) => p.id),
      )
      round.sitting.forEach((p) => sitCounts.set(p.id, (sitCounts.get(p.id) ?? 0) + 1))
    }
    // Over 6 rounds with 2 sitting each (12 seats / 6 players), everyone sits.
    expect(sitCounts.size).toBe(6)
  })
})

describe('generateRounds — court cap (opts.courts)', () => {
  const M: Gender = 'male'
  const F: Gender = 'female'

  it('open: caps 8 players (auto 2 courts) to 1, sending 4 to sit', () => {
    const ps = players([10, 9, 8, 7, 6, 5, 4, 3])
    const res = generateRounds(ps, 4, { courts: 1, rng: seededRng(1) })!
    expect(res.courts).toBe(1)
    expect(res.sittingCount).toBe(4)
    const ids = ps.map((p) => p.id)
    for (const round of res.rounds) {
      expect(round.matches).toHaveLength(1)
      assertPlayOrSit(round, ids)
    }
  })

  it('open: omitting courts keeps the auto value (2 for 8 players)', () => {
    const ps = players([10, 9, 8, 7, 6, 5, 4, 3])
    expect(generateRounds(ps, 3, { rng: seededRng(1) })!.courts).toBe(2)
  })

  it('open: a cap above the auto max is ignored', () => {
    const ps = players([10, 9, 8, 7, 6, 5, 4, 3])
    expect(generateRounds(ps, 3, { courts: 5, rng: seededRng(1) })!.courts).toBe(2)
  })

  it('open: a cap below 1 is clamped to 1 court', () => {
    const ps = players([10, 9, 8, 7, 6, 5, 4, 3])
    expect(generateRounds(ps, 3, { courts: 0, rng: seededRng(1) })!.courts).toBe(1)
  })

  it('mixed: caps to 1 court while keeping male+female pairs', () => {
    const ps = players([9, 7, 8, 6, 5, 4, 7, 3], [M, F, M, F, M, F, M, F])
    const res = generateRounds(ps, 3, { mode: 'mixed', courts: 1, rng: seededRng(5) })!
    expect(res.courts).toBe(1)
    for (const round of res.rounds) {
      expect(round.matches).toHaveLength(1)
      for (const team of round.matches.flatMap((m) => m)) {
        expect(team.map((p) => p.gender).sort()).toEqual(['female', 'male'])
      }
      assertPlayOrSit(
        round,
        ps.map((p) => p.id),
      )
    }
  })
})

describe('generateRounds — mixed mode', () => {
  const M: Gender = 'male'
  const F: Gender = 'female'

  it('every pair is one male + one female', () => {
    const ps = players([9, 7, 8, 6, 5, 4, 7, 3], [M, F, M, F, M, F, M, F])
    const res = generateRounds(ps, 4, { mode: 'mixed', rng: seededRng(5) })!
    expect(res).not.toBeNull()
    expect(res.courts).toBe(2)
    expect(res.unplaceable).toHaveLength(0)
    for (const round of res.rounds) {
      for (const team of round.matches.flatMap((m) => m)) {
        const genders = team.map((p) => p.gender).sort()
        expect(genders).toEqual(['female', 'male'])
      }
      assertPlayOrSit(
        round,
        ps.map((p) => p.id),
      )
    }
  })

  it('reports players without a usable gender as unplaceable', () => {
    const ps = players([9, 7, 8, 6, 5], [M, F, M, F, 'other'])
    const res = generateRounds(ps, 2, { mode: 'mixed', rng: seededRng(9) })!
    expect(res.courts).toBe(1)
    expect(res.unplaceable.map((p) => p.id)).toEqual(['p5'])
  })

  it('returns null when one gender is too scarce for a single court', () => {
    const ps = players([9, 7, 8, 6], [M, M, M, F]) // only 1 female
    expect(generateRounds(ps, 3, { mode: 'mixed', rng: seededRng(2) })).toBeNull()
  })
})
