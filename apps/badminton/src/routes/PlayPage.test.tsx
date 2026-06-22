import { describe, expect, it, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { MatchResult, MatchSession } from '../play/api'

const { setScore, setStatus, sessionData } = vi.hoisted(() => {
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
      scoreA: null,
      scoreB: null,
      winner: null,
    },
    {
      id: 'r2',
      sessionId: 's1',
      round: 1,
      court: 2,
      teamA: ['p5', 'p6'],
      teamB: ['p7', 'p8'],
      scoreA: 21,
      scoreB: 15,
      winner: 'a',
    },
  ]
  return {
    setScore: vi.fn(),
    setStatus: vi.fn(),
    sessionData: { session, results },
  }
})

vi.mock('../play/useMatchPlay', () => ({
  useSession: () => ({ data: sessionData, isLoading: false, isError: false }),
  useSetScore: () => ({ mutate: setScore, isPending: false }),
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
  beforeEach(() => {
    setScore.mockClear()
    setStatus.mockClear()
  })

  it('renders the session with player names and an existing winner', () => {
    renderPage()
    expect(screen.getByTestId('play')).toBeInTheDocument()
    expect(screen.getByText('Round 1')).toBeInTheDocument()
    // Names resolved from the roster.
    expect(screen.getByText(/Player 1 & Player 2/)).toBeInTheDocument()
    // Court 2 already has team A as winner.
    expect(screen.getByTestId('session-status')).toHaveTextContent('Live')
  })

  it('records point scores (winner derived) when a match is saved', () => {
    renderPage()
    fireEvent.change(screen.getByTestId('score-r1-a'), { target: { value: '21' } })
    fireEvent.change(screen.getByTestId('score-r1-b'), { target: { value: '18' } })
    fireEvent.click(screen.getByTestId('save-score-r1'))
    expect(setScore).toHaveBeenCalledWith({ resultId: 'r1', scoreA: 21, scoreB: 18 })
  })

  it('rejects tied scores with an inline error and no save', () => {
    renderPage()
    fireEvent.change(screen.getByTestId('score-r1-a'), { target: { value: '21' } })
    fireEvent.change(screen.getByTestId('score-r1-b'), { target: { value: '21' } })
    fireEvent.click(screen.getByTestId('save-score-r1'))
    expect(setScore).not.toHaveBeenCalled()
    expect(screen.getByTestId('score-error-r1')).toBeInTheDocument()
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
