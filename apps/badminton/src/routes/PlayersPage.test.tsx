import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConfirmProvider } from '@gameon/ui'

const { add, update, remove, createMatchmaker, players } = vi.hoisted(() => ({
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  createMatchmaker: vi.fn(),
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
    add: { mutate: add, isPending: false, error: null },
    update: { mutate: update, isPending: false, error: null },
    remove: { mutate: remove },
    createMatchmaker: { mutate: createMatchmaker, isPending: false, error: null },
  }),
}))
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: 'admin', signOut: vi.fn() }),
}))

import { PlayersPage } from './PlayersPage'

function renderPage() {
  return render(
    <ConfirmProvider>
      <MemoryRouter>
        <PlayersPage />
      </MemoryRouter>
    </ConfirmProvider>,
  )
}

describe('PlayersPage', () => {
  afterEach(() => {
    add.mockClear()
    update.mockClear()
    remove.mockClear()
    createMatchmaker.mockClear()
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
    expect(add).toHaveBeenCalledWith(
      { nickname: 'Bob', skill: 5, gender: null, absent: false },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('edits an existing player', () => {
    renderPage()
    fireEvent.click(screen.getAllByText('Edit')[0])
    fireEvent.change(screen.getByTestId('player-name'), { target: { value: 'Alicia' } })
    fireEvent.click(screen.getByTestId('player-save'))
    expect(update).toHaveBeenCalledWith(
      { id: 'p1', input: { nickname: 'Alicia', skill: 3, gender: null, absent: false } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('removes a player after confirming in the dialog', async () => {
    renderPage()
    fireEvent.click(screen.getAllByText('Remove')[0])
    // The themed confirm dialog opens; confirm from within it.
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(remove).toHaveBeenCalledWith('p1'))
  })

  it('does not remove when the confirm dialog is cancelled', async () => {
    renderPage()
    fireEvent.click(screen.getAllByText('Remove')[0])
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(remove).not.toHaveBeenCalled()
  })

  it('admin promotes an existing player to matchmaker', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('add-matchmaker-button'))
    // Pick the existing player (Alice, p1) and give them a login.
    fireEvent.change(screen.getByTestId('mm-player'), { target: { value: 'p1' } })
    fireEvent.change(screen.getByTestId('mm-new-username'), {
      target: { value: 'rohan' },
    })
    fireEvent.change(screen.getByTestId('mm-new-password'), {
      target: { value: 'secret1' },
    })
    fireEvent.click(screen.getByTestId('mm-create-submit'))
    expect(createMatchmaker).toHaveBeenCalledWith(
      { playerId: 'p1', username: 'rohan', password: 'secret1' },
      expect.anything(),
    )
  })
})
