import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { StockContext } from './usageApi'

// The admin records on other people's behalf (TASK-72): same form as the
// matchmaker, but the day is chosen from a dropdown of days still to answer.
const { ctx, answered, sessions } = vi.hoisted(() => ({
  ctx: { current: null as StockContext | null },
  answered: { current: [] as string[] },
  sessions: { current: [] as unknown[] },
}))

vi.mock('./usageApi', () => ({
  loadStockContext: () => Promise.resolve(ctx.current),
  loadSessionUsage: () => Promise.resolve([]),
  loadSessionsWithUsage: () => Promise.resolve(answered.current),
  recordGameDayUsage: vi.fn(),
}))
vi.mock('../play/useMatchPlay', () => ({
  useSessions: () => ({ data: sessions.current }),
}))

import { AdminGameDayUsage } from './AdminGameDayUsage'

const day = (id: string, playedAt: string) => ({
  id,
  clubId: 'c1',
  status: 'finished',
  mode: 'open',
  kind: 'casual',
  rounds: 1,
  hidden: false,
  playedAt,
  createdAt: playedAt,
})

const adminCtx: StockContext = {
  clubId: 'c1',
  products: [
    { id: 'p1', brand: 'RSL', model: 'C', shuttlesPerBarrel: 12 },
  ],
  holders: [{ id: 'h1', name: 'Ramboo', userId: 'u1' }],
  holdings: [{ productId: 'p1', holderId: 'h1', barrels: 2, looseShuttles: 0 }],
  myHolderId: undefined, // an admin need not hold any stock themselves
  isAdmin: true,
  costPerShuttle: { p1: 2 },
  userId: 'admin-user',
}

function renderAdmin(c: StockContext | null = adminCtx) {
  ctx.current = c
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AdminGameDayUsage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  answered.current = []
  sessions.current = [
    day('s1', '2026-08-01T18:00:00Z'),
    day('s3', '2026-08-05T18:00:00Z'), // the latest
    day('s2', '2026-08-03T18:00:00Z'),
  ]
})

describe('choosing the game day', () => {
  it('lists only days with no usage recorded, newest first', async () => {
    answered.current = ['s2'] // already answered, so it drops off
    renderAdmin()
    const group = await screen.findByTestId('usage-game-day')
    const ids = [...group.querySelectorAll('[role="radio"]')].map((el) =>
      el.getAttribute('data-testid'),
    )
    expect(ids).toEqual(['usage-game-day-s3', 'usage-game-day-s1'])
  })

  it('selects the latest outstanding game day by default', async () => {
    renderAdmin()
    await waitFor(() =>
      expect(screen.getByTestId('usage-game-day-s3')).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    )
  })

  // A picker offering one option is just a step to get past (TASK-76.5).
  it('states the day instead of offering a one-item picker', async () => {
    answered.current = ['s1', 's2']
    renderAdmin()
    const only = await screen.findByTestId('usage-game-day')
    expect(only).toHaveTextContent(/only game day still to record/i)
    expect(only.querySelector('[role="radio"]')).toBeNull()
  })

  it('says so when every game day has been answered', async () => {
    answered.current = ['s1', 's2', 's3']
    renderAdmin()
    expect(await screen.findByTestId('usage-all-done')).toBeInTheDocument()
    expect(screen.queryByTestId('usage-game-day')).toBeNull()
  })
})

describe('the form the admin gets', () => {
  it('is the matchmaker’s, with no holder preselected', async () => {
    renderAdmin()
    // Same chips + per-brand rows, but an admin holds nothing of their own so
    // they must say whose barrels it came out of.
    const chip = await screen.findByTestId('holder-h1')
    expect(chip).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('usage-none')).toBeInTheDocument()
  })

  it('renders nothing for someone who is not an admin', async () => {
    const { container } = renderAdmin({ ...adminCtx, isAdmin: false })
    await Promise.resolve()
    expect(container).toBeEmptyDOMElement()
  })
})
