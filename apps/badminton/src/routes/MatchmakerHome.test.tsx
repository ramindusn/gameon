import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { MatchSession } from '../play/api'

const { state } = vi.hoisted(() => ({
  state: {
    sessions: [] as MatchSession[],
    playerCounts: {} as Record<string, number>,
    // Who is signed in, as far as the stock context is concerned, and which
    // game days already have usage against them.
    stockCtx: null as { myHolderId?: string; isAdmin?: boolean } | null,
    // What each finished day used, keyed by session id.
    usage: {} as Record<string, { brand: string; shuttles: number }[]>,
    answered: [] as string[],
  },
}))

vi.mock('../play/useMatchPlay', () => ({
  useSessions: () => ({ data: state.sessions, isLoading: false, isError: false }),
  useSessionPlayerCounts: () => ({ data: state.playerCounts }),
}))
vi.mock('../roster/useRoster', () => ({
  useRoster: () => ({ data: { clubId: 'c1', players: [] }, isLoading: false, isError: false }),
}))
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: 'matchmaker', signOut: vi.fn() }),
}))
// The matchmaker's own-stock card fetches through TanStack Query; this suite
// renders without a QueryClient, and the card has its own tests.
vi.mock('../fund/MyStock', () => ({ MyStock: () => null }))
vi.mock('../fund/GameDayUsage', () => ({
  useStockContext: () => ({ data: state.stockCtx }),
}))
vi.mock('../fund/usageApi', () => ({
  loadSessionsWithUsage: () => Promise.resolve(state.answered),
  loadUsageBySession: () => Promise.resolve(state.usage),
}))

import { MatchmakerHome } from './MatchmakerHome'

function session(id: string, status: 'live' | 'finished'): MatchSession {
  return {
    id,
    clubId: 'c1',
    status,
    mode: 'open',
    kind: 'casual',
    rounds: 5,
    hidden: false,
    playedAt: '2026-06-22T18:00:00Z',
    createdAt: '2026-06-22T18:00:00Z',
  }
}

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MatchmakerHome />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  state.stockCtx = null
  state.answered = []
  state.usage = {}
})

describe('shuttles to record (TASK-76.5)', () => {
  // Before this there was no route from here to recording usage at all — the
  // matchmaker had to recall which day was outstanding and hunt for it.
  it('lists finished days with no usage, each linking to the game day', async () => {
    state.stockCtx = { myHolderId: 'h1' }
    state.sessions = [session('s1', 'finished'), session('s2', 'finished')]
    state.answered = ['s2']
    renderHome()
    expect(await screen.findByTestId('record-usage-s1')).toHaveAttribute(
      'href',
      '/game-days/s1',
    )
    // s2 drops off once the already-recorded list lands.
    await waitFor(() => expect(screen.queryByTestId('record-usage-s2')).toBeNull())
  })

  it('stays hidden for someone who cannot record usage', async () => {
    state.stockCtx = null
    state.sessions = [session('s1', 'finished')]
    renderHome()
    expect(screen.queryByTestId('shuttles-to-record')).toBeNull()
  })

  it('stays hidden when every day is already recorded', async () => {
    state.stockCtx = { myHolderId: 'h1' }
    state.sessions = [session('s1', 'finished')]
    state.answered = ['s1']
    renderHome()
    // Nothing outstanding is an absent card, not an empty one.
    await waitFor(() => expect(screen.queryByTestId('shuttles-to-record')).toBeNull())
  })
})

describe('MatchmakerHome (TASK-11.1)', () => {
  it('renders the matchmaker home', () => {
    state.sessions = []
    state.playerCounts = {}
    renderHome()
    expect(screen.getByTestId('matchmaker-home')).toBeInTheDocument()
    // The redundant quick-action buttons were removed (nav handles those).
    expect(screen.queryByTestId('action-generate')).toBeNull()
  })

  it('lists live game days with a resume link, before finished ones', () => {
    state.sessions = [session('s1', 'live'), session('s2', 'finished')]
    state.playerCounts = {}
    renderHome()
    expect(screen.getByTestId('resume-s1')).toHaveAttribute('href', '/game-days/s1')
    expect(screen.queryByTestId('live-empty')).toBeNull()
    // The finished game day shows under recent, not live.
    expect(screen.getByTestId('recent-s2')).toHaveAttribute('href', '/game-days/s2')
  })

  // Ten a page, newest first. The card used to render up to 20 rows, which on
  // a club with a season behind it is most of the screen.
  it('pages the history ten at a time, newest first', async () => {
    state.sessions = Array.from({ length: 23 }, (_, i) => session(`h${i}`, 'finished'))
    renderHome()
    expect(screen.getAllByTestId(/^recent-h/).length).toBe(10)
    const pager = screen.getByTestId('history-pager')
    expect(pager).toHaveTextContent('1–10 of 23')
    expect(screen.getByTestId('history-pager-prev')).toBeDisabled()

    fireEvent.click(screen.getByTestId('history-pager-next'))
    expect(pager).toHaveTextContent('11–20 of 23')
    expect(screen.getByTestId('history-pager-prev')).not.toBeDisabled()

    // The last page is a short one, and there is nowhere further to go.
    fireEvent.click(screen.getByTestId('history-pager-next'))
    expect(pager).toHaveTextContent('21–23 of 23')
    expect(screen.getAllByTestId(/^recent-h/).length).toBe(3)
    expect(screen.getByTestId('history-pager-next')).toBeDisabled()
  })

  it('leaves the pager off when everything fits on one page', () => {
    state.sessions = Array.from({ length: 4 }, (_, i) => session(`h${i}`, 'finished'))
    renderHome()
    expect(screen.queryByTestId('history-pager')).toBeNull()
  })

  // What a day cost in shuttles, on the row itself — otherwise you have to open
  // each game day to find out where the stock went.
  it('shows what each finished day used, biggest brand first', async () => {
    state.sessions = [session('s2', 'finished'), session('s3', 'finished')]
    state.usage = {
      s2: [
        { brand: 'Victor', shuttles: 5 },
        { brand: 'RSL', shuttles: 3 },
      ],
    }
    renderHome()
    const used = await screen.findByTestId('recent-usage-s2')
    expect(used).toHaveTextContent('5 Victor')
    expect(used).toHaveTextContent('3 RSL')
    // A day with nothing recorded says nothing — the "Shuttles to record" card
    // chases those, so a placeholder here would only repeat it.
    expect(screen.queryByTestId('recent-usage-s3')).toBeNull()
    expect(screen.queryByTestId('live-s2')).toBeNull()
  })

  it('shows an empty-state CTA when no game day is live', () => {
    state.sessions = [session('s2', 'finished')]
    state.playerCounts = {}
    renderHome()
    expect(screen.getByTestId('live-empty')).toBeInTheDocument()
    expect(screen.getByTestId('live-empty-generate')).toHaveAttribute('href', '/generate')
  })

  it("shows the live game day's own player count, not the whole roster", () => {
    state.sessions = [session('s1', 'live')]
    state.playerCounts = { s1: 9 }
    renderHome()
    expect(screen.getByTestId('live-active-s1')).toHaveTextContent('9 players')
    // The roster widget is gone.
    expect(screen.queryByTestId('roster-snapshot')).toBeNull()
  })
})
