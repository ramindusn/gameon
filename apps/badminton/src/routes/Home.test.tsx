import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { GameDayBoard, RatedPair, RatedPlayer } from '../ranking/api'
import type { MatchSession } from '../play/api'

const { state } = vi.hoisted(() => ({
  state: {
    players: [] as RatedPlayer[],
    pairs: [] as RatedPair[],
    gameDays: [] as GameDayBoard[],
    sessions: [] as MatchSession[],
    inactive: new Set<string>(),
  },
}))

// Leaderboard always renders; empty boards just show their "no data" state.
vi.mock('../ranking/useRanking', () => ({
  usePlayerBoard: () => ({ data: state.players, isLoading: false, isError: false }),
  usePairBoard: () => ({ data: state.pairs, isLoading: false, isError: false }),
  useGameDayBoards: () => ({ data: state.gameDays, isLoading: false, isError: false }),
  useInactivePlayers: () => ({ data: state.inactive, isLoading: false, isError: false }),
  usePlayerNames: () => (id: string | null) =>
    id ? ({ p1: 'Siti', p2: 'Maya', p3: 'Alex', p4: 'Ryan' }[id] ?? id) : '—',
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: null, signOut: vi.fn() }),
}))

vi.mock('../search/SearchBox', () => ({ SearchBox: () => null }))

vi.mock('../play/useMatchPlay', () => ({
  useSessions: () => ({ data: state.sessions, isLoading: false, isError: false }),
}))

