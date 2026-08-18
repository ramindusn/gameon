import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { FormMap, RatedPair, RatedPlayer } from '../ranking/api'

const { players, pairs, form, inactive } = vi.hoisted(() => ({
  players: [
    { playerId: 'p1', rating: 1600, rd: 50, games: 10 }, // established, has form
    { playerId: 'p3', rating: 1550, rd: 60, games: 9 }, // established, inactive
    { playerId: 'p2', rating: 1500, rd: 200, games: 1 }, // provisional, NOT inactive
    { playerId: 'p4', rating: 1500, rd: 220, games: 1 }, // provisional AND inactive
  ] satisfies RatedPlayer[],
  pairs: [
    { player1Id: 'p1', player2Id: 'p3', rating: 1620, rd: 55, games: 6 }, // established
    { player1Id: 'p2', player2Id: 'p3', rating: 1580, rd: 210, games: 1 }, // provisional
  ] satisfies RatedPair[],
  form: { p1: ['W', 'L', 'W'] } satisfies FormMap,
  inactive: new Set(['p3', 'p4']),
}))

// The page renders through AppShell now (TASK-76.1), which reads the signed-in
// role and the roster for its nav and search.
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: null, signOut: vi.fn() }),
}))
vi.mock('../roster/useRoster', () => ({
  useRoster: () => ({ data: { clubId: 'c1', players: [] }, isLoading: false, isError: false }),
}))
vi.mock('../ranking/useRanking', () => ({
  usePlayerBoard: () => ({ data: players, isLoading: false, isError: false }),
  usePairBoard: () => ({ data: pairs, isLoading: false, isError: false }),
  useRecentForm: () => ({ data: form, isLoading: false, isError: false }),
  useInactivePlayers: () => ({ data: inactive, isLoading: false, isError: false }),
  usePlayerNames: () => (id: string | null) =>
    id === 'p1' ? 'Alice' : id === 'p2' ? 'Bob' : id === 'p3' ? 'Cara' : id === 'p4' ? 'Dave' : '—',
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

  it('links each player name to their profile (TASK-42)', () => {
    renderPage()
    const nameLink = screen.getByTestId('player-row-p1').querySelector('a')
    expect(nameLink).toHaveAttribute('href', '/players/p1')
  })

  // On a board that ranks partnerships the row IS the pair, so the whole row
  // is one link. A small arrow at the end was missable — people did not know
  // the pair page existed (TASK-90).
  it('makes the whole doubles row a link to the pair', () => {
    renderPage()
    const pairLinks = screen.getByTestId('pair-row-p1-p3').querySelectorAll('a')
    expect(Array.from(pairLinks).map((a) => a.getAttribute('href'))).toEqual(['/pairs/p1/p3'])
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

  // Collapsed by default: the marks it explains are visible in the boards
  // right below, and the prose used to take a quarter of a phone screen before
  // any ranking appeared.
  it('keeps the legend to one line until asked (TASK-41)', () => {
    renderPage()
    const legend = screen.getByTestId('leaderboard-legend')
    expect(legend).toHaveTextContent('Recent form, newest first')
    expect(screen.queryByTestId('leaderboard-legend-detail')).toBeNull()

    fireEvent.click(screen.getByTestId('leaderboard-legend-toggle'))
    const detail = screen.getByTestId('leaderboard-legend-detail')
    expect(detail).toHaveTextContent('Won the day')
    expect(detail).toHaveTextContent('Lost the day')
    expect(detail).toHaveTextContent('Even')
    expect(detail).toHaveTextContent('Inactive')
    expect(detail).toHaveTextContent('Needs more games')

    fireEvent.click(screen.getByTestId('leaderboard-legend-toggle'))
    expect(screen.queryByTestId('leaderboard-legend-detail')).toBeNull()
  })

  it('shows recent form pills for a player with history', () => {
    renderPage()
    const strip = screen.getByTestId('player-row-p1').querySelector('[data-testid="form-strip"]')
    expect(strip).toBeTruthy()
    expect(strip).toHaveTextContent('WLW')
  })

  it('moves an established but inactive player into a collapsible Inactive section (TASK-58)', () => {
    renderPage()
    // Cara (p3) is established (low RD) but inactive — not in the main ranked list.
    expect(screen.queryByTestId('player-row-p3')).toBeNull()
    const toggle = screen.getByTestId('player-board-inactive-toggle')
    expect(toggle).toHaveTextContent('Inactive (2)')
    fireEvent.click(toggle)
    expect(screen.getByTestId('player-row-p3')).toHaveTextContent('Cara')
  })

  it('counts a player who is both provisional and inactive only under Inactive (TASK-58)', () => {
    renderPage()
    // Dave (p4) is provisional (high RD) AND inactive. He must appear only in
    // the Inactive section, not also under "Needs more games" — that count
    // stays 1 (Bob only), even though two players are non-established.
    expect(screen.getByTestId('player-board-prov-toggle')).toHaveTextContent(
      'Needs more games (1)',
    )
    fireEvent.click(screen.getByTestId('player-board-prov-toggle'))
    expect(screen.queryByTestId('player-row-p4')).toBeNull()

    expect(screen.getByTestId('player-board-inactive-toggle')).toHaveTextContent('Inactive (2)')
    fireEvent.click(screen.getByTestId('player-board-inactive-toggle'))
    expect(screen.getByTestId('player-row-p4')).toHaveTextContent('Dave')
  })

  it('auto-expands the Inactive section when it is the only content', () => {
    renderPage()
    // Not the case in the base fixture (established + provisional rows exist),
    // so the section starts collapsed.
    expect(screen.getByTestId('player-board-inactive-toggle')).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
