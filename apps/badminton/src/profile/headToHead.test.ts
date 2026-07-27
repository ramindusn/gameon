import { describe, expect, it } from 'vitest'
import type { PlayerMatch } from '../play/api'
import { computeOpponentStats, computePartnerStats, toughestOpponents } from './headToHead'

// A doubles match from the profile player's perspective.
const match = (
  partnerId: string | null,
  opponents: [string | null, string | null],
  won: boolean,
): PlayerMatch => ({
  id: `${partnerId}-${opponents.join('')}-${won}-${Math.random()}`,
  sessionId: 's1',
  date: '2026-07-01T00:00:00Z',
  mode: 'open',
  partnerId,
  opponentIds: opponents,
  scoreFor: won ? 21 : 15,
  scoreAgainst: won ? 15 : 21,
  won,
})

describe('computePartnerStats', () => {
  it('aggregates games + wins per partner and sorts most-played first', () => {
    const stats = computePartnerStats([
      match('alice', ['x', 'y'], true),
      match('alice', ['x', 'y'], false),
      match('alice', ['x', 'y'], true),
      match('bob', ['x', 'y'], true),
    ])
    expect(stats).toEqual([
      { playerId: 'alice', games: 3, wins: 2 },
      { playerId: 'bob', games: 1, wins: 1 },
    ])
  })

  it('breaks a games tie by the better record', () => {
    const stats = computePartnerStats([
      match('alice', ['x', 'y'], false),
      match('bob', ['x', 'y'], true),
    ])
    // Both played 1; bob (100%) ranks above alice (0%).
    expect(stats.map((s) => s.playerId)).toEqual(['bob', 'alice'])
  })

  it('ignores matches with no partner (a deleted slot)', () => {
    const stats = computePartnerStats([match(null, ['x', 'y'], true)])
    expect(stats).toEqual([])
  })
})

describe('computeOpponentStats', () => {
  it('counts both opponents in each match and records the player’s wins', () => {
    const stats = computeOpponentStats([
      match('p', ['x', 'y'], true), // beat x and y
      match('p', ['x', 'z'], false), // lost to x and z
    ])
    // x: faced twice, won once; y: once, won; z: once, lost. Sorted by games desc.
    expect(stats).toEqual([
      { playerId: 'x', games: 2, wins: 1 },
      { playerId: 'y', games: 1, wins: 1 },
      { playerId: 'z', games: 1, wins: 0 },
    ])
  })

  it('ignores null opponent slots', () => {
    const stats = computeOpponentStats([match('p', ['x', null], true)])
    expect(stats).toEqual([{ playerId: 'x', games: 1, wins: 1 }])
  })
})

describe('toughestOpponents', () => {
  it('ranks by lowest win-rate and drops opponents below the min-games floor', () => {
    const matches = [
      // vs hard: faced 3, won 0
      match('p', ['hard', 'a'], false),
      match('p', ['hard', 'b'], false),
      match('p', ['hard', 'c'], false),
      // vs mid: faced 2, won 1
      match('p', ['mid', 'd'], true),
      match('p', ['mid', 'e'], false),
      // vs easy: faced 2, won 2
      match('p', ['easy', 'f'], true),
      match('p', ['easy', 'g'], true),
      // vs oneoff: faced once (below floor of 2) — excluded
      match('p', ['oneoff', 'h'], false),
    ]
    const tough = toughestOpponents(matches, 2)
    expect(tough.map((o) => o.playerId)).toEqual(['hard', 'mid', 'easy'])
    expect(tough.find((o) => o.playerId === 'oneoff')).toBeUndefined()
  })
})
