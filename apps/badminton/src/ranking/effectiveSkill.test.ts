import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SKILL,
  effectiveSkill,
  matchOdds,
  resultsWeight,
  skillFromRating,
} from './effectiveSkill'

describe('skillFromRating', () => {
  it('maps the baseline rating to the mid skill and clamps to 1–10', () => {
    expect(skillFromRating(1500)).toBeCloseTo(5.5)
    expect(skillFromRating(1515)).toBeCloseTo(6.5) // +15 rating = +1 skill
    expect(skillFromRating(9999)).toBe(10)
    expect(skillFromRating(0)).toBe(1)
  })
})

describe('resultsWeight', () => {
  it('ramps from 0 to 1 over FULL_GAMES', () => {
    expect(resultsWeight(0)).toBe(0)
    expect(resultsWeight(4)).toBeCloseTo(0.5)
    expect(resultsWeight(8)).toBe(1)
    expect(resultsWeight(40)).toBe(1)
  })
})

describe('effectiveSkill', () => {
  it('uses the manual seed when there is no rating or no games', () => {
    expect(effectiveSkill(9, null, 0)).toBe(9)
    expect(effectiveSkill(3, 1500, 0)).toBe(3)
    expect(effectiveSkill(null, null, 0)).toBe(DEFAULT_SKILL)
  })

  it('fully uses the results skill once past FULL_GAMES', () => {
    // rating 1515 -> skill 6.5; 8+ games -> weight 1.
    expect(effectiveSkill(9, 1515, 20)).toBeCloseTo(6.5)
    expect(effectiveSkill(2, 1515, 20)).toBeCloseTo(6.5)
  })

  it('blends manual and results in between', () => {
    // 4 games -> weight 0.5; manual 9, results 6.5 -> 7.75.
    expect(effectiveSkill(9, 1515, 4)).toBeCloseTo(7.75)
  })
})

describe('matchOdds', () => {
  it('is a 50/50 toss-up with no favourite for equal skill', () => {
    const o = matchOdds(6, 6)
    expect(o.probA).toBeCloseTo(0.5)
    expect(o.favoured).toBeNull()
  })

  it('favours the stronger team and leans harder with a bigger gap', () => {
    const edge = matchOdds(7, 6) // 1-point team edge
    expect(edge.favoured).toBe('a')
    expect(edge.probA).toBeGreaterThan(0.6)
    expect(edge.probA).toBeLessThan(0.7)

    const bigger = matchOdds(8, 6) // 2-point edge leans further
    expect(bigger.favoured).toBe('a')
    expect(bigger.probA).toBeGreaterThan(edge.probA)
  })

  it('favours team B when it is stronger and is symmetric', () => {
    const o = matchOdds(6, 7)
    expect(o.favoured).toBe('b')
    expect(o.probA).toBeCloseTo(1 - matchOdds(7, 6).probA)
  })

  it('treats a hair-thin edge inside the even band as no favourite', () => {
    const o = matchOdds(6.05, 6)
    expect(o.favoured).toBeNull()
  })
})
