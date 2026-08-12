import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PlayerMatch } from '../play/api'

// p1's history: three with p2 (two won), one with p3. Only the p2 ones belong
// on the p1+p2 pair page.
const { history } = vi.hoisted(() => ({
  history: [
    { id: 'm1', sessionId: 's3', date: '2026-06-24', mode: 'open', partnerId: 'p2',
      opponentIds: ['p3', 'p4'], scoreFor: 21, scoreAgainst: 12, won: true },
    { id: 'm2', sessionId: 's2', date: '2026-06-20', mode: 'open', partnerId: 'p2',
      opponentIds: ['p3', 'p4'], scoreFor: 21, scoreAgainst: 18, won: true },
    { id: 'm3', sessionId: 's1', date: '2026-06-18', mode: 'open', partnerId: 'p2',
      opponentIds: ['p5', 'p6'], scoreFor: 15, scoreAgainst: 21, won: false },
    { id: 'm4', sessionId: 's1', date: '2026-06-18', mode: 'open', partnerId: 'p3',
      opponentIds: ['p2', 'p4'], scoreFor: 21, scoreAgainst: 10, won: true },
    { id: 'm5', sessionId: 's0', date: '2026-06-10', mode: 'open', partnerId: 'p2',
      opponentIds: ['p3', 'p4'], scoreFor: 21, scoreAgainst: 19, won: true },
  ] as PlayerMatch[],
}))

vi.mock('../roster/useRoster', () => ({
  useRoster: () => ({ data: { clubId: 'c1', players: [] }, isLoading: false, isError: false }),
}))
vi.mock('../play/api', () => ({ loadPlayerHistory: () => Promise.resolve(history) }))
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ role: null, signOut: vi.fn() }) }))
vi.mock('../ranking/useRanking', () => ({
  usePairBoard: () => ({
    data: [{ player1Id: 'p1', player2Id: 'p2', rating: 1588, rd: 55, games: 3 }],
  }),
  usePairRatingHistory: () => ({
    data: {
      points: [
        { sessionId: 's1', playedAt: '2026-06-18', rating: 1500 },
        { sessionId: 's2', playedAt: '2026-06-20', rating: 1560 },
        { sessionId: 's3', playedAt: '2026-06-24', rating: 1588 },
      ],
      rank: 3,
      prevRank: 5,
      provisional: false,
    },
  }),
  usePlayerNames: () => (id: string | null) =>
    ({ p1: 'Alice', p2: 'Bob', p3: 'Cara', p4: 'Dan', p5: 'Eve', p6: 'Finn' })[id ?? ''] ?? '—',
}))

import { PairProfilePage } from './PairProfilePage'

function renderPair(a = 'p1', b = 'p2') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/pairs/${a}/${b}`]}>
        <Routes>
          <Route path="/pairs/:a/:b" element={<PairProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PairProfilePage (TASK-90)', () => {
  it('shows only the matches the two played together', async () => {
    renderPair()
    const list = await screen.findByTestId('pair-history')
    // m1, m2, m3, m5 are with p2; m4 is p1 partnering somebody else. Four
    // matches across four game days, so only the newest three days show.
    expect(list.querySelectorAll('li').length).toBe(3)
  })

  // 42 matches in one list is a lot to scroll past, so the history previews the
  // most recent game days the way the player profile does.
  it('previews recent game days and reveals the rest on demand', async () => {
    renderPair()
    const list = await screen.findByTestId('pair-history')
    expect(list.querySelectorAll('li').length).toBe(3)
    const toggle = screen.getByTestId('pair-history-toggle')
    expect(toggle).toHaveTextContent('Show all 4 game days')

    fireEvent.click(toggle)
    expect(list.querySelectorAll('li').length).toBe(4)
    expect(screen.getByTestId('pair-history-toggle')).toHaveTextContent('Show fewer')
  })

  it('reports the record, win rate and point differential for the pair alone', async () => {
    renderPair()
    const stats = await screen.findByTestId('pair-stats')
    expect(stats).toHaveTextContent('3W – 1L')
    expect(stats).toHaveTextContent('75%')
    // (21-12) + (21-18) + (15-21) + (21-19) = +8. m4 must not contribute.
    expect(screen.getByTestId('pair-diff')).toHaveTextContent('+8')
  })

  // Most partnerships in a club have played once or twice, and their Glicko is
  // noise. Showing a number invites reading a rank into two lucky matches.
  it('says provisional instead of a rating when they have barely played', async () => {
    renderPair()
    await screen.findByTestId('pair-stats')
    expect(screen.getByTestId('pair-stats')).toHaveTextContent('Provisional')
    expect(screen.getByTestId('pair-provisional')).toHaveTextContent('played 4')
    expect(screen.getByTestId('pair-stats')).not.toHaveTextContent('1588')
  })

  // Against opposing PAIRS: a per-person list splits one rivalry in two and
  // counts every match twice, which is the wrong question on a pair's page.
  it('gives the record against each opposing pair, not each person', async () => {
    renderPair()
    const h2h = await screen.findByTestId('pair-h2h')
    // Cara & Dan met them three times and lost all three; Eve & Finn met them
    // once and won.
    expect(h2h.querySelectorAll('li').length).toBe(2)
    expect(within(h2h).getByTestId('h2h-p3|p4')).toHaveTextContent('3W')
    expect(within(h2h).getByTestId('h2h-p5|p6')).toHaveTextContent('0W')
    // Each opposing pair links to its own page — the testid sits on the link.
    expect(within(h2h).getByTestId('h2h-p3|p4')).toHaveAttribute('href', '/pairs/p3/p4')
  })

  it('is the same page whichever way round the two ids are given', async () => {
    const { unmount } = renderPair('p1', 'p2')
    expect((await screen.findByTestId('pair-history')).querySelectorAll('li').length).toBe(3)
    unmount()
    // p2 first: the board lookup uses pairKey, so it still finds the pair.
    renderPair('p2', 'p1')
    expect(await screen.findByTestId('pair-profile')).toBeInTheDocument()
  })

  it('says so when the two have never partnered, rather than showing a blank page', async () => {
    renderPair('p1', 'p9')
    expect(await screen.findByTestId('pair-empty')).toHaveTextContent(/not played a match together/i)
    expect(screen.queryByTestId('pair-stats')).toBeNull()
  })
})
