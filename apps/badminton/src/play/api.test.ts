import { describe, it, expect } from 'vitest'
import type { GeneratedMatches, MatchPlayer } from '@gameon/domain'
import { mapResultRow, mapSessionRow, newestMatchFirst, planToResultRows } from './api'
import type { PlayerMatch } from './api'

const player = (id: string, skill = 5): MatchPlayer => ({ id, skill })

describe('mapSessionRow', () => {
  it('maps a session row to the domain shape', () => {
    expect(
      mapSessionRow({
        id: 's1',
        club_id: 'c1',
        status: 'live',
        mode: 'mixed',
        rounds: 5,
        played_at: '2026-06-22T09:00:00Z',
        created_at: '2026-06-22T10:00:00Z',
      }),
    ).toEqual({
      id: 's1',
      clubId: 'c1',
      status: 'live',
      mode: 'mixed',
      kind: 'casual',
      rounds: 5,
      hidden: false,
      playedAt: '2026-06-22T09:00:00Z',
      createdAt: '2026-06-22T10:00:00Z',
    })
  })
})

describe('mapResultRow', () => {
  it('groups the four player ids into teams and keeps the winner', () => {
    expect(
      mapResultRow({
        id: 'r1',
        session_id: 's1',
        round: 2,
        court: 1,
        team_a1: 'p1',
        team_a2: 'p2',
        team_b1: 'p3',
        team_b2: 'p4',
        score_a: 21,
        score_b: 15,
        winner: 'b',
      }),
    ).toEqual({
      id: 'r1',
      sessionId: 's1',
      round: 2,
      court: 1,
      teamA: ['p1', 'p2'],
      // Casual rows carry no team identity; tournaments do (TASK-80).
      teamAId: null,
      teamBId: null,
      teamB: ['p3', 'p4'],
      scoreA: 21,
      scoreB: 15,
      winner: 'b',
    })
  })

  it('preserves null winner and null (deleted) players', () => {
    const r = mapResultRow({
      id: 'r2',
      session_id: 's1',
      round: 1,
      court: 1,
      team_a1: null,
      team_a2: 'p2',
      team_b1: 'p3',
      team_b2: 'p4',
      score_a: null,
      score_b: null,
      winner: null,
    })
    expect(r.winner).toBeNull()
    expect(r.teamA).toEqual([null, 'p2'])
  })
})

describe('planToResultRows', () => {
  const plan: GeneratedMatches = {
    courts: 1,
    sittingCount: 0,
    totalPlayers: 4,
    unplaceable: [],
    rounds: [
      {
        courts: 1,
        sitting: [],
        matches: [
          [
            [player('p1'), player('p2')],
            [player('p3'), player('p4')],
          ],
        ],
      },
      {
        courts: 1,
        sitting: [],
        matches: [
          [
            [player('p1'), player('p3')],
            [player('p2'), player('p4')],
          ],
        ],
      },
    ],
  }

  it('flattens rounds/courts into one row per court with 1-based numbers', () => {
    const rows = planToResultRows(plan, 's1', 'c1')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      club_id: 'c1',
      session_id: 's1',
      round: 1,
      court: 1,
      team_a1: 'p1',
      team_a2: 'p2',
      team_b1: 'p3',
      team_b2: 'p4',
    })
    expect(rows[1].round).toBe(2)
    expect(rows[1].team_a2).toBe('p3')
  })

  it('emits a row for every court across multi-court rounds', () => {
    const twoCourts: GeneratedMatches = {
      ...plan,
      courts: 2,
      totalPlayers: 8,
      rounds: [
        {
          courts: 2,
          sitting: [],
          matches: [
            [
              [player('p1'), player('p2')],
              [player('p3'), player('p4')],
            ],
            [
              [player('p5'), player('p6')],
              [player('p7'), player('p8')],
            ],
          ],
        },
      ],
    }
    const rows = planToResultRows(twoCourts, 's2', 'c1')
    expect(rows.map((r) => r.court)).toEqual([1, 2])
    expect(rows[1].team_b2).toBe('p8')
  })
})

describe('newestMatchFirst', () => {
  const m = (id: string, date: string, round: number) =>
    ({ id, sessionId: `s-${date}`, round, date, mode: 'open', partnerId: null,
       opponentIds: [null, null], scoreFor: 0, scoreAgainst: 0, won: false }) as PlayerMatch

  it('puts the most recent game day first', () => {
    const out = [m('a', '2026-07-01', 1), m('b', '2026-08-01', 1)].sort(newestMatchFirst)
    expect(out.map((x) => x.id)).toEqual(['b', 'a'])
  })

  // The bug: days sorted, matches within a day did not, because the query has
  // no ORDER BY and nothing broke the tie.
  it('puts the later round first within the same game day', () => {
    const out = [m('r1', '2026-08-01', 1), m('r5', '2026-08-01', 5), m('r3', '2026-08-01', 3)]
      .sort(newestMatchFirst)
    expect(out.map((x) => x.id)).toEqual(['r5', 'r3', 'r1'])
  })

  it('keeps whole days together rather than interleaving them', () => {
    const out = [
      m('old-r2', '2026-07-01', 2),
      m('new-r1', '2026-08-01', 1),
      m('old-r1', '2026-07-01', 1),
      m('new-r2', '2026-08-01', 2),
    ].sort(newestMatchFirst)
    expect(out.map((x) => x.id)).toEqual(['new-r2', 'new-r1', 'old-r2', 'old-r1'])
  })
})
