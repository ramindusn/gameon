import { describe, expect, it } from 'vitest'
import {
  buildFormMap,
  buildGameDayBoard,
  computeInactivePlayers,
  mapPairRatingRow,
  mapPlayerRatingRow,
  type FormResultRow,
  type GameDayResultRow,
} from './api'

describe('mapPlayerRatingRow', () => {
  it('maps a player_ratings row to camelCase', () => {
    expect(
      mapPlayerRatingRow({ player_id: 'p1', rating: 1532.4, rd: 80, games: 7 }),
    ).toEqual({ playerId: 'p1', rating: 1532.4, rd: 80, games: 7 })
  })
})

describe('mapPairRatingRow', () => {
  it('maps a pair_ratings row to camelCase', () => {
    expect(
      mapPairRatingRow({
        player1_id: 'p1',
        player2_id: 'p2',
        rating: 1600,
        rd: 60,
        games: 4,
      }),
    ).toEqual({ player1Id: 'p1', player2Id: 'p2', rating: 1600, rd: 60, games: 4 })
  })
})

describe('buildFormMap', () => {
  const row = (
    sessionId: string,
    createdAt: string,
    winner: 'a' | 'b',
    a: [string, string],
    b: [string, string],
  ): FormResultRow => ({ sessionId, createdAt, teamA: a, teamB: b, winner })

  it('records a win for the winning side and a loss for the other', () => {
    const form = buildFormMap([
      row('s1', '2026-06-20T10:00:00Z', 'a', ['p1', 'p2'], ['p3', 'p4']),
    ])
    expect(form.p1).toEqual(['W'])
    expect(form.p2).toEqual(['W'])
    expect(form.p3).toEqual(['L'])
    expect(form.p4).toEqual(['L'])
  })

  it('aggregates a game day: more wins than losses is a W', () => {
    const form = buildFormMap([
      row('s1', '2026-06-20T10:00:00Z', 'a', ['p1', 'p2'], ['p3', 'p4']),
      row('s1', '2026-06-20T11:00:00Z', 'a', ['p1', 'p9'], ['p5', 'p6']),
      row('s1', '2026-06-20T12:00:00Z', 'b', ['p1', 'p7'], ['p8', 'p9']),
    ])
    // p1: 2 wins, 1 loss across one game day -> single 'W'
    expect(form.p1).toEqual(['W'])
  })

  it('marks an even game day (equal wins/losses) as a draw', () => {
    const form = buildFormMap([
      row('s1', '2026-06-20T10:00:00Z', 'a', ['p1', 'p2'], ['p3', 'p4']),
      row('s1', '2026-06-20T11:00:00Z', 'b', ['p1', 'p5'], ['p6', 'p7']),
    ])
    expect(form.p1).toEqual(['D'])
  })

  it('orders days newest-first and caps at the limit', () => {
    const rows: FormResultRow[] = []
    for (let d = 1; d <= 12; d++) {
      const day = String(d).padStart(2, '0')
      // p1 wins every odd day, loses every even day; each day is its own session.
      const winner = d % 2 === 1 ? 'a' : 'b'
      rows.push(
        row(`s${d}`, `2026-06-${day}T10:00:00Z`, winner, ['p1', 'p2'], ['p3', 'p4']),
      )
    }
    const form = buildFormMap(rows, 10)
    expect(form.p1).toHaveLength(10)
    // newest day is d=12 (even -> loss for p1)
    expect(form.p1[0]).toBe('L')
    // next is d=11 (odd -> win)
    expect(form.p1[1]).toBe('W')
  })

  it('ignores null player slots', () => {
    const form = buildFormMap([
      {
        sessionId: 's1',
        createdAt: '2026-06-20T10:00:00Z',
        teamA: ['p1', null],
        teamB: ['p3', 'p4'],
        winner: 'a',
      },
    ])
    expect(form.p1).toEqual(['W'])
    expect(Object.keys(form)).not.toContain('null')
  })
})

