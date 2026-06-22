import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { add, update, remove, players } = vi.hoisted(() => ({
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  players: [
    {
      id: 'p1',
      nickname: 'Alice',
      skill: 3,
      absent: false,
      isMatchmaker: false,
      hasLogin: false,
    },
  ],
}))

vi.mock('../roster/useRoster', () => ({
  useRoster: () => ({
    data: { clubId: 'c1', players },
    isLoading: false,
    isError: false,
  }),
  useRosterMutations: () => ({
    add: { mutate: add },
    update: { mutate: update },
    remove: { mutate: remove },
  }),
}))
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: 'admin', signOut: vi.fn() }),
}))

import { PlayersPage } from './PlayersPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <PlayersPage />
    </MemoryRouter>,
  )
}

describe('PlayersPage', () => {
  afterEach(() => {
    add.mockClear()
    update.mockClear()
    remove.mockClear()
    vi.restoreAllMocks()
  })

  it('lists the roster', () => {
    renderPage()
    expect(screen.getByTestId('players')).toBeInTheDocument()
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
  })

  it('adds a player with name + skill', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('add-player-button'))
    fireEvent.change(screen.getByTestId('player-name'), { target: { value: 'Bob' } })
    fireEvent.change(screen.getByTestId('player-skill'), { target: { value: '5' } })
    fireEvent.click(screen.getByTestId('player-save'))
    expect(add).toHaveBeenCalledWith({ nickname: 'Bob', skill: 5, absent: false })
  })

  it('edits an existing player', () => {
    renderPage()
    fireEvent.click(screen.getAllByText('Edit')[0])
    fireEvent.change(screen.getByTestId('player-name'), { target: { value: 'Alicia' } })
    fireEvent.click(screen.getByTestId('player-save'))
    expect(update).toHaveBeenCalledWith({
      id: 'p1',
      input: { nickname: 'Alicia', skill: 3, absent: false },
    })
  })

  it('removes a player after confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    fireEvent.click(screen.getAllByText('Remove')[0])
    expect(remove).toHaveBeenCalledWith('p1')
  })
})
