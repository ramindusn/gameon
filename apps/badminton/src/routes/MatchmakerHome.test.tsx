import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MatchSession } from '../play/api'

const { state } = vi.hoisted(() => ({
  state: {
    sessions: [] as MatchSession[],
    playerCounts: {} as Record<string, number>,
  },
}))

vi.mock('../play/useMatchPlay', () => ({
  useSessions: () => ({ data: state.sessions, isLoading: false, isError: false }),
  useSessionPlayerCounts: () => ({ data: state.playerCounts }),
}))
vi.mock('../roster/useRoster', () => ({
  useRoster: () => ({ data: { clubId: 'c1', players: [] }, isLoading: false, isError: false }),
}))
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: 'matchmaker', signOut: vi.fn() }),
}))

import { MatchmakerHome } from './MatchmakerHome'

function session(id: string, status: 'live' | 'finished'): MatchSession {
  return {
    id,
    clubId: 'c1',
    status,
    mode: 'open',
    kind: 'casual',
    rounds: 5,
    playedAt: '2026-06-22T18:00:00Z',
    createdAt: '2026-06-22T18:00:00Z',
  }
}

function renderHome() {
  return render(
    <MemoryRouter>
      <MatchmakerHome />
    </MemoryRouter>,
  )
}

describe('MatchmakerHome (TASK-11.1)', () => {
  it('renders the matchmaker home', () => {
    state.sessions = []
    state.playerCounts = {}
    renderHome()
    expect(screen.getByTestId('matchmaker-home')).toBeInTheDocument()
    // The redundant quick-action buttons were removed (nav handles those).
    expect(screen.queryByTestId('action-generate')).toBeNull()
  })

  it('lists live game days with a resume link, before finished ones', () => {
    state.sessions = [session('s1', 'live'), session('s2', 'finished')]
    state.playerCounts = {}
    renderHome()
    expect(screen.getByTestId('resume-s1')).toHaveAttribute('href', '/play/s1')
    expect(screen.queryByTestId('live-empty')).toBeNull()
    // The finished game day shows under recent, not live.
    expect(screen.getByTestId('recent-s2')).toHaveAttribute('href', '/play/s2')
    expect(screen.queryByTestId('live-s2')).toBeNull()
  })

  it('shows an empty-state CTA when no game day is live', () => {
    state.sessions = [session('s2', 'finished')]
    state.playerCounts = {}
    renderHome()
    expect(screen.getByTestId('live-empty')).toBeInTheDocument()
    expect(screen.getByTestId('live-empty-generate')).toHaveAttribute('href', '/generate')
  })

  it("shows the live game day's own player count, not the whole roster", () => {
    state.sessions = [session('s1', 'live')]
    state.playerCounts = { s1: 9 }
    renderHome()
    expect(screen.getByTestId('live-active-s1')).toHaveTextContent('9 players')
    // The roster widget is gone.
    expect(screen.queryByTestId('roster-snapshot')).toBeNull()
  })
})