describe('buildGameDayBoard', () => {
  const row = (
    a: [string | null, string | null],
    b: [string | null, string | null],
    scoreA: number,
    scoreB: number,
  ): GameDayResultRow => ({
    teamA: a,
    teamB: b,
    scoreA,
    scoreB,
    winner: scoreA > scoreB ? 'a' : 'b',
  })

  it('credits each player their team point differential and a win/loss', () => {
    const board = buildGameDayBoard([row(['p1', 'p2'], ['p3', 'p4'], 21, 15)])
    expect(board).toEqual([
      { playerId: 'p1', played: 1, wins: 1, diff: 6 },
      { playerId: 'p2', played: 1, wins: 1, diff: 6 },
      { playerId: 'p3', played: 1, wins: 0, diff: -6 },
      { playerId: 'p4', played: 1, wins: 0, diff: -6 },
    ])
  })

  it('sums a player’s differential across their matches on the day', () => {
    const board = buildGameDayBoard([
      row(['p1', 'p2'], ['p3', 'p4'], 21, 15), // p1 +6
      row(['p1', 'p5'], ['p6', 'p7'], 18, 21), // p1 -3
    ])
    const p1 = board.find((s) => s.playerId === 'p1')
    expect(p1).toEqual({ playerId: 'p1', played: 2, wins: 1, diff: 3 })
  })

  it('ranks by net differential, breaking ties by playerId', () => {
    const board = buildGameDayBoard([
      row(['pB', 'pA'], ['pC', 'pD'], 21, 10), // winners +11
      row(['pC', 'pD'], ['pE', 'pF'], 21, 19), // pC/pD +2 → net -9
    ])
    // pA & pB (+11) lead; tie broken pA before pB by id.
    expect(board.map((s) => s.playerId).slice(0, 2)).toEqual(['pA', 'pB'])
    expect(board[0].diff).toBe(11)
  })

  it('ignores null player slots', () => {
    const board = buildGameDayBoard([row(['p1', null], ['p3', 'p4'], 21, 15)])
    expect(board.map((s) => s.playerId)).toEqual(['p1', 'p3', 'p4'])
  })
})

describe('computeInactivePlayers (TASK-57)', () => {
  const gracePeriod = 5
  // One attendance row per player per one of the last `gracePeriod` finished
  // sessions (of any kind — the caller no longer filters to casual only).
  const absentAll = (playerId: string) =>
    Array.from({ length: gracePeriod }, () => ({ player_id: playerId, present: false }))

  it('flags a player absent from every one of the last gracePeriod sessions', () => {
    expect(computeInactivePlayers(absentAll('p1'), gracePeriod)).toEqual(['p1'])
  })

  it('does not flag a player who was present in any one of those sessions', () => {
    // Represents attendance at e.g. a tournament session that a casual-only
    // query would previously have missed entirely (the TASK-57 bug): being
    // seen at all resets the streak, matching the decay engine.
    const rows = [
      { player_id: 'p1', present: false },
      { player_id: 'p1', present: false },
      { player_id: 'p1', present: true },
      { player_id: 'p1', present: false },
      { player_id: 'p1', present: false },
    ]
    expect(computeInactivePlayers(rows, gracePeriod)).toEqual([])
  })

  it('does not flag a player with fewer than gracePeriod attendance records', () => {
    // e.g. a player who joined the club after some of the last 5 sessions.
    const rows = [
      { player_id: 'p1', present: false },
      { player_id: 'p1', present: false },
    ]
    expect(computeInactivePlayers(rows, gracePeriod)).toEqual([])
  })

  it('flags only the players who meet the streak, ignoring the rest', () => {
    const rows = [...absentAll('p1'), ...absentAll('p2').slice(0, 4)]
    rows.push({ player_id: 'p2', present: true }) // p2's 5th record is a play
    expect(computeInactivePlayers(rows, gracePeriod)).toEqual(['p1'])
  })
})
