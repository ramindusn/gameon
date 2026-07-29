import { describe, expect, it } from 'vitest'
import type { RatingHistoryPoint } from '../ranking/api'
import { computeImproving } from './improving'

// Rating after each game day, oldest→newest.
const pts = (...ratings: number[]): RatingHistoryPoint[] =>
  ratings.map((rating, i) => ({ sessionId: `s${i}`, playedAt: `2026-07-0${i + 1}`, rating }))

describe('computeImproving', () => {
  it('is false until there are at least a few game days of history', () => {
    expect(computeImproving(pts())).toEqual({ improving: false, gain: 0 })
    expect(computeImproving(pts(1500, 1520))).toEqual({ improving: false, gain: 0 })
  })

  it('flags a climbing rating and reports the gain over the window', () => {
    // ≤ 5 game days: compares to the first point (1500 → 1540 = +40).
    expect(computeImproving(pts(1500, 1490, 1540))).toEqual({ improving: true, gain: 40 })
  })

  it('is false when the rating fell or is flat over the window', () => {
    expect(computeImproving(pts(1540, 1520, 1500)).improving).toBe(false)
    expect(computeImproving(pts(1500, 1490, 1500)).improving).toBe(false) // net flat
  })

  it('only looks back ~5 game days, not the whole history', () => {
    // 8 game days: compares the last (1610) to 5 back (index 2 = 1400) → +210,
    // even though the very first day was higher (1500).
    const trend = computeImproving(pts(1500, 1450, 1400, 1450, 1500, 1550, 1580, 1610))
    expect(trend).toEqual({ improving: true, gain: 210 })
  })

  it('recognises a recovery even when the net-from-start is down', () => {
    // 8 game days, high start then dip-and-recover: last (1520) vs 5 back
    // (index 2 = 1450) → improving, though it started higher (1550).
    const trend = computeImproving(pts(1550, 1500, 1450, 1440, 1460, 1480, 1500, 1520))
    expect(trend).toEqual({ improving: true, gain: 70 })
  })

  it('rounds ratings so sub-point noise does not flip it', () => {
    expect(computeImproving(pts(1500.2, 1500.1, 1500.4)).improving).toBe(false) // all round to 1500
  })
})
