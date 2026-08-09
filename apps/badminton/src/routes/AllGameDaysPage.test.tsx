import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MatchSession } from '../play/api'

const { state } = vi.hoisted(() => ({ state: { sessions: [] as MatchSession[] } }))

// AppShell carries the player search on every page now, so every page test
// needs the roster it reads.
vi.mock('../roster/useRoster', () => ({
  useRoster: () => ({ data: { clubId: 'c1', players: [] }, isLoading: false, isError: false }),
}))
vi.mock('../play/useMatchPlay', () => ({
  useSessions: () => ({ data: state.sessions, isLoading: false, isError: false }),
}))
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: 'matchmaker', signOut: vi.fn() }),
}))

import { AllGameDaysPage } from './AllGameDaysPage'

const session = (id: string, hidden: boolean): MatchSession => ({
  id,
  clubId: 'c1',
  status: 'finished',
  mode: 'open',
  kind: 'casual',
  rounds: 4,
  hidden,
  playedAt: '2026-07-05T18:00:00Z',
  createdAt: '2026-07-05T18:00:00Z',
})

function renderPage() {
  return render(
    <MemoryRouter>
      <AllGameDaysPage />
    </MemoryRouter>,
  )
}

describe('AllGameDaysPage (TASK-38)', () => {
  it('lists every game day, linking each to its scores page', () => {
    state.sessions = [session('s1', false), session('s2', true)]
    renderPage()
    expect(screen.getByTestId('game-day-s1')).toHaveAttribute('href', '/game-days/s1')
    expect(screen.getByTestId('game-day-s2')).toHaveAttribute('href', '/game-days/s2')
    // The hidden one is tagged "Off home"; the visible one is not.
    expect(screen.getByTestId('hidden-tag-s2')).toBeInTheDocument()
    expect(screen.queryByTestId('hidden-tag-s1')).toBeNull()
  })

  // Who started it, in the row's small print (TASK-86). Game days from before
  // the column was written have no name and nothing to recover one from, so
  // they say the role rather than a blank or an invented person.
  it('names the creator, falling back to the role when none was recorded', () => {
    state.sessions = [
      { ...session('s1', false), createdBy: 'u1', createdByName: 'Sahan' },
      session('s2', false),
    ]
    renderPage()
    expect(screen.getByTestId('game-day-s1')).toHaveTextContent('Sahan')
    const legacy = screen.getByTestId('game-day-s2')
    expect(legacy).toHaveTextContent('Matchmaker')
    expect(legacy).not.toHaveTextContent('Sahan')
  })

  it('shows an empty state when there are no game days', () => {
    state.sessions = []
    renderPage()
    expect(screen.getByText('No game days yet.')).toBeInTheDocument()
  })
})
