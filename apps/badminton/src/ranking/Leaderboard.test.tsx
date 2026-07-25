import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PlayerBoardList } from './Leaderboard'
import type { RatedPlayer } from './api'

// PlayerBoardList links names via react-router, so every render needs a Router.
function renderBoard(players: RatedPlayer[], inactive?: Set<string>) {
  return render(
    <MemoryRouter>
      <PlayerBoardList
        players={players}
        nameOf={(id) => id ?? '—'}
        form={{}}
        inactive={inactive}
      />
    </MemoryRouter>,
  )
}

describe('PlayerBoardList — Inactive section (TASK-58)', () => {
  it('auto-expands the Inactive section when it is the only content on the board', () => {
    // Every player here is inactive, so there's nothing established or
    // provisional above it — the section should start open.
    renderBoard(
      [
        { playerId: 'p1', rating: 1500, rd: 60, games: 8 },
        { playerId: 'p2', rating: 1500, rd: 60, games: 8 },
      ],
      new Set(['p1', 'p2']),
    )
    const toggle = screen.getByTestId('player-board-inactive-toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('player-row-p1')).toBeInTheDocument()
  })

  it('renders no Inactive section at all when nobody is inactive', () => {
    renderBoard([{ playerId: 'p1', rating: 1500, rd: 60, games: 8 }])
    expect(screen.queryByTestId('player-board-inactive-toggle')).toBeNull()
  })

  it('gives inactive rows no rank number', () => {
    // An established player above it means the section starts collapsed.
    renderBoard(
      [
        { playerId: 'p1', rating: 1500, rd: 60, games: 8 },
        { playerId: 'p2', rating: 1500, rd: 60, games: 8 },
      ],
      new Set(['p2']),
    )
    expect(screen.getByTestId('player-board-inactive-toggle')).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    fireEvent.click(screen.getByTestId('player-board-inactive-toggle'))
    const row = screen.getByTestId('player-row-p2')
    expect(row).toHaveTextContent('·') // Rank renders '·' for a null rank
  })
})
