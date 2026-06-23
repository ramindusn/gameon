import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { players } = vi.hoisted(() => ({
  players: Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    nickname: `Player ${i + 1}`,
    skill: 8 - i,
    gender: i % 2 === 0 ? 'male' : 'female',
    absent: false,
    isMatchmaker: false,
    hasLogin: false,
  })),
}))

vi.mock('../roster/useRoster', () => ({
  useRoster: () => ({
    data: { clubId: 'c1', players },
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('../play/useMatchPlay', () => ({
  useCreateSession: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: 'matchmaker', signOut: vi.fn() }),
}))

import { GeneratePage } from './GeneratePage'

function renderPage() {
  return render(
    <MemoryRouter>
      <GeneratePage />
    </MemoryRouter>,
  )
}

describe('GeneratePage', () => {
  it('lists active players, all selected by default', () => {
    renderPage()
    expect(screen.getByTestId('generate')).toBeInTheDocument()
    expect(screen.getByText('Selected: 8 / 8')).toBeInTheDocument()
  })

  it('generates a draw with courts and sitting', () => {
    renderPage()
    fireEvent.change(screen.getByTestId('rounds-input'), { target: { value: '3' } })
    fireEvent.click(screen.getByTestId('generate-button'))
    expect(screen.getByTestId('draw-result')).toBeInTheDocument()
    expect(screen.getByText('Round 1')).toBeInTheDocument()
    // 8 players → 2 courts; player names render in the draw.
    expect(screen.getAllByText(/Court \d/).length).toBeGreaterThan(0)
  })

  it('excludes players marked excluded from the picker', () => {
    players[0].absent = true
    try {
      renderPage()
      expect(screen.queryByTestId('present-p1')).toBeNull()
      expect(screen.getByTestId('present-p2')).toBeInTheDocument()
      expect(screen.getByText('Selected: 7 / 7')).toBeInTheDocument()
    } finally {
      players[0].absent = false
    }
  })
})
