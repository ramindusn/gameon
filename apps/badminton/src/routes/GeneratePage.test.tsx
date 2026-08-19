import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PlayerAttendance } from '../ranking/api'

const { players, attendance } = vi.hoisted(() => ({
  players: Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    nickname: `Player ${i + 1}`,
    skill: 8 - i,
    gender: i % 2 === 0 ? 'male' : 'female',
    absent: false,
    isMatchmaker: false,
    hasLogin: false,
  })),
  // Mutable per-test attendance; empty by default (no history → all selected).
  attendance: { current: {} as Record<string, PlayerAttendance> },
}))

vi.mock('../roster/useRoster', () => ({
  useRoster: () => ({
    data: { clubId: 'c1', players },
    isLoading: false,
    isError: false,
  }),
}))
const { tournamentMutate } = vi.hoisted(() => ({ tournamentMutate: vi.fn() }))
vi.mock('../play/useMatchPlay', () => ({
  useCreateSession: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateTournamentWithMatches: () => ({ mutate: tournamentMutate, isPending: false }),
}))
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: 'matchmaker', signOut: vi.fn() }),
}))
// No ratings in this test → the balancer falls back to the manual skills above.
vi.mock('../ranking/useRanking', () => ({
  usePlayerBoard: () => ({ data: [], isLoading: false, isError: false }),
  // Attendance drives the picker's sort + default selection (TASK-64); empty by
  // default so the picker keeps roster order and selects everyone.
  usePlayerAttendance: () => ({ data: attendance.current, isLoading: false, isError: false }),
}))

import { GeneratePage } from './GeneratePage'

