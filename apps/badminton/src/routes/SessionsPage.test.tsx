import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MatchSession } from '../play/api'

const { sessions } = vi.hoisted(() => ({
  sessions: [
    {
      id: 's1',
      clubId: 'c1',
      status: 'live',
      mode: 'mixed',
      rounds: 3,
      playedAt: '2026-06-22T10:00:00Z',
      createdAt: '2026-06-22T10:00:00Z',
    },
    {
      id: 's2',
      clubId: 'c1',
      status: 'finished',
      mode: 'open',
      rounds: 5,
      playedAt: '2026-06-21T18:00:00Z',
      createdAt: '2026-06-21T18:00:00Z',
    },
  ] satisfies MatchSession[],
}))

vi.mock('../play/useMatchPlay', () => ({
  useSessions: () => ({ data: sessions, isLoading: false, isError: false }),
}))
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: 'matchmaker', signOut: vi.fn() }),
}))

import { SessionsPage } from './SessionsPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <SessionsPage />
    </MemoryRouter>,
  )
}

describe('SessionsPage', () => {
  it('lists sessions linking to each scoring view', () => {
    renderPage()
    expect(screen.getByTestId('sessions')).toBeInTheDocument()
    const link = screen.getByTestId('session-s1')
    expect(link).toHaveAttribute('href', '/play/s1')
    expect(link).toHaveTextContent('Mixed doubles')
    expect(link).toHaveTextContent('Live')
    expect(screen.getByTestId('session-s2')).toHaveTextContent('Finished')
  })
})
