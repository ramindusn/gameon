import { describe, it, expect } from 'vitest'
import {
  DEFAULT_RD,
  DEFAULT_RATING,
  defaultGlicko2,
  updateGlicko2,
  type Glicko2Game,
} from './glicko2'

describe('updateGlicko2', () => {
  // Glickman's worked example (glicko2.pdf §example): a 1500/200/0.06 player,
  // τ=0.5, faces three opponents — beats 1400/30, loses to 1550/100 and
  // 1700/300. Published result: rating≈1464.06, RD≈151.52, vol≈0.05999.
  it('matches the published Glicko-2 worked example', () => {
    const games: Glicko2Game[] = [
      { rating: 1400, rd: 30, score: 1 },
      { rating: 1550, rd: 100, score: 0 },
      { rating: 1700, rd: 300, score: 0 },
    ]
    const out = updateGlicko2({ rating: 1500, rd: 200, vol: 0.06 }, games)
    expect(out.rating).toBeCloseTo(1464.06, 1)
    expect(out.rd).toBeCloseTo(151.52, 1)
    expect(out.vol).toBeCloseTo(0.05999, 4)
  })

  it('raises rating on a win and lowers it on a loss', () => {
    const base = defaultGlicko2()
    const opp = { rating: DEFAULT_RATING, rd: DEFAULT_RD }
    const win = updateGlicko2(base, [{ ...opp, score: 1 }])
    const loss = updateGlicko2(base, [{ ...opp, score: 0 }])
    expect(win.rating).toBeGreaterThan(DEFAULT_RATING)
    expect(loss.rating).toBeLessThan(DEFAULT_RATING)
  })

  it('shrinks RD when an entity plays (more certainty)', () => {
    const out = updateGlicko2(defaultGlicko2(), [
      { rating: 1500, rd: 50, score: 1 },
    ])
    expect(out.rd).toBeLessThan(DEFAULT_RD)
  })

  it('inflates RD but holds rating/volatility when idle (no games)', () => {
    const start = { rating: 1600, rd: 80, vol: 0.06 }
    const out = updateGlicko2(start, [])
    expect(out.rating).toBe(1600)
    expect(out.vol).toBe(0.06)
    expect(out.rd).toBeGreaterThan(80)
  })

  it('caps idle RD inflation at the default deviation', () => {
    const out = updateGlicko2({ rating: 1500, rd: 340, vol: 0.06 }, [])
    expect(out.rd).toBeLessThanOrEqual(DEFAULT_RD)
  })

  it('moves a low-RD opponent loss more than a high-RD opponent loss', () => {
    const base = defaultGlicko2()
    const sure = updateGlicko2(base, [{ rating: 1500, rd: 30, score: 0 }])
    const unsure = updateGlicko2(base, [{ rating: 1500, rd: 300, score: 0 }])
    // A confident (low-RD) opponent yields a more informative update.
    expect(sure.rating).toBeLessThan(unsure.rating)
  })
})
