import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MatchSession } from '../play/api'
import type { Player } from '../roster/api'

const { state } = vi.hoisted(() => ({
  state: {
    sessions: [] as MatchSession[],
    players: [] as Player[],
  },
}))

vi.mock('../play/useMatchPlay', () => ({
  useSessions: () => ({ data: state.sessions, isLoading: false, isError: false }),
}))
vi.mock('../roster/useRoster', () => ({
  useRoster: () => ({
    data: { clubId: 'c1', players: state.players },
    isLoading: false,
    isError: false,
  }),
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
    rounds: 5,
    playedAt: '2026-06-22T18:00:00Z',
    createdAt: '2026-06-22T18:00:00Z',
  }
}

function player(id: string, absent: boolean): Player {
  return {
    id,
    nickname: id,
    skill: 5,
    gender: null,
    absent,
    isMatchmaker: false,
    hasLogin: false,
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
  it('offers quick actions to start a draw and manage players', () => {
    state.sessions = []
    state.players = []
    renderHome()
    expect(screen.getByTestId('action-generate')).toHaveAttribute('href', '/generate')
    expect(screen.getByTestId('action-players')).toHaveAttribute('href', '/players')
  })

  it('lists live game days with a resume link, before finished ones', () => {
    state.sessions = [session('s1', 'live'), session('s2', 'finished')]
    state.players = []
    renderHome()
    expect(screen.getByTestId('resume-s1')).toHaveAttribute('href', '/play/s1')
    expect(screen.queryByTestId('live-empty')).toBeNull()
    // The finished game day shows under recent, not live.
    expect(screen.getByTestId('recent-s2')).toHaveAttribute('href', '/play/s2')
    expect(screen.queryByTestId('live-s2')).toBeNull()
  })

  it('shows an empty-state CTA when no game day is live', () => {
    state.sessions = [session('s2', 'finished')]
    state.players = []
    renderHome()
    expect(screen.getByTestId('live-empty')).toBeInTheDocument()
    expect(screen.getByTestId('live-empty-generate')).toHaveAttribute('href', '/generate')
  })

  it('shows a present/absent/total roster snapshot', () => {
    state.sessions = []
    state.players = [player('p1', false), player('p2', false), player('p3', true)]
    renderHome()
    const snap = screen.getByTestId('roster-snapshot')
    expect(snap).toHaveTextContent('2Present')
    expect(snap).toHaveTextContent('1Absent')
    expect(snap).toHaveTextContent('3Total')
  })
})
