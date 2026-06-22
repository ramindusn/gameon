import { describe, it, expect } from 'vitest'
import { mapRow } from './api'

describe('mapRow', () => {
  it('maps a plain player row to the domain Player', () => {
    expect(
      mapRow({
        id: 'p1',
        nickname: 'SmashKing',
        skill: 4,
        gender: 'male',
        absent: false,
        is_matchmaker: false,
        user_id: null,
      }),
    ).toEqual({
      id: 'p1',
      nickname: 'SmashKing',
      skill: 4,
      gender: 'male',
      absent: false,
      isMatchmaker: false,
      hasLogin: false,
    })
  })

  it('flags matchmakers (with a login) and absences; defaults gender to null', () => {
    const p = mapRow({
      id: 'p2',
      nickname: 'Rohan',
      skill: null,
      gender: null,
      absent: true,
      is_matchmaker: true,
      user_id: 'u2',
    })
    expect(p.isMatchmaker).toBe(true)
    expect(p.hasLogin).toBe(true)
    expect(p.absent).toBe(true)
    expect(p.skill).toBeNull()
    expect(p.gender).toBeNull()
  })
})
