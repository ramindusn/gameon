import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PlayerMatch } from '../play/api'

const { player, history } = vi.hoisted(() => ({
  player: {
    id: 'p1',
    nickname: 'Alice',
    skill: 6,
    gender: 'female',
    absent: false,
    isMatchmaker: false,
    hasLogin: false,
  },
  history: [
    {
      id: 'm1',
      date: '2026-06-20',
      mode: 'open',
      partnerId: 'p2',
      opponentIds: ['p3', 'p4'],
      scoreFor: 21,
      scoreAgainst: 15,
      won: true,
    },
    {
      id: 'm2',
      date: '2026-06-18',
      mode: 'mixed',
      partnerId: 'p3',
      opponentIds: ['p2', 'p4'],
      scoreFor: 18,
      scoreAgainst: 21,
      won: false,
    },
  ] as PlayerMatch[],
}))

vi.mock('../roster/api', () => ({
  getPlayer: (id: string) => Promise.resolve(id === 'p1' ? player : null),
}))

vi.mock('../play/api', () => ({
  loadPlayerHistory: () => Promise.resolve(history),
}))

vi.mock('../ranking/useRanking', () => ({
  usePlayerBoard: () => ({
    data: [{ playerId: 'p1', rating: 1632, rd: 60, games: 2 }],
  }),
  useRecentForm: () => ({ data: { p1: ['W', 'L'] } }),
  usePlayerNames: () => (id: string | null) =>
    ({ p2: 'Bob', p3: 'Cara', p4: 'Dan' })[id ?? ''] ?? '—',
}))

// Logged-out visitor → public view (base skill hidden).
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ role: null, signOut: vi.fn() }) }))

import { PlayerProfilePage } from './PlayerProfilePage'

function renderProfile(id = 'p1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/players/${id}`]}>
        <Routes>
          <Route path="/players/:id" element={<PlayerProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PlayerProfilePage', () => {
  it('shows the player name, rating and computed W/L record', async () => {
    renderProfile()
    expect(await screen.findByTestId('profile-name')).toHaveTextContent('Alice')
    const perf = screen.getByTestId('profile-performance')
    expect(perf).toHaveTextContent('1632')
    expect(perf).toHaveTextContent('1W – 1L')
  })

  it('hides the base skill from the public (shows only the live skill) (TASK-45)', async () => {
    renderProfile()
    await screen.findByTestId('profile-name')
    const perf = screen.getByTestId('profile-performance')
    // Public view: a plain "Skill" with the live value, no "base → now" arrow.
    expect(perf).not.toHaveTextContent('base → now')
    expect(perf).not.toHaveTextContent('→')
  })

  it('lists match history with partner, opponents and scores', async () => {
    renderProfile()
    const list = await screen.findByTestId('profile-history')
    expect(list).toHaveTextContent('Bob')
    expect(list).toHaveTextContent('Cara')
    expect(list).toHaveTextContent('21–15')
    expect(list).toHaveTextContent('18–21')
  })

  it('renders a not-found message for an unknown player', async () => {
    renderProfile('nope')
    expect(await screen.findByTestId('player-not-found')).toBeInTheDocument()
  })
})
