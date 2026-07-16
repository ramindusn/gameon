import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SKILL,
  effectiveSkill,
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
