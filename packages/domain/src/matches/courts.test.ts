import { describe, expect, it } from 'vitest'
import { courtLabel, parseCourtNumbers } from './courts'

describe('parseCourtNumbers', () => {
  it('parses a comma-separated list', () => {
    expect(parseCourtNumbers('5, 6, 9')).toEqual([5, 6, 9])
  })

  it('tolerates messy spacing, trailing commas and space-only separators', () => {
    expect(parseCourtNumbers('  5 ,6,  9 ,')).toEqual([5, 6, 9])
    expect(parseCourtNumbers('5 6 9')).toEqual([5, 6, 9])
  })

  it('keeps non-contiguous numbers in the order given', () => {
    expect(parseCourtNumbers('12, 3, 7')).toEqual([12, 3, 7])
  })

  it('drops junk, zero, negatives and fractions rather than rejecting the lot', () => {
    expect(parseCourtNumbers('5, abc, 0, -2, 3.5, 6')).toEqual([5, 6])
  })

  it('keeps the first of a duplicate so two courts never share a label', () => {
    expect(parseCourtNumbers('5, 6, 5')).toEqual([5, 6])
  })

  it('returns nothing for empty or entirely unusable input', () => {
    expect(parseCourtNumbers('')).toEqual([])
    expect(parseCourtNumbers('   ')).toEqual([])
    expect(parseCourtNumbers('abc, ---')).toEqual([])
  })
})

describe('courtLabel', () => {
  it('maps the 1-based slot onto the list', () => {
    const nums = [5, 6, 9]
    expect(courtLabel(1, nums)).toBe(5)
    expect(courtLabel(2, nums)).toBe(6)
    expect(courtLabel(3, nums)).toBe(9)
  })

  it('falls back to the slot when no list is given', () => {
    expect(courtLabel(2)).toBe(2)
    expect(courtLabel(2, null)).toBe(2)
    expect(courtLabel(2, [])).toBe(2)
  })

  it('falls back to the slot for a court beyond the end of the list', () => {
    // 2 courts named, but the game day grew a third.
    expect(courtLabel(3, [5, 6])).toBe(3)
  })
})
