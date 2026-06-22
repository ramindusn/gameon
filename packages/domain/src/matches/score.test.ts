import { describe, expect, it } from 'vitest'
import { deriveWinner, validateScores } from './score'

describe('validateScores', () => {
  it('accepts two distinct non-negative integers', () => {
    expect(validateScores(21, 15).ok).toBe(true)
    expect(validateScores(0, 21).ok).toBe(true)
  })

  it('rejects missing scores', () => {
    expect(validateScores(null, 15)).toMatchObject({ ok: false })
    expect(validateScores(21, undefined)).toMatchObject({ ok: false })
  })

  it('rejects negative scores', () => {
    const v = validateScores(-1, 5)
    expect(v.ok).toBe(false)
    expect(v.error).toMatch(/negative/i)
  })

  it('rejects non-integer scores', () => {
    expect(validateScores(21.5, 15).ok).toBe(false)
  })

  it('rejects a tie', () => {
    const v = validateScores(21, 21)
    expect(v.ok).toBe(false)
    expect(v.error).toMatch(/tie/i)
  })
})

describe('deriveWinner', () => {
  it('returns the higher-scoring side', () => {
    expect(deriveWinner(21, 15)).toBe('a')
    expect(deriveWinner(18, 21)).toBe('b')
  })

  it('returns null for invalid scores', () => {
    expect(deriveWinner(21, 21)).toBeNull()
    expect(deriveWinner(null, 10)).toBeNull()
    expect(deriveWinner(-3, 10)).toBeNull()
  })
})
