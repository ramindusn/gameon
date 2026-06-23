import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { FormMap, RatedPair, RatedPlayer } from '../ranking/api'

const { players, pairs, form, inactive } = vi.hoisted(() => ({
  players: [
    { playerId: 'p1', rating: 1600, rd: 50, games: 10 },
    { playerId: 'p2', rating: 1500, rd: 200, games: 1 }, // high RD -> provisional
  ] satisfies RatedPlayer[],
  pairs: [
    { player1Id: 'p1', player2Id: 'p2', rating: 1620, rd: 55, games: 6 },
  ] satisfies RatedPair[],
  form: { p1: ['W', 'L', 'W'] } satisfies FormMap,
  inactive: new Set(['p2']),
}))

vi.mock('../ranking/useRanking', () => ({
  usePlayerBoard: () => ({ data: players, isLoading: false, isError: false }),
  usePairBoard: () => ({ data: pairs, isLoading: false, isError: false }),
  useRecentForm: () => ({ data: form, isLoading: false, isError: false }),
  useInactivePlayers: () => ({ data: inactive, isLoading: false, isError: false }),
  useFixedPairStandings: () => ({ data: [], isLoading: false, isError: false }),
  usePlayerNames: () => (id: string | null) =>
    id === 'p1' ? 'Alice' : id === 'p2' ? 'Bob' : '—',
}))

import { LeaderboardPage } from './LeaderboardPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>,
  )
}

describe('LeaderboardPage', () => {
  it('renders both boards with names and ratings', () => {
    renderPage()
    expect(screen.getByTestId('leaderboard')).toBeInTheDocument()

    const p1 = screen.getByTestId('player-row-p1')
    expect(p1).toHaveTextContent('Alice')
    expect(p1).toHaveTextContent('1600')

    const pair = screen.getByTestId('pair-row-p1-p2')
    expect(pair).toHaveTextContent('Alice')
    expect(pair).toHaveTextContent('Bob')
    expect(pair).toHaveTextContent('1620')
  })

  it('flags a provisional (high-RD) player', () => {
    renderPage()
    expect(screen.getByTestId('player-row-p2')).toHaveTextContent('PROV')
    expect(screen.getByTestId('player-row-p1')).not.toHaveTextContent('PROV')
  })

  it('shows recent form pills for a player with history', () => {
    renderPage()
    const strip = screen.getByTestId('player-row-p1').querySelector('[data-testid="form-strip"]')
    expect(strip).toBeTruthy()
    expect(strip).toHaveTextContent('WLW')
  })

  it('tags a player absent from the latest game day as inactive', () => {
    renderPage()
    const p2 = screen.getByTestId('player-row-p2')
    expect(p2.querySelector('[data-testid="inactive-tag"]')).toBeTruthy()
    expect(
      screen.getByTestId('player-row-p1').querySelector('[data-testid="inactive-tag"]'),
    ).toBeNull()
  })
})