import { Home } from './Home'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home (TASK-9.5)', () => {
  it('shows only the leaderboard when there is no game day yet', () => {
    state.players = []
    state.pairs = []
    state.gameDays = []
    state.sessions = []
    renderHome()
    expect(screen.getAllByTestId('view-all-leaderboard').length).toBeGreaterThan(0)
    // The Scheduled Matches / Recent Results feeds were removed to declutter the
    // public home; the Game Day Podium widget only appears once a day is scored.
    expect(screen.queryByText('Scheduled Matches')).toBeNull()
    expect(screen.queryByText('Recent Results')).toBeNull()
    expect(screen.queryByText('Game Day Podium')).toBeNull()
    expect(screen.queryByTestId('game-day-board')).toBeNull()
    // No live game day → no "Live now" access card.
    expect(screen.queryByText('Live now')).toBeNull()
  })

  it('surfaces a live casual game day so players can open it (TASK-51)', () => {
    state.players = []
    state.pairs = []
    state.gameDays = []
    state.sessions = [
      {
        id: 'live-1',
        clubId: 'c1',
        status: 'live',
        mode: 'open',
        kind: 'casual',
        rounds: 5,
        hidden: false,
        playedAt: '2026-07-17T18:00:00Z',
        createdAt: '2026-07-17T18:00:00Z',
      },
      // A hidden live day must NOT be surfaced publicly.
      {
        id: 'live-hidden',
        clubId: 'c1',
        status: 'live',
        mode: 'open',
        kind: 'casual',
        rounds: 5,
        hidden: true,
        playedAt: '2026-07-17T19:00:00Z',
        createdAt: '2026-07-17T19:00:00Z',
      },
    ] as MatchSession[]
    renderHome()
    expect(screen.getByText('Live now')).toBeInTheDocument()
    expect(screen.getByTestId('live-now-live-1')).toHaveAttribute('href', '/game-days/live-1')
    expect(screen.queryByTestId('live-now-live-hidden')).toBeNull()
  })

  it('shows the latest game day as a podium + rest, ranked by diff (TASK-33/37)', () => {
    state.players = []
    state.pairs = []
    state.gameDays = [
      {
        sessionId: 's-latest',
        playedAt: '2026-07-10T18:00:00Z',
        standings: [
          // Deliberately out of order + a tie (p3/p4 both +5) to prove the UI
          // re-sorts by diff then nickname (Alex before Ryan).
          { playerId: 'p4', played: 3, wins: 1, diff: 5 },
          { playerId: 'p1', played: 3, wins: 3, diff: 22 },
          { playerId: 'p3', played: 3, wins: 1, diff: 5 },
          { playerId: 'p2', played: 3, wins: 0, diff: -18 },
        ],
      },
    ]
    renderHome()
    expect(screen.getByText('Game Day Podium')).toBeInTheDocument()
    // Podium top three: 1st Siti (+22), 2nd Alex (+5), 3rd Ryan (+5, name tie-break).
    expect(screen.getByTestId('podium-1')).toHaveTextContent('Siti')
    expect(screen.getByTestId('podium-1')).toHaveTextContent('+22')
    expect(screen.getByTestId('podium-2')).toHaveTextContent('Alex')
    expect(screen.getByTestId('podium-3')).toHaveTextContent('Ryan')
    // The rest fall below the podium: Maya at rank 4 (-18).
    const rest = screen.getByTestId('game-day-row-p2')
    expect(rest).toHaveTextContent('Maya')
    expect(rest).toHaveTextContent('-18')
    // The card links to that game day's detail page.
    expect(screen.getByTestId('game-day-card')).toHaveAttribute('href', '/game-days/s-latest')
  })

  it('pages back to older game days with the arrows (TASK-37)', () => {
    state.players = []
    state.pairs = []
    state.gameDays = [
      {
        sessionId: 's-latest',
        playedAt: '2026-07-10T18:00:00Z',
        standings: [{ playerId: 'p1', played: 1, wins: 1, diff: 10 }],
      },
      {
        sessionId: 's-older',
        playedAt: '2026-07-03T18:00:00Z',
        standings: [{ playerId: 'p2', played: 1, wins: 0, diff: -4 }],
      },
    ]
    renderHome()
    // Latest is shown first; "newer" arrow is disabled at the start.
    expect(screen.getByTestId('game-day-card')).toHaveAttribute('href', '/game-days/s-latest')
    expect(screen.getByTestId('podium-1')).toHaveTextContent('Siti')
    expect(screen.getByTestId('game-day-newer')).toBeDisabled()
    expect(screen.getByTestId('game-day-older')).toBeEnabled()

    // Right arrow → previous (older) game day.
    fireEvent.click(screen.getByTestId('game-day-older'))
    expect(screen.getByTestId('game-day-card')).toHaveAttribute('href', '/game-days/s-older')
    expect(screen.getByTestId('podium-1')).toHaveTextContent('Maya')
    expect(screen.getByTestId('podium-1')).toHaveTextContent('-4')
    // Now at the oldest: "older" disabled, "newer" enabled.
    expect(screen.getByTestId('game-day-older')).toBeDisabled()
    expect(screen.getByTestId('game-day-newer')).toBeEnabled()

    // Left arrow → back to the latest.
    fireEvent.click(screen.getByTestId('game-day-newer'))
    expect(screen.getByTestId('game-day-card')).toHaveAttribute('href', '/game-days/s-latest')
  })

  it('renders ranking tables with rank, name and rating', () => {
    state.gameDays = []
    state.inactive = new Set()
    state.pairs = [{ player1Id: 'p1', player2Id: 'p2', rating: 1450, rd: 50, games: 8 }]
    state.players = [{ playerId: 'p1', rating: 2450, rd: 40, games: 12 }]
    renderHome()
    expect(screen.getByTestId('doubles-ranking')).toHaveTextContent('1,450')
    expect(screen.getByTestId('individual-ranking')).toHaveTextContent('2,450')
  })

  it('excludes inactive players from the individual ranking preview (TASK-58 follow-up)', () => {
    state.gameDays = []
    state.pairs = []
    state.players = [
      { playerId: 'p1', rating: 2450, rd: 40, games: 12 }, // established, active
      { playerId: 'p2', rating: 2400, rd: 40, games: 12 }, // established, inactive
    ]
    state.inactive = new Set(['p2'])
    renderHome()
    expect(screen.getByTestId('individual-ranking')).toHaveTextContent('Siti')
    expect(screen.getByTestId('individual-ranking')).not.toHaveTextContent('Maya')
  })
})
