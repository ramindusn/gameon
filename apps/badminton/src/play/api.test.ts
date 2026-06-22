import { describe, it, expect } from 'vitest'
import type { GeneratedMatches, MatchPlayer } from '@gameon/domain'
import { mapResultRow, mapSessionRow, planToResultRows } from './api'

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
        created_at: '2026-06-22T10:00:00Z',
      }),
    ).toEqual({
      id: 's1',
      clubId: 'c1',
      status: 'live',
      mode: 'mixed',
      rounds: 5,
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
        winner: 'b',
      }),
    ).toEqual({
      id: 'r1',
      sessionId: 's1',
      round: 2,
      court: 1,
      teamA: ['p1', 'p2'],
      teamB: ['p3', 'p4'],
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
