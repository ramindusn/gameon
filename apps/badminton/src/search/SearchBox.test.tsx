import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { players } = vi.hoisted(() => ({
  players: [
    {
      id: 'p1',
      nickname: 'Alice',
      skill: 5,
      gender: 'female',
      absent: false,
      isMatchmaker: false,
      hasLogin: false,
    },
    {
      id: 'p2',
      nickname: 'Bob',
      skill: 7,
      gender: 'male',
      absent: false,
      isMatchmaker: false,
      hasLogin: false,
    },
    {
      id: 'p3',
      nickname: 'Alicia',
      skill: 4,
      gender: 'female',
      absent: false,
      isMatchmaker: false,
      hasLogin: false,
    },
  ],
}))

vi.mock('../roster/useRoster', () => ({
  useRoster: () => ({
    data: { clubId: null, players },
    isLoading: false,
    isError: false,
  }),
}))

import { SearchBox } from './SearchBox'

function renderBox() {
  return render(
    <MemoryRouter>
      <SearchBox />
    </MemoryRouter>,
  )
}

describe('SearchBox', () => {
  it('shows no dropdown until the user types', () => {
    renderBox()
    expect(screen.queryByTestId('search-results')).toBeNull()
  })

  it('finds players by name (case-insensitive) and links to their profile', () => {
    renderBox()
    fireEvent.change(screen.getByTestId('player-search'), { target: { value: 'ali' } })
    // "Alice" and "Alicia" match; "Bob" does not.
    expect(screen.getByTestId('search-result-p1')).toHaveAttribute('href', '/players/p1')
    expect(screen.getByTestId('search-result-p3')).toBeInTheDocument()
    expect(screen.queryByTestId('search-result-p2')).toBeNull()
  })

  it('shows an empty message when nothing matches', () => {
    renderBox()
    fireEvent.change(screen.getByTestId('player-search'), { target: { value: 'zzz' } })
    expect(screen.getByTestId('search-results')).toHaveTextContent('No players found')
  })
})
