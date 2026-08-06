import { describe, expect, it } from 'vitest'
import {
  buildFormMap,
  buildGameDayBoard,
  buildGameDayPairBoard,
  computeAttendance,
  computeInactivePlayers,
  computeRank,
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

describe('buildGameDayPairBoard (TASK-80)', () => {
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

  // In fixed pairs both partners always have identical numbers, so per-player
  // standings list every pair twice. The pair is what competes.
  it('gives one row per pair, not one per player', () => {
    const board = buildGameDayPairBoard([row(['p1', 'p2'], ['p3', 'p4'], 21, 15)])
    expect(board).toHaveLength(2)
    expect(board[0].players).toEqual(['p1', 'p2'])
    expect(board[0].diff).toBe(6)
    expect(board[0].wins).toBe(1)
    expect(board[1].diff).toBe(-6)
    expect(board[1].wins).toBe(0)
  })

  it('treats a pair the same whichever side of the net it is on', () => {
    const board = buildGameDayPairBoard([
      row(['p1', 'p2'], ['p3', 'p4'], 21, 15),
      row(['p4', 'p3'], ['p1', 'p2'], 21, 10), // same pairs, sides and order swapped
    ])
    expect(board).toHaveLength(2)
    expect(board.every((b) => b.played === 2)).toBe(true)
  })

  it('skips a half-empty team rather than inventing a pair', () => {
    const board = buildGameDayPairBoard([row(['p1', null], ['p3', 'p4'], 21, 15)])
    expect(board).toHaveLength(1)
    expect(board[0].players).toEqual(['p3', 'p4'])
  })

  // The substitution case: the team carries on, so its record stays in one row
  // rather than splitting when a member changes (TASK-80).
  it('keeps one row when a member is substituted mid-day', () => {
    const board = buildGameDayPairBoard([
      { ...row(['p1', 'p2'], ['p3', 'p4'], 21, 15), teamAId: 't1', teamBId: 't2' },
      // p2 out, p5 in — same team id.
      { ...row(['p1', 'p5'], ['p3', 'p4'], 21, 10), teamAId: 't1', teamBId: 't2' },
    ])
    expect(board).toHaveLength(2)
    const team = board.find((b) => b.pairId === 't1')!
    expect(team.played).toBe(2)
    expect(team.wins).toBe(2)
    expect(team.players).toEqual(['p1', 'p5']) // as it stands now
    expect(team.alsoPlayed).toEqual(['p2']) // who played earlier
  })

  it('falls back to the pair when a day has no team ids', () => {
    const board = buildGameDayPairBoard([row(['p1', 'p2'], ['p3', 'p4'], 21, 15)])
    expect(board[0].pairId).toBe('p1|p2')
    expect(board[0].alsoPlayed).toEqual([])
  })

  it('ranks by net differential', () => {
    const board = buildGameDayPairBoard([
      row(['p1', 'p2'], ['p3', 'p4'], 21, 5),
      row(['p5', 'p6'], ['p3', 'p4'], 21, 19),
    ])
    expect(board[0].players).toEqual(['p1', 'p2'])
    expect(board.at(-1)?.players).toEqual(['p3', 'p4'])
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

describe('computeAttendance (TASK-64)', () => {
  // Sessions newest-first.
  const order = ['s1', 's2', 's3', 's4', 's5']
  const row = (player_id: string, session_id: string, present: boolean) => ({
    player_id,
    session_id,
    present,
  })

  it('counts attended games and reports a zero streak when present in the newest', () => {
    const att = computeAttendance(
      [
        row('p1', 's1', true),
        row('p1', 's2', false),
        row('p1', 's3', true),
        row('p1', 's4', false),
      ],
      order,
    )
    expect(att.p1).toEqual({ attended: 2, missStreak: 0 })
  })

  it('counts the leading run of misses, stopping at the first present game day', () => {
    const att = computeAttendance(
      [row('p2', 's1', false), row('p2', 's2', false), row('p2', 's3', true)],
      order,
    )
    expect(att.p2).toEqual({ attended: 1, missStreak: 2 })
  })

  it('a full miss run gives a streak equal to the games they were rostered for', () => {
    const att = computeAttendance(
      [row('p3', 's1', false), row('p3', 's2', false), row('p3', 's3', false)],
      order,
    )
    expect(att.p3).toEqual({ attended: 0, missStreak: 3 })
  })

  it('skips sessions before a player joined — they neither count nor break the streak', () => {
    // No rows for s1/s2 (joined later): present s3, absent s4 → streak stays 0.
    const att = computeAttendance([row('p4', 's3', true), row('p4', 's4', false)], order)
    expect(att.p4).toEqual({ attended: 1, missStreak: 0 })
  })

  it('ignores session order in the input; the ordered ids define recency', () => {
    // Rows out of order; still: absent newest (s1), present s2 → streak 1.
    const att = computeAttendance([row('p5', 's2', true), row('p5', 's1', false)], order)
    expect(att.p5).toEqual({ attended: 1, missStreak: 1 })
  })
})

describe('computeRank (TASK-68)', () => {
  // Established players (rd < 150) by rating; e3 is inactive.
  const board = [
    { id: 'e1', rating: 1600, rd: 50 },
    { id: 'e2', rating: 1550, rd: 60 },
    { id: 'e3', rating: 1520, rd: 60 }, // inactive — sits mid-table by rating
    { id: 'e4', rating: 1500, rd: 55 },
    { id: 'e5', rating: 1480, rd: 55 },
    { id: 'p6', rating: 1400, rd: 200 }, // provisional (high rd)
  ]
  const inactive = new Set(['e3'])

  it('excludes inactive players from the rank count', () => {
    // e4 is rated below e1, e2, e3 — but e3 is inactive, so e4 is rank 3, not 4.
    expect(computeRank(board, 'e4', inactive)).toBe(3)
    expect(computeRank(board, 'e5', inactive)).toBe(4)
  })

  it('matches a plain count when nobody is inactive', () => {
    expect(computeRank(board, 'e4', new Set())).toBe(4)
  })

  it('gives an inactive player no rank, even when established', () => {
    expect(computeRank(board, 'e3', inactive)).toBeNull()
  })

  it('gives a provisional (high-RD) player no rank', () => {
    expect(computeRank(board, 'p6', inactive)).toBeNull()
  })

  it('returns null for an unknown player', () => {
    expect(computeRank(board, 'nope', inactive)).toBeNull()
  })

  it('the top active player is rank 1', () => {
    expect(computeRank(board, 'e1', inactive)).toBe(1)
  })
})
