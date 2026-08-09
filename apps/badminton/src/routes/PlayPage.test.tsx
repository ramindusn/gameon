import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { MatchResult, MatchSession } from '../play/api'

const { setScore, setStatus, setHidden, updateLineup, addMatch, deleteMatch, sessionData, authRole, usageCtx, lastUsageModalProps, ratingDeltas, teams, substitute } =
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
    teams: { current: [] as { id: string; player1Id: string; player2Id: string }[] },
    substitute: vi.fn(),
    setStatus: vi.fn(),
    setHidden: vi.fn(),
    updateLineup: vi.fn(),
    addMatch: vi.fn(),
    deleteMatch: vi.fn(),
    sessionData: { session, results },
    authRole: { current: 'matchmaker' as 'matchmaker' | 'admin' | null },
    // Stock context drives whether finishing prompts for shuttle usage.
    usageCtx: { current: null as { myHolderId?: string } | null },
    // Last props the usage dialog was rendered with, so tests can hit "Later".
    lastUsageModalProps: {
      current: null as { onLater?: () => void; onClose?: () => void } | null,
    },
    // Real per-day rating movement, once the day is finished and recomputed.
    ratingDeltas: { current: undefined as Record<string, number> | undefined },
  }
})

vi.mock('../play/useMatchPlay', () => ({
  useSession: () => ({ data: sessionData, isLoading: false, isError: false }),
  useSessionRealtime: () => {},
  useSetScore: () => ({ mutate: setScore, isPending: false }),
  useSetSessionStatus: () => ({ mutate: setStatus, isPending: false }),
  useSetSessionHidden: () => ({ mutate: setHidden, isPending: false }),
  useUpdateSessionPlayedAt: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteSession: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateMatchLineup: () => ({ mutate: updateLineup, isPending: false }),
  useAddCustomMatch: () => ({ mutate: addMatch, isPending: false }),
  useDeleteMatch: () => ({ mutate: deleteMatch, isPending: false }),
  useTournamentTeams: () => ({ data: teams.current }),
  useSubstituteTeamPlayer: () => ({ mutate: substitute, isPending: false }),
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
// The usage card fetches through TanStack Query; this suite mocks its hooks
// rather than providing a QueryClient, and the card has its own tests.
vi.mock('../fund/GameDayUsage', () => ({
  GameDayUsagePanel: () => <div data-testid="usage-panel" />,
  // Captured so tests can drive "Later" without rendering the real dialog.
  GameDayUsageModal: (props: { onLater?: () => void; onClose?: () => void }) => {
    lastUsageModalProps.current = props
    return null
  },
  useStockContext: () => ({ data: usageCtx.current }),
}))
vi.mock('../ranking/useRanking', () => ({
  usePlayerBoard: () => ({ data: [] }),
  // Empty until a day is finished and recomputed, so the Points tab falls back
  // to its projection — which is what these tests assert.
  useGameDayRatingDeltas: () => ({ data: ratingDeltas.current }),
}))

import { PlayPage } from './PlayPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/game-days/s1']}>
      <Routes>
        <Route path="/game-days/:id" element={<PlayPage />} />
        {/* Stand-in so tests can tell whether finishing navigated away. */}
        <Route path="/leaderboard" element={<div data-testid="leaderboard-page" />} />
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
    usageCtx.current = null
    lastUsageModalProps.current = null
    ratingDeltas.current = undefined
  })

  it('switches to the Points tab, showing point diff + ranking gain per player', () => {
    // r2 (21–15, team A won): p5/p6 at +6 points, p7/p8 at -6. All roster skills
    // are equal (5), so every match is even → ±8.0 ranking points per result.
    renderPage()
    fireEvent.click(screen.getByTestId('tab-points'))
    expect(screen.getByTestId('points-table')).toBeInTheDocument()
    expect(screen.getByTestId('points-p5')).toHaveTextContent('+6')
    expect(screen.getByTestId('points-p5')).toHaveTextContent('+8.0')
    expect(screen.getByTestId('points-p7')).toHaveTextContent('-6')
    expect(screen.getByTestId('points-p7')).toHaveTextContent('-8.0')
  })

  it('shows the real recorded rating movement once the day is scored (TASK-71)', () => {
    // A finished, recomputed day has actual deltas — they win over the
    // projection so the page agrees with the leaderboard.
    ratingDeltas.current = { p5: 12.4, p7: -12.4 }
    renderPage()
    fireEvent.click(screen.getByTestId('tab-points'))
    expect(screen.getByTestId('points-p5')).toHaveTextContent('+12.4')
    expect(screen.getByTestId('points-p7')).toHaveTextContent('-12.4')
  })

  it('opens a finished game day on the standings, not the matches (TASK-70)', () => {
    sessionData.session.status = 'finished'
    renderPage()
    // The result is what people came for once the day is done.
    expect(screen.getByTestId('points-table')).toBeInTheDocument()
    sessionData.session.status = 'live'
  })

  it('opens a live game day on the matches', () => {
    renderPage()
    expect(screen.getByTestId('matches-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('points-table')).toBeNull()
  })

  it('lets the viewer tab back to the matches on a finished day', () => {
    sessionData.session.status = 'finished'
    renderPage()
    fireEvent.click(screen.getByTestId('tab-matches'))
    expect(screen.getByTestId('matches-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('points-table')).toBeNull()
    sessionData.session.status = 'live'
  })

  it('has two tabs (Matches + Points), not separate Schedule/Score', () => {
    renderPage()
    expect(screen.getByTestId('tab-matches')).toBeInTheDocument()
    expect(screen.getByTestId('tab-points')).toBeInTheDocument()
    expect(screen.queryByTestId('tab-schedule')).toBeNull()
    expect(screen.queryByTestId('tab-score')).toBeNull()
  })

  it('gives a signed-out viewer the same court cards, read-only (no editing)', () => {
    authRole.current = null
    renderPage()
    // Players see the identical Matches layout (same court cards as matchmakers).
    expect(screen.getByTestId('matches-tab')).toBeInTheDocument()
    expect(screen.getByTestId('court-r1')).toBeInTheDocument()
    // Session controls + inline editing are matchmaker-only.
    expect(screen.queryByTestId('finish-session')).toBeNull()
    expect(screen.queryByTestId('delete-game-day')).toBeNull()
    expect(screen.queryByTestId('score-r1-a')).toBeNull()
    expect(screen.queryByTestId('save-score-r1')).toBeNull()
    expect(screen.queryByTestId('edit-lineup-r1')).toBeNull()
    expect(screen.queryByTestId('add-round')).toBeNull()
  })

  it('lets a matchmaker edit scores inline on the Matches tab', () => {
    renderPage()
    // Matches is the default tab and shows editable court cards for matchmakers.
    expect(screen.getByTestId('score-r1-a')).toBeInTheDocument()
    expect(screen.getByTestId('save-score-r1')).toBeInTheDocument()
    expect(screen.getByTestId('add-round')).toBeInTheDocument()
  })

  it('renders the session with player names and an existing winner', () => {
    renderPage()
    expect(screen.getByTestId('play')).toBeInTheDocument()
    expect(screen.getByText('Round 1')).toBeInTheDocument()
    // Names resolved from the roster (shown side by side on the court cards).
    expect(screen.getAllByText(/Player 1/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Player 2/).length).toBeGreaterThan(0)
    // Court 2 already has team A as winner.
    expect(screen.getByTestId('session-status')).toHaveTextContent('Live')
    // Only this game day's players (p1–p8) are counted, not the 12-strong roster.
    expect(screen.getByTestId('game-day-player-count')).toHaveTextContent('8 players')
    // No creator recorded on this fixture — the header says the role rather
    // than leaving a gap or naming somebody (TASK-86).
    expect(screen.getByTestId('game-day-creator')).toHaveTextContent('Started by Matchmaker')
  })

  it('names the matchmaker who started the game day', () => {
    sessionData.session.createdByName = 'Sahan'
    renderPage()
    expect(screen.getByTestId('game-day-creator')).toHaveTextContent('Started by Sahan')
    delete sessionData.session.createdByName
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

  it('asks for the shuttles used instead of leaving straight away (TASK-70)', () => {
    // A matchmaker holding stock is the one who can answer, so they get the popup.
    usageCtx.current = { myHolderId: 'h1' }
    sessionData.results[0].winner = 'a'
    renderPage()
    fireEvent.click(screen.getByTestId('finish-session'))
    act(() => setStatus.mock.calls[0][1].onSuccess())
    // Still on the game day, with the popup owning the next step.
    expect(screen.queryByTestId('leaderboard-page')).toBeNull()
    sessionData.results[0].winner = null
  })

  it('keeps the usage panel off the page during live play (TASK-70)', () => {
    usageCtx.current = { myHolderId: 'h1' }
    renderPage()
    // Live: the popup on finishing is the prompt, so nothing clutters the page.
    expect(screen.queryByTestId('usage-panel')).toBeNull()
  })

  it('shows the usage panel once the game day is finished (TASK-70)', () => {
    usageCtx.current = { myHolderId: 'h1' }
    sessionData.session.status = 'finished'
    renderPage()
    expect(screen.getByTestId('usage-panel')).toBeInTheDocument()
    sessionData.session.status = 'live'
  })

  it('keeps a deferred game day on the page, revealing the usage panel (TASK-70)', () => {
    usageCtx.current = { myHolderId: 'h1' }
    sessionData.results[0].winner = 'a'
    renderPage()
    fireEvent.click(screen.getByTestId('finish-session'))
    act(() => setStatus.mock.calls[0][1].onSuccess())
    // "Later" must not strand the matchmaker on the leaderboard — it leaves the
    // panel behind as the way back in.
    act(() => lastUsageModalProps.current?.onLater?.())
    expect(screen.queryByTestId('leaderboard-page')).toBeNull()
    expect(screen.getByTestId('usage-panel')).toBeInTheDocument()
    sessionData.results[0].winner = null
  })

  // Finishing used to jump to the leaderboard, throwing away the thing just
  // finished — this day's own standings, which the page switches to by itself.
  it('stays on the game day it just finished, for someone holding no stock', () => {
    usageCtx.current = null
    sessionData.results[0].winner = 'a'
    renderPage()
    fireEvent.click(screen.getByTestId('finish-session'))
    act(() => setStatus.mock.calls[0][1].onSuccess())
    // Still on the game day, not bounced to the leaderboard. (The session is
    // static in these tests, so it stays on the matches tab; in the app the
    // refetched 'finished' status switches it to the standings.)
    expect(screen.queryByTestId('leaderboard-page')).toBeNull()
    expect(screen.getByTestId('matches-tab')).toBeInTheDocument()
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

  it('the round builder shows the template court count as empty slots', () => {
    // Round 1 has 2 courts, so a new round opens with 2 empty court slots.
    renderPage()
    fireEvent.click(screen.getByTestId('add-round'))
    expect(screen.getByTestId('round-builder')).toBeInTheDocument()
    expect(screen.getByTestId('court-slot-1')).toBeInTheDocument()
    expect(screen.getByTestId('court-slot-2')).toBeInTheDocument()
    expect(screen.queryByTestId('court-slot-3')).toBeNull()
  })

  it('scopes the round builder to this game day’s players, not the whole roster (TASK-32)', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('add-round'))
    // Only p1–p8 (this game day) are in the tray; p9–p12 aren't at the venue.
    expect(screen.getByTestId('pick-p8')).toBeInTheDocument()
    expect(screen.queryByTestId('pick-p9')).toBeNull()
  })

  it('derives the round builder’s player set from the (edited) line-ups (TASK-32 AC#3)', () => {
    // Court 2's line-up was edited to bring in p9 & p10 in place of p7 & p8, so
    // this game day's players are now p1–p6, p9, p10 — the tray follows.
    const original = sessionData.results[1]
    sessionData.results[1] = { ...original, teamB: ['p9', 'p10'] }
    renderPage()
    fireEvent.click(screen.getByTestId('add-round'))
    expect(screen.getByTestId('pick-p9')).toBeInTheDocument()
    expect(screen.queryByTestId('pick-p7')).toBeNull()
    sessionData.results[1] = original
  })

  it('fills a court by tapping players, then creates the round', () => {
    addMatch.mockClear()
    renderPage()
    fireEvent.click(screen.getByTestId('add-round'))
    // Tapping fills the courts in order (first court's slots first).
    fireEvent.click(screen.getByTestId('pick-p1'))
    fireEvent.click(screen.getByTestId('pick-p2'))
    fireEvent.click(screen.getByTestId('pick-p3'))
    fireEvent.click(screen.getByTestId('pick-p4'))
    fireEvent.click(screen.getByTestId('create-round'))
    // Only the one full court is created (court 1 of the new round 2).
    expect(addMatch).toHaveBeenCalledTimes(1)
    expect(addMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        round: 2,
        court: 1,
        players: ['p1', 'p2', 'p3', 'p4'],
      }),
    )
  })

  it('auto-fills a balanced round across all courts, then creates it', () => {
    addMatch.mockClear()
    renderPage()
    fireEvent.click(screen.getByTestId('add-round'))
    fireEvent.click(screen.getByTestId('auto-fill-round'))
    fireEvent.click(screen.getByTestId('create-round'))
    // 8 players, 2 courts → both courts created, all 8 players used once.
    expect(addMatch).toHaveBeenCalledTimes(2)
    const calls = addMatch.mock.calls.map((c) => c[0])
    expect(calls.map((c) => c.court).sort()).toEqual([1, 2])
    const all = calls.flatMap((c) => c.players)
    expect(new Set(all).size).toBe(8)
    for (const p of all) {
      expect(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']).toContain(p)
    }
  })

  it('cancels the round builder without creating anything', () => {
    addMatch.mockClear()
    renderPage()
    fireEvent.click(screen.getByTestId('add-round'))
    expect(screen.getByTestId('round-builder')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('cancel-round'))
    expect(screen.queryByTestId('round-builder')).toBeNull()
    expect(screen.getByTestId('add-round')).toBeInTheDocument()
    expect(addMatch).not.toHaveBeenCalled()
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
    try {
      renderPage()
      // Round 1 (the default page): p1–p8 play, p9–p12 rest.
      const resting1 = screen.getByTestId('resting-1')
      expect(resting1).toHaveTextContent('Resting:')
      expect(resting1).toHaveTextContent('Player 9')
      expect(resting1).toHaveTextContent('Player 12')
      // Page to round 2 (rounds are paged): p1–p8 rest there.
      fireEvent.click(screen.getByLabelText('Next round'))
      expect(screen.getByTestId('resting-2')).toHaveTextContent('Player 1')
    } finally {
      sessionData.results.pop()
    }
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

describe('changing a pair (TASK-80)', () => {
  beforeEach(() => {
    sessionData.session.kind = 'tournament'
    teams.current = [
      { id: 't1', player1Id: 'p1', player2Id: 'p2' },
      { id: 't2', player1Id: 'p3', player2Id: 'p4' },
    ]
    authRole.current = 'matchmaker'
  })

  it('substitutes one member, keeping the team', async () => {
    renderPage()
    fireEvent.click(screen.getByTestId('tab-points'))
    fireEvent.click(screen.getByTestId('change-pair-t1'))
    // p2 out, p9 in — p9 is on the roster but in no pair.
    fireEvent.click(screen.getByTestId('sub-out-p2'))
    fireEvent.click(screen.getByTestId('sub-in-p9'))
    fireEvent.click(screen.getByTestId('save-substitution'))
    expect(substitute).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 't1', outPlayerId: 'p2', inPlayerId: 'p9' }),
      expect.anything(),
    )
  })

  it('will not offer someone already in another pair', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('tab-points'))
    fireEvent.click(screen.getByTestId('change-pair-t1'))
    // p3 and p4 are team t2, so they must not beofferable as substitutes.
    expect(screen.queryByTestId('sub-in-p3')).toBeNull()
    expect(screen.queryByTestId('sub-in-p4')).toBeNull()
  })

  it('stays hidden for a player who cannot edit', () => {
    authRole.current = null
    renderPage()
    fireEvent.click(screen.getByTestId('tab-points'))
    expect(screen.queryByTestId('pairs-editor')).toBeNull()
  })
})
