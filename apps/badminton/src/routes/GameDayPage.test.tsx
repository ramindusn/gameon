import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { MatchResult, MatchSession } from '../play/api'

const { state } = vi.hoisted(() => ({
  state: { data: null as { session: MatchSession; results: MatchResult[] } | null },
}))

vi.mock('../play/useMatchPlay', () => ({
  useSession: () => ({ data: state.data, isLoading: false, isError: false }),
}))

vi.mock('../ranking/useRanking', () => ({
  usePlayerNames: () => (id: string | null) =>
    id ? ({ p1: 'Siti', p2: 'Maya', p3: 'Alex', p4: 'Ryan' }[id] ?? id) : '—',
}))

import { GameDayPage } from './GameDayPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/game-days/s1']}>
      <Routes>
        <Route path="/game-days/:id" element={<GameDayPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const session: MatchSession = {
  id: 's1',
  clubId: 'c1',
  status: 'finished',
  mode: 'open',
  kind: 'casual',
  rounds: 1,
  playedAt: '2026-07-08T18:31:00Z',
  createdAt: '2026-07-08T18:31:00Z',
}

const result = (
  id: string,
  court: number,
  teamA: [string, string],
  teamB: [string, string],
  scoreA: number,
  scoreB: number,
): MatchResult => ({
  id,
  sessionId: 's1',
  round: 1,
  court,
  teamA,
  teamB,
  scoreA,
  scoreB,
  winner: scoreA > scoreB ? 'a' : 'b',
})

describe('GameDayPage (TASK-37)', () => {
  it('shows a not-found message when the game day does not exist', () => {
    state.data = null
    renderPage()
    expect(screen.getByTestId('game-day-not-found')).toBeInTheDocument()
  })

  it('ranks the day by net point differential and lists the match scores', () => {
    state.data = {
      session,
      results: [
        result('r1', 1, ['p1', 'p2'], ['p3', 'p4'], 21, 15), // p1,p2 +6 / p3,p4 -6
        result('r2', 2, ['p1', 'p3'], ['p2', 'p4'], 21, 19), // p1,p3 +2 / p2,p4 -2
      ],
    }
    renderPage()

    // Title from the game day's date.
    expect(screen.getByTestId('game-day-title')).toBeInTheDocument()

    // Standings: p1 +8, p2 +4, p3 -4, p4 -8 (net differential, strongest first).
    const standings = screen.getByTestId('game-day-standings')
    const order = Array.from(standings.querySelectorAll('tbody tr')).map(
      (tr) => tr.getAttribute('data-testid'),
    )
    expect(order).toEqual(['standing-p1', 'standing-p2', 'standing-p3', 'standing-p4'])
    expect(standings).toHaveTextContent('+8')
    expect(standings).toHaveTextContent('-8')
    // p1 went 2–0.
    expect(screen.getByTestId('standing-p1')).toHaveTextContent('2–0')

    // Match scores are listed per court.
    const scores = screen.getByTestId('game-day-scores')
    expect(scores).toHaveTextContent('Round 1')
    expect(screen.getByTestId('match-r1')).toHaveTextContent('21–15')
    expect(screen.getByTestId('match-r2')).toHaveTextContent('21–19')
  })
})