beforeEach(() => {
  attendance.current = {}
})

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

  it('defaults the Courts field to the auto max and caps the draw to it', () => {
    renderPage()
    const courts = screen.getByTestId('courts-input') as HTMLInputElement
    // 8 players → auto max 2 courts.
    expect(courts.value).toBe('2')
    // Cap to a single court.
    fireEvent.change(courts, { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('rounds-input'), { target: { value: '2' } })
    fireEvent.click(screen.getByTestId('generate-button'))
    expect(screen.getByTestId('draw-result')).toBeInTheDocument()
    expect(screen.getAllByText('Court 1').length).toBeGreaterThan(0)
    expect(screen.queryByText('Court 2')).toBeNull()
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

  it('hides the setup on an action and can go back to it', () => {
    renderPage()
    expect(screen.getByTestId('present-p1')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('generate-button'))
    // Setup (player selection) is hidden; the draw + a back link show.
    expect(screen.queryByTestId('present-p1')).toBeNull()
    fireEvent.click(screen.getByTestId('back-to-setup'))
    // Back on the setup widget.
    expect(screen.getByTestId('present-p1')).toBeInTheDocument()
    expect(screen.queryByTestId('draw-result')).toBeNull()
  })

  it('locks pairs then generates round-robin tournament matches', () => {
    tournamentMutate.mockClear()
    renderPage()
    // One round-robin pass for a clean assertion.
    fireEvent.change(screen.getByTestId('rounds-input'), { target: { value: '1' } })
    fireEvent.click(screen.getByTestId('new-tournament'))
    // Lock two pairs by tapping players two at a time.
    fireEvent.click(screen.getByTestId('tp-p1'))
    fireEvent.click(screen.getByTestId('tp-p2'))
    fireEvent.click(screen.getByTestId('tp-p3'))
    fireEvent.click(screen.getByTestId('tp-p4'))
    fireEvent.click(screen.getByTestId('generate-matches'))

    expect(tournamentMutate).toHaveBeenCalledTimes(1)
    const arg = tournamentMutate.mock.calls[0][0]
    // 2 pairs → exactly one round-robin fixture.
    expect(arg.fixtures).toHaveLength(1)
    expect(arg.fixtures[0]).toMatchObject({
      teamA: ['p1', 'p2'],
      teamB: ['p3', 'p4'],
    })
  })

  // A game day is capped at 30 rounds by the schema. Before this, 5 passes over
  // 7 pairs was 35 rounds, the insert was rejected, and with no error handler
  // the button just went back to "Generate matches" and nothing happened.
  it('caps the passes so the draw cannot exceed a game day', () => {
    tournamentMutate.mockClear()
    renderPage()
    fireEvent.click(screen.getByTestId('new-tournament'))
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']) {
      fireEvent.click(screen.getByTestId(`tp-${id}`))
    }
    // 4 pairs = 3 rounds a pass, so 15 passes would be 45 rounds. Capped to 10.
    fireEvent.change(screen.getByTestId('passes-input'), { target: { value: '15' } })
    const summary = screen.getByTestId('tournament-summary')
    expect(summary).toHaveTextContent('30 rounds')
    expect(summary).toHaveTextContent(/capped at 10 round-robins/i)

    fireEvent.click(screen.getByTestId('generate-matches'))
    const arg = tournamentMutate.mock.calls[0][0]
    const maxRound = Math.max(...arg.fixtures.map((f: { round: number }) => f.round))
    expect(maxRound).toBeLessThanOrEqual(30)
  })

  // The casual Rounds field means rounds; here the number would mean full
  // round-robins, and one of those is already several rounds. Carrying it over
  // is what turned "15" into 30.
  it('does not inherit the random-doubles rounds value', () => {
    tournamentMutate.mockClear()
    renderPage()
    fireEvent.change(screen.getByTestId('rounds-input'), { target: { value: '15' } })
    fireEvent.click(screen.getByTestId('new-tournament'))
    for (const id of ['p1', 'p2', 'p3', 'p4']) fireEvent.click(screen.getByTestId(`tp-${id}`))
    expect(screen.getByTestId('passes-input')).toHaveValue(1)
    expect(screen.getByTestId('tournament-summary')).toHaveTextContent('1 matches over 1 rounds')
  })

  // The setup screen's Rounds field is hidden once this panel opens, so the
  // number driving the draw was invisible exactly where it took effect.
  it('lets the passes be changed inside the tournament panel', () => {
    tournamentMutate.mockClear()
    renderPage()
    fireEvent.click(screen.getByTestId('new-tournament'))
    for (const id of ['p1', 'p2', 'p3', 'p4']) fireEvent.click(screen.getByTestId(`tp-${id}`))

    // Two pairs: one pass is a single fixture, so the count is easy to read.
    fireEvent.change(screen.getByTestId('passes-input'), { target: { value: '3' } })
    expect(screen.getByTestId('tournament-summary')).toHaveTextContent('3 matches over 3 rounds')

    fireEvent.click(screen.getByTestId('generate-matches'))
    expect(tournamentMutate.mock.calls[0][0].fixtures).toHaveLength(3)
  })

  it('unchecks 3-in-a-row absentees by default and sorts them last (TASK-64)', () => {
    // p6 and p7 missed the last 3+ game days; everyone else has come recently.
    attendance.current = {
      p1: { attended: 5, missStreak: 0 },
      p2: { attended: 4, missStreak: 0 },
      p3: { attended: 3, missStreak: 1 },
      p4: { attended: 2, missStreak: 2 }, // 2 misses is still within the limit
      p5: { attended: 1, missStreak: 0 },
      p6: { attended: 0, missStreak: 3 }, // away → unchecked
      p7: { attended: 0, missStreak: 5 }, // away → unchecked
      p8: { attended: 2, missStreak: 0 },
    }
    renderPage()

    // 6 of 8 selected by default (p6 + p7 start unchecked; 2 misses is fine).
    expect(screen.getByText('Selected: 6 / 8')).toBeInTheDocument()
    expect((screen.getByTestId('present-p1') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('present-p4') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('present-p6') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByTestId('present-p7') as HTMLInputElement).checked).toBe(false)

    // The two absentees sort to the very bottom of the picker.
    const order = screen
      .getAllByTestId(/^present-p\d$/)
      .map((el) => el.getAttribute('data-testid'))
    expect(order.slice(-2).sort()).toEqual(['present-p6', 'present-p7'])
  })
})
