import { describe, expect, it, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { MatchResult, MatchSession } from '../play/api'

const { setScore, setStatus, setHidden, updateLineup, addMatch, deleteMatch, sessionData, authRole } =
  vi.hoisted(() => {
  const session: MatchSession = {
    id: 's1',
    clubId: 'c1',
    status: 'live',
    mode: 'open',
    kind: 'casual',
    rounds: 1,
    hidden: false,
    playedAt: '2026-06-22T10:00:00Z',
    createdAt: '2026-06-22T10:00:00Z',
  }
  const results: MatchResult[] = [
    {
      id: 'r1',
      sessionId: 's1',
      round: 1,
      court: 1,
      teamA: ['p1', 'p2'],
      teamB: ['p3', 'p4'],
      scoreA: null,
      scoreB: null,
      winner: null,
    },
    {
      id: 'r2',
      sessionId: 's1',
      round: 1,
      court: 2,
      teamA: ['p5', 'p6'],
      teamB: ['p7', 'p8'],
      scoreA: 21,
      scoreB: 15,
      winner: 'a',
    },
  ]
  return {
    setScore: vi.fn(),
    setStatus: vi.fn(),
    setHidden: vi.fn(),
    updateLineup: vi.fn(),
    addMatch: vi.fn(),
    deleteMatch: vi.fn(),
    sessionData: { session, results },
    authRole: { current: 'matchmaker' as 'matchmaker' | 'admin' | null },
  }
})

vi.mock('../play/useMatchPlay', () => ({
  useSession: () => ({ data: sessionData, isLoading: false, isError: false }),
  useSetScore: () => ({ mutate: setScore, isPending: false }),
  useSetSessionStatus: () => ({ mutate: setStatus, isPending: false }),
  useSetSessionHidden: () => ({ mutate: setHidden, isPending: false }),
  useUpdateSessionPlayedAt: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteSession: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateMatchLineup: () => ({ mutate: updateLineup, isPending: false }),
  useAddCustomMatch: () => ({ mutate: addMatch, isPending: false }),
  useDeleteMatch: () => ({ mutate: deleteMatch, isPending: false }),
}))
vi.mock('../roster/useRoster', () => ({
  useRoster: () => ({
    data: {
      clubId: 'c1',
      // 12 roster players, but only p1–p8 are in this game day's round 1 matches.
      // p9–p12 are on the roster but not yet playing (e.g. late arrivals).
      players: Array.from({ length: 12 }, (_, i) => ({
        id: `p${i + 1}`,
        nickname: `Player ${i + 1}`,
        skill: 5,
        absent: false,
        isMatchmaker: false,
        hasLogin: false,
      })),
    },
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: authRole.current, signOut: vi.fn() }),
}))
vi.mock('../ranking/useRanking', () => ({
  usePlayerBoard: () => ({ data: [] }),
}))

import { PlayPage } from './PlayPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/play/s1']}>
      <Routes>
        <Route path="/play/:id" element={<PlayPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PlayPage', () => {
  beforeEach(() => {
    setScore.mockClear()
    setStatus.mockClear()
    setHidden.mockClear()
    updateLineup.mockClear()
    addMatch.mockClear()
    deleteMatch.mockClear()
    authRole.current = 'matchmaker'
  })

  it('switches to the Points tab and ranks the scored players by point differential', () => {
    // r2 (21–15, team A won): p5/p6 at +6, p7/p8 at -6.
    renderPage()
    fireEvent.click(screen.getByTestId('tab-points'))
    expect(screen.getByTestId('points-table')).toBeInTheDocument()
    expect(screen.getByTestId('points-p5')).toHaveTextContent('+6')
    expect(screen.getByTestId('points-p7')).toHaveTextContent('-6')
  })

  it('shows a read-only schedule tab with the round matchups', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('tab-schedule'))
    expect(screen.getByTestId('schedule-tab')).toBeInTheDocument()
    expect(screen.getByTestId('schedule-r1')).toBeInTheDocument()
    // No score inputs live on the schedule tab.
    expect(screen.queryByTestId('score-r1-a')).toBeNull()
  })

  it('is public + read-only for a signed-out viewer (no editing controls)', () => {
    authRole.current = null
    renderPage()
    // Session controls are matchmaker-only.
    expect(screen.queryByTestId('finish-session')).toBeNull()
    expect(screen.queryByTestId('delete-game-day')).toBeNull()
    // The Score tab is view-only: no inputs or save buttons.
    fireEvent.click(screen.getByTestId('tab-score'))
    expect(screen.queryByTestId('score-r1-a')).toBeNull()
    expect(screen.queryByTestId('save-score-r1')).toBeNull()
    expect(screen.queryByTestId('edit-lineup-r1')).toBeNull()
    expect(screen.queryByTestId('add-custom-match')).toBeNull()
  })

  it('renders the session with player names and an existing winner', () => {
    renderPage()
    expect(screen.getByTestId('play')).toBeInTheDocument()
    expect(screen.getByText('Round 1')).toBeInTheDocument()
    // Names resolved from the roster (shown on the court cards).
    expect(screen.getAllByText('Player 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Player 2').length).toBeGreaterThan(0)
    // Court 2 already has team A as winner.
    expect(screen.getByTestId('session-status')).toHaveTextContent('Live')
    // Only this game day's players (p1–p8) are counted, not the 12-strong roster.
    expect(screen.getByTestId('game-day-player-count')).toHaveTextContent('8 players')
  })

  it('records point scores (winner derived) when a match is saved', () => {
    renderPage()
    fireEvent.change(screen.getByTestId('score-r1-a'), { target: { value: '21' } })
    fireEvent.change(screen.getByTestId('score-r1-b'), { target: { value: '18' } })
    fireEvent.click(screen.getByTestId('save-score-r1'))
    expect(setScore).toHaveBeenCalledWith({ resultId: 'r1', scoreA: 21, scoreB: 18 })
  })

  it('rejects tied scores with an inline error and no save', () => {
    renderPage()
    fireEvent.change(screen.getByTestId('score-r1-a'), { target: { value: '21' } })
    fireEvent.change(screen.getByTestId('score-r1-b'), { target: { value: '21' } })
    fireEvent.click(screen.getByTestId('save-score-r1'))
    expect(setScore).not.toHaveBeenCalled()
    expect(screen.getByTestId('score-error-r1')).toBeInTheDocument()
  })

  it('blocks finishing while a match is unscored and shows a hint', () => {
    // r1 has no winner (unscored), r2 is scored → one match outstanding.
    renderPage()
    expect(screen.getByTestId('finish-session')).toBeDisabled()
    expect(screen.getByTestId('finish-hint')).toHaveTextContent('1 match still need a score')
  })

  it('allows finishing once every match is scored', () => {
    // Temporarily resolve r1 so nothing is outstanding.
    sessionData.results[0].winner = 'a'
    renderPage()
    expect(screen.queryByTestId('finish-hint')).toBeNull()
    expect(screen.getByTestId('finish-session')).not.toBeDisabled()
    fireEvent.click(screen.getByTestId('finish-session'))
    expect(setStatus).toHaveBeenCalledWith(
      'finished',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    sessionData.results[0].winner = null
  })

  it('toggles the game day’s home visibility from the checkbox (TASK-38)', () => {
    renderPage()
    const box = screen.getByTestId('hide-from-home') as HTMLInputElement
    // Session is visible by default, so the "don't show" box starts unchecked.
    expect(box.checked).toBe(false)
    fireEvent.click(box)
    expect(setHidden).toHaveBeenCalledWith(true)
  })

  it('shows the game-day date and a two-step delete confirm', () => {
    renderPage()
    expect(screen.getByTestId('game-day-date')).toBeInTheDocument()
    // Delete is a guarded two-step action.
    expect(screen.queryByTestId('confirm-delete-game-day')).toBeNull()
    fireEvent.click(screen.getByTestId('delete-game-day'))
    expect(screen.getByTestId('confirm-delete-game-day')).toBeInTheDocument()
  })

  it('replaces a match line-up (full substitution) from the present roster', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('edit-lineup-r1'))
    // Swap team A slot 1 (p1 -> p5).
    fireEvent.change(screen.getByTestId('lineup-r1-a1'), { target: { value: 'p5' } })
    fireEvent.click(screen.getByTestId('save-lineup-r1'))
    expect(updateLineup).toHaveBeenCalledWith({
      resultId: 'r1',
      teamA: ['p5', 'p2'],
      teamB: ['p3', 'p4'],
    })
  })

  it('line-up options list only this game day’s players, not the whole roster', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('edit-lineup-r1'))
    const select = screen.getByTestId('lineup-r1-a1')
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    // p1–p8 play this game day; p9 is on the roster but not here.
    expect(options).toContain('Player 8')
    expect(options).not.toContain('Player 9')
  })

  it('rejects a line-up with a duplicate player and does not save', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('edit-lineup-r1'))
    // Make slot a2 the same as a1 (p1).
    fireEvent.change(screen.getByTestId('lineup-r1-a2'), { target: { value: 'p1' } })
    fireEvent.click(screen.getByTestId('save-lineup-r1'))
    expect(updateLineup).not.toHaveBeenCalled()
    expect(screen.getByTestId('lineup-error-r1')).toBeInTheDocument()
  })

  it('scopes the add-match picker to this game day’s players, not the whole roster (TASK-32)', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('add-custom-match'))
    // Move to a fresh round so the game day's players aren't booked. Only p1–p8
    // (this game day) are offered; p9–p12 are on the roster but not at the venue.
    fireEvent.change(screen.getByTestId('custom-round'), { target: { value: '2' } })
    const opts = Array.from(
      (screen.getByTestId('custom-a1') as HTMLSelectElement).querySelectorAll('option'),
    ).map((o) => o.textContent)
    expect(opts).toContain('Player 8')
    expect(opts).not.toContain('Player 9')
  })

  it('derives the add-match player set from the (edited) line-ups (TASK-32 AC#3)', () => {
    // Court 2's line-up was edited to bring in p9 & p10 in place of p7 & p8, so
    // this game day's players are now p1–p6, p9, p10. The picker follows the
    // live line-ups: p9 becomes selectable and p7 drops out.
    const original = sessionData.results[1]
    sessionData.results[1] = { ...original, teamB: ['p9', 'p10'] }
    renderPage()
    fireEvent.click(screen.getByTestId('add-custom-match'))
    fireEvent.change(screen.getByTestId('custom-round'), { target: { value: '2' } })
    const opts = Array.from(
      (screen.getByTestId('custom-a1') as HTMLSelectElement).querySelectorAll('option'),
    ).map((o) => o.textContent)
    expect(opts).toContain('Player 9')
    expect(opts).not.toContain('Player 7')
    sessionData.results[1] = original
  })

  it('targets a new round, where every player is free again', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('add-custom-match'))
    // Switch to a brand-new round (2): nobody is booked there, so p1–p4
    // (busy in round 1) become selectable, and the court resets to 1.
    fireEvent.change(screen.getByTestId('custom-round'), { target: { value: '2' } })
    const opts = Array.from(
      (screen.getByTestId('custom-a1') as HTMLSelectElement).querySelectorAll('option'),
    ).map((o) => o.textContent)
    expect(opts).toContain('Player 1')
    fireEvent.change(screen.getByTestId('custom-a1'), { target: { value: 'p1' } })
    fireEvent.change(screen.getByTestId('custom-a2'), { target: { value: 'p2' } })
    fireEvent.change(screen.getByTestId('custom-b1'), { target: { value: 'p3' } })
    fireEvent.change(screen.getByTestId('custom-b2'), { target: { value: 'p4' } })
    fireEvent.click(screen.getByTestId('save-custom-match'))
    expect(addMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        round: 2,
        court: 1,
        players: ['p1', 'p2', 'p3', 'p4'],
      }),
    )
  })

  it('excludes players already in the round from the add-match picker', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('add-custom-match'))
    const opts = Array.from(
      (screen.getByTestId('custom-a1') as HTMLSelectElement).querySelectorAll('option'),
    ).map((o) => o.textContent)
    // Round 1 (the default) is full: p1–p8 are all booked → none selectable.
    // Player 9 is on the roster but not in this game day, so it's excluded too.
    expect(opts).not.toContain('Player 1')
    expect(opts).not.toContain('Player 9')
  })

  it('shows who is resting a round and no label when nobody rests (TASK-31)', () => {
    // Add a round-2 court with a fresh player (p9). Now p9 is a game-day player
    // who sits out round 1, so round 1 lists a resting player; round 2 (only p9,
    // p10, p11, p12 present, all booked) shows no resting label.
    const extra: MatchResult = {
      id: 'r3',
      sessionId: 's1',
      round: 2,
      court: 1,
      teamA: ['p9', 'p10'],
      teamB: ['p11', 'p12'],
      scoreA: null,
      scoreB: null,
      winner: null,
    }
    sessionData.results.push(extra)
    renderPage()
    // Round 1: p1–p8 play, p9–p12 rest.
    const resting1 = screen.getByTestId('resting-1')
    expect(resting1).toHaveTextContent('Resting:')
    expect(resting1).toHaveTextContent('Player 9')
    expect(resting1).toHaveTextContent('Player 12')
    // Round 2: everyone present (only p9–p12 are game-day players once summed)…
    // p1–p8 also play round 1, so they rest round 2.
    expect(screen.getByTestId('resting-2')).toHaveTextContent('Player 1')
    sessionData.results.pop()
  })

  it('shows no resting label when every game-day player is booked in the round', () => {
    // The base fixture has p1–p8 all playing the single round → nobody resting.
    renderPage()
    expect(screen.queryByTestId('resting-1')).toBeNull()
  })

  it('deletes a match via a two-step confirm', () => {
    renderPage()
    expect(screen.queryByTestId('confirm-delete-match-r1')).toBeNull()
    fireEvent.click(screen.getByTestId('delete-match-r1'))
    fireEvent.click(screen.getByTestId('confirm-delete-match-r1'))
    expect(deleteMatch).toHaveBeenCalledWith('r1')
  })

  it('hides live editing controls once the game day is finished', () => {
    sessionData.session.status = 'finished'
    renderPage()
    expect(screen.queryByTestId('edit-lineup-r1')).toBeNull()
    expect(screen.queryByTestId('delete-match-r1')).toBeNull()
    expect(screen.queryByTestId('add-custom-match')).toBeNull()
    expect(screen.queryByTestId('save-score-r1')).toBeNull()
    sessionData.session.status = 'live'
  })
})
