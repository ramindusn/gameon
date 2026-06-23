import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { RatedPair, RatedPlayer } from '../ranking/api'
import type { RecentResult, ScheduledMatch } from '../play/api'

const { state } = vi.hoisted(() => ({
  state: {
    scheduled: [] as ScheduledMatch[],
    recent: [] as RecentResult[],
    players: [] as RatedPlayer[],
    pairs: [] as RatedPair[],
  },
}))

vi.mock('../play/useMatchPlay', () => ({
  useScheduledMatches: () => ({ data: state.scheduled, isLoading: false, isError: false }),
  useRecentResults: () => ({ data: state.recent, isLoading: false, isError: false }),
}))

// Leaderboard always renders; empty boards just show their "no data" state.
vi.mock('../ranking/useRanking', () => ({
  usePlayerBoard: () => ({ data: state.players, isLoading: false, isError: false }),
  usePairBoard: () => ({ data: state.pairs, isLoading: false, isError: false }),
  usePlayerNames: () => (id: string | null) =>
    id ? ({ p1: 'Siti', p2: 'Maya', p3: 'Alex', p4: 'Ryan' }[id] ?? id) : '—',
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: null, signOut: vi.fn() }),
}))

vi.mock('../search/SearchBox', () => ({ SearchBox: () => null }))

import { Home } from './Home'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home (TASK-9.5)', () => {
  it('shows only the leaderboard when there are no game days', () => {
    state.scheduled = []
    state.recent = []
    state.players = []
    state.pairs = []
    renderHome()
    expect(screen.getAllByTestId('view-all-leaderboard').length).toBeGreaterThan(0)
    expect(screen.queryByText('Scheduled Matches')).toBeNull()
    expect(screen.queryByText('Recent Results')).toBeNull()
  })

  it('renders scheduled match cards with the side ratings', () => {
    state.scheduled = [
      {
        id: 'm1',
        playedAt: '2026-06-22T18:30',
        mode: 'open',
        court: 3,
        teamA: ['p1', 'p2'],
        teamB: ['p3', 'p4'],
      },
    ]
    state.pairs = [
      { player1Id: 'p1', player2Id: 'p2', rating: 1450, rd: 50, games: 8 },
      { player1Id: 'p3', player2Id: 'p4', rating: 1420, rd: 60, games: 7 },
    ]
    renderHome()
    const card = screen.getByTestId('scheduled-m1')
    expect(card).toHaveTextContent('Court #3')
    expect(card).toHaveTextContent('Siti')
    expect(card).toHaveTextContent('Rating: 1,450')
  })

  it('hides the side rating when the pair has no match history', () => {
    state.scheduled = [
      {
        id: 'm1',
        playedAt: '2026-06-22T18:30',
        mode: 'open',
        court: 3,
        teamA: ['p1', 'p2'],
        teamB: ['p3', 'p4'],
      },
    ]
    // Players have individual standings, but the partnerships are not on the
    // pair board, so no doubles rating should be shown for either side.
    state.players = [
      { playerId: 'p1', rating: 1500, rd: 40, games: 12 },
      { playerId: 'p2', rating: 1400, rd: 40, games: 9 },
    ]
    state.pairs = []
    renderHome()
    const card = screen.getByTestId('scheduled-m1')
    expect(card).not.toHaveTextContent('Rating:')
  })

  it('renders recent results with the winner and score', () => {
    state.scheduled = []
    state.recent = [
      {
        id: 'r1',
        playedAt: new Date().toISOString(),
        mode: 'open',
        court: 1,
        teamA: ['p1', 'p2'],
        teamB: ['p3', 'p4'],
        scoreA: 21,
        scoreB: 18,
        winner: 'a',
      },
    ]
    renderHome()
    const row = screen.getByTestId('result-r1')
    expect(row).toHaveTextContent('21')
    expect(row).toHaveTextContent('18')
    expect(row).toHaveTextContent('Winner')
    expect(row).toHaveTextContent('Finalist')
  })

  it('renders ranking tables with rank, name and rating', () => {
    state.scheduled = []
    state.recent = []
    state.pairs = [{ player1Id: 'p1', player2Id: 'p2', rating: 1450, rd: 50, games: 8 }]
    state.players = [{ playerId: 'p1', rating: 2450, rd: 40, games: 12 }]
    renderHome()
    expect(screen.getByTestId('doubles-ranking')).toHaveTextContent('1,450')
    expect(screen.getByTestId('individual-ranking')).toHaveTextContent('2,450')
  })
})
