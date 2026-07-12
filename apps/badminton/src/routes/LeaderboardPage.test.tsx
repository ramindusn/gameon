import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { FormMap, RatedPair, RatedPlayer } from '../ranking/api'

const { players, pairs, form, inactive } = vi.hoisted(() => ({
  players: [
    { playerId: 'p1', rating: 1600, rd: 50, games: 10 }, // established, has form
    { playerId: 'p3', rating: 1550, rd: 60, games: 9 }, // established, inactive
    { playerId: 'p2', rating: 1500, rd: 200, games: 1 }, // provisional (high RD)
  ] satisfies RatedPlayer[],
  pairs: [
    { player1Id: 'p1', player2Id: 'p3', rating: 1620, rd: 55, games: 6 }, // established
    { player1Id: 'p2', player2Id: 'p3', rating: 1580, rd: 210, games: 1 }, // provisional
  ] satisfies RatedPair[],
  form: { p1: ['W', 'L', 'W'] } satisfies FormMap,
  inactive: new Set(['p3']),
}))

vi.mock('../ranking/useRanking', () => ({
  usePlayerBoard: () => ({ data: players, isLoading: false, isError: false }),
  usePairBoard: () => ({ data: pairs, isLoading: false, isError: false }),
  useRecentForm: () => ({ data: form, isLoading: false, isError: false }),
  useInactivePlayers: () => ({ data: inactive, isLoading: false, isError: false }),
  usePlayerNames: () => (id: string | null) =>
    id === 'p1' ? 'Alice' : id === 'p2' ? 'Bob' : id === 'p3' ? 'Cara' : '—',
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
  it('renders established rows with names and ratings', () => {
    renderPage()
    expect(screen.getByTestId('leaderboard')).toBeInTheDocument()

    const p1 = screen.getByTestId('player-row-p1')
    expect(p1).toHaveTextContent('Alice')
    expect(p1).toHaveTextContent('1600')

    const pair = screen.getByTestId('pair-row-p1-p3')
    expect(pair).toHaveTextContent('Alice')
    expect(pair).toHaveTextContent('Cara')
    expect(pair).toHaveTextContent('1620')
  })

  it('collapses provisional (high-RD) entries under "Needs more games" (TASK-40)', () => {
    renderPage()
    // Provisional player is hidden by default (not in the main board).
    expect(screen.queryByTestId('player-row-p2')).toBeNull()
    // The toggle names how many need more games…
    const toggle = screen.getByTestId('player-board-prov-toggle')
    expect(toggle).toHaveTextContent('Needs more games (1)')
    // …and expanding it reveals the provisional player.
    fireEvent.click(toggle)
    expect(screen.getByTestId('player-row-p2')).toHaveTextContent('Bob')

    // Same treatment on the doubles board.
    expect(screen.queryByTestId('pair-row-p2-p3')).toBeNull()
    fireEvent.click(screen.getByTestId('pair-board-prov-toggle'))
    expect(screen.getByTestId('pair-row-p2-p3')).toBeInTheDocument()
  })

  it('shows recent form pills for a player with history', () => {
    renderPage()
    const strip = screen.getByTestId('player-row-p1').querySelector('[data-testid="form-strip"]')
    expect(strip).toBeTruthy()
    expect(strip).toHaveTextContent('WLW')
  })

  it('tags a player absent from the latest game day as inactive', () => {
    renderPage()
    const p3 = screen.getByTestId('player-row-p3')
    expect(p3.querySelector('[data-testid="inactive-tag"]')).toBeTruthy()
    expect(
      screen.getByTestId('player-row-p1').querySelector('[data-testid="inactive-tag"]'),
    ).toBeNull()
  })
})
