import { describe, expect, it } from 'vitest'
import { validateLineup } from './lineup'

describe('validateLineup', () => {
  it('accepts four distinct players', () => {
    expect(validateLineup(['a', 'b', 'c', 'd'])).toEqual({ ok: true })
  })

  it('rejects a duplicate player', () => {
    const r = validateLineup(['a', 'b', 'a', 'd'])
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/cannot appear twice/i)
  })

  it('rejects an empty slot (null)', () => {
    const r = validateLineup(['a', 'b', null, 'd'])
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/four players/i)
  })

  it('rejects an empty slot (empty string)', () => {
    expect(validateLineup(['a', 'b', 'c', '']).ok).toBe(false)
  })

  it('rejects the wrong number of players', () => {
    expect(validateLineup(['a', 'b', 'c']).ok).toBe(false)
    expect(validateLineup(['a', 'b', 'c', 'd', 'e']).ok).toBe(false)
  })
})
