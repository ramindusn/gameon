import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MatchSession } from '../play/api'

const { state } = vi.hoisted(() => ({ state: { sessions: [] as MatchSession[] } }))

vi.mock('../play/useMatchPlay', () => ({
  useSessions: () => ({ data: state.sessions, isLoading: false, isError: false }),
}))

// Leaderboard always renders; empty boards just show their "no data" state.
vi.mock('../ranking/useRanking', () => ({
  usePlayerBoard: () => ({ data: [], isLoading: false, isError: false }),
  usePairBoard: () => ({ data: [], isLoading: false, isError: false }),
  useRecentForm: () => ({ data: {}, isLoading: false, isError: false }),
  useInactivePlayers: () => ({ data: new Set(), isLoading: false, isError: false }),
  usePlayerNames: () => () => '—',
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

describe('Home (TASK-9.2)', () => {
  it('shows only the leaderboard when there are no draws', () => {
    state.sessions = []
    renderHome()
    expect(screen.getAllByTestId('view-all-leaderboard').length).toBeGreaterThan(0)
    expect(screen.queryByText('Game Days in Progress')).toBeNull()
    expect(screen.queryByText('Recent Game Days')).toBeNull()
  })

  it('shows in-progress and recent game days once draws exist', () => {
    state.sessions = [
      {
        id: 's1',
        clubId: 'c1',
        status: 'live',
        mode: 'open',
        rounds: 3,
        playedAt: '2026-06-22',
        createdAt: '2026-06-22',
      },
      {
        id: 's2',
        clubId: 'c1',
        status: 'finished',
        mode: 'mixed',
        rounds: 4,
        playedAt: '2026-06-18',
        createdAt: '2026-06-18',
      },
    ]
    renderHome()
    expect(screen.getByText('Game Days in Progress')).toBeInTheDocument()
    expect(screen.getByText('Recent Game Days')).toBeInTheDocument()
    expect(screen.getByTestId('session-card-s1')).toHaveTextContent('Live')
    expect(screen.getByTestId('session-card-s2')).toHaveTextContent('Mixed doubles')
  })
})
