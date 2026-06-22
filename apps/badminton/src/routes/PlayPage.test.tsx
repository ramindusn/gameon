import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { MatchResult, MatchSession } from '../play/api'

const { setResult, setStatus, sessionData } = vi.hoisted(() => {
  const session: MatchSession = {
    id: 's1',
    clubId: 'c1',
    status: 'live',
    mode: 'open',
    rounds: 1,
    playedAt: '2026-06-22T10:00:00Z',
    createdAt: '2026-06-22T10:00:00Z',
  }
  const results: MatchResult[] = [
    {
      id: 'r1',
      sessionId: 's1',
      round: 1,
      court: 1,
      teamA: ['p1', 'p2'],
      teamB: ['p3', 'p4'],
      winner: null,
    },
    {
      id: 'r2',
      sessionId: 's1',
      round: 1,
      court: 2,
      teamA: ['p5', 'p6'],
      teamB: ['p7', 'p8'],
      winner: 'a',
    },
  ]
  return {
    setResult: vi.fn(),
    setStatus: vi.fn(),
    sessionData: { session, results },
  }
})

vi.mock('../play/useMatchPlay', () => ({
  useSession: () => ({ data: sessionData, isLoading: false, isError: false }),
  useSetResult: () => ({ mutate: setResult, isPending: false }),
  useSetSessionStatus: () => ({ mutate: setStatus, isPending: false }),
  useUpdateSessionPlayedAt: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteSession: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../roster/useRoster', () => ({
  useRoster: () => ({
    data: {
      clubId: 'c1',
      players: Array.from({ length: 8 }, (_, i) => ({
        id: `p${i + 1}`,
        nickname: `Player ${i + 1}`,
        skill: 5,
        absent: false,
        isMatchmaker: false,
        hasLogin: false,
      })),
    },
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: 'matchmaker', signOut: vi.fn() }),
}))

import { PlayPage } from './PlayPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/play/s1']}>
      <Routes>
        <Route path="/play/:id" element={<PlayPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PlayPage', () => {
  it('renders the session with player names and an existing winner', () => {
    renderPage()
    expect(screen.getByTestId('play')).toBeInTheDocument()
    expect(screen.getByText('Round 1')).toBeInTheDocument()
    // Names resolved from the roster.
    expect(screen.getByText(/Player 1 & Player 2/)).toBeInTheDocument()
    // Court 2 already has team A as winner.
    expect(screen.getByTestId('session-status')).toHaveTextContent('Live')
  })

  it('records a winner when a team is tapped', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('pick-r1-b'))
    expect(setResult).toHaveBeenCalledWith({ resultId: 'r1', winner: 'b' })
  })

  it('finishes the session', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('finish-session'))
    expect(setStatus).toHaveBeenCalledWith('finished')
  })

  it('shows the game-day date and a two-step delete confirm', () => {
    renderPage()
    expect(screen.getByTestId('game-day-date')).toBeInTheDocument()
    // Delete is a guarded two-step action.
    expect(screen.queryByTestId('confirm-delete-game-day')).toBeNull()
    fireEvent.click(screen.getByTestId('delete-game-day'))
    expect(screen.getByTestId('confirm-delete-game-day')).toBeInTheDocument()
  })
})
