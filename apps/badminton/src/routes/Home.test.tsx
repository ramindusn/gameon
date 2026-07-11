import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { GameDayBoard, RatedPair, RatedPlayer } from '../ranking/api'

const { state } = vi.hoisted(() => ({
  state: {
    players: [] as RatedPlayer[],
    pairs: [] as RatedPair[],
    gameDay: null as GameDayBoard | null,
  },
}))

// Leaderboard always renders; empty boards just show their "no data" state.
vi.mock('../ranking/useRanking', () => ({
  usePlayerBoard: () => ({ data: state.players, isLoading: false, isError: false }),
  usePairBoard: () => ({ data: state.pairs, isLoading: false, isError: false }),
  useTournamentPairBoard: () => ({ data: [], isLoading: false, isError: false }),
  useGameDayBoard: () => ({ data: state.gameDay, isLoading: false, isError: false }),
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
  it('shows only the leaderboard when there is no game day yet', () => {
    state.players = []
    state.pairs = []
    state.gameDay = null
    renderHome()
    expect(screen.getAllByTestId('view-all-leaderboard').length).toBeGreaterThan(0)
    // The Scheduled Matches / Recent Results feeds were removed to declutter the
    // public home; only the game-day board (when present) and rankings remain.
    expect(screen.queryByText('Scheduled Matches')).toBeNull()
    expect(screen.queryByText('Recent Results')).toBeNull()
    expect(screen.queryByText('Latest Game Day')).toBeNull()
    expect(screen.queryByTestId('game-day-board')).toBeNull()
  })

  it('shows the latest game-day board ranked by point differential (TASK-33)', () => {
    state.players = []
    state.pairs = []
    state.gameDay = {
      sessionId: 's1',
      playedAt: '2026-07-10T18:00:00Z',
      standings: [
        // Deliberately out of order + a tie (p3/p4 both +5) to prove the UI
        // re-sorts by diff then nickname (Alex before Ryan).
        { playerId: 'p4', played: 3, wins: 1, diff: 5 },
        { playerId: 'p1', played: 3, wins: 3, diff: 22 },
        { playerId: 'p3', played: 3, wins: 1, diff: 5 },
        { playerId: 'p2', played: 3, wins: 0, diff: -18 },
      ],
    }
    renderHome()
    expect(screen.getByText('Latest Game Day')).toBeInTheDocument()
    const board = screen.getByTestId('game-day-board')
    expect(board).toHaveTextContent('+22')
    expect(board).toHaveTextContent('-18')
    // Row order: Siti (+22), Alex (+5), Ryan (+5, name tie-break), Maya (-18).
    const order = Array.from(board.querySelectorAll('tbody tr')).map(
      (tr) => tr.getAttribute('data-testid'),
    )
    expect(order).toEqual([
      'game-day-row-p1',
      'game-day-row-p3',
      'game-day-row-p4',
      'game-day-row-p2',
    ])
  })

  it('renders ranking tables with rank, name and rating', () => {
    state.gameDay = null
    state.pairs = [{ player1Id: 'p1', player2Id: 'p2', rating: 1450, rd: 50, games: 8 }]
    state.players = [{ playerId: 'p1', rating: 2450, rd: 40, games: 12 }]
    renderHome()
    expect(screen.getByTestId('doubles-ranking')).toHaveTextContent('1,450')
    expect(screen.getByTestId('individual-ranking')).toHaveTextContent('2,450')
  })
})
