import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { StockContext } from './usageApi'

// The admin records on other people's behalf (TASK-72): same form as the
// matchmaker, but the day is chosen from a dropdown of days still to answer.
const { ctx, answered, sessions, recordStandalone } = vi.hoisted(() => ({
  ctx: { current: null as StockContext | null },
  answered: { current: [] as string[] },
  sessions: { current: [] as unknown[] },
  recordStandalone: vi.fn<(input: unknown) => Promise<void>>(() => Promise.resolve()),
}))

vi.mock('./usageApi', () => ({
  loadStockContext: () => Promise.resolve(ctx.current),
  loadSessionUsage: () => Promise.resolve([]),
  loadSessionsWithUsage: () => Promise.resolve(answered.current),
  recordGameDayUsage: vi.fn(),
  recordStandaloneUsage: recordStandalone,
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

// Shuttles get used whether or not a game day row survives to hold the record.
// On 2026-08-26 an evening was played, club shuttles were used, and the game day
// was then deleted by accident — leaving a holder short with no way to say so,
// because recording usage required a day to attach it to (TASK-95).
describe('usage with no game day (TASK-95)', () => {
  it('is offered even when every game day has been answered', async () => {
    answered.current = ['s1', 's2', 's3']
    renderAdmin()
    // The card used to be a dead end here — this is exactly when a correction
    // with no day to attach it to is needed.
    expect(await screen.findByTestId('usage-all-done')).toBeInTheDocument()
    expect(screen.getByTestId('standalone-open')).toBeInTheDocument()
  })

  it('stays folded away until asked for, so it does not crowd the day-by-day flow', async () => {
    renderAdmin()
    expect(await screen.findByTestId('standalone-open')).toBeInTheDocument()
    expect(screen.queryByTestId('standalone-usage')).toBeNull()
  })

  it('records the date, the note and the shuttles against no game day', async () => {
    answered.current = ['s1', 's2', 's3']
    renderAdmin()
    fireEvent.click(await screen.findByTestId('standalone-open'))

    fireEvent.change(screen.getByTestId('standalone-date'), {
      target: { value: '2026-08-26' },
    })
    fireEvent.change(screen.getByTestId('standalone-note'), {
      target: { value: 'Tue session, game day was deleted' },
    })
    // Whose barrels it came out of, then how many.
    fireEvent.click(screen.getByTestId('holder-h1'))
    fireEvent.change(screen.getByTestId('used-p1'), { target: { value: '5' } })
    fireEvent.click(screen.getByTestId('save-usage'))

    await waitFor(() => expect(recordStandalone).toHaveBeenCalled())
    const arg = recordStandalone.mock.calls[0][0] as {
      note: string
      occurredAt: string
      lines: { shuttlesUsed: number; holder: { id: string } }[]
    }
    expect(arg.note).toBe('Tue session, game day was deleted')
    expect(arg.lines).toHaveLength(1)
    expect(arg.lines[0].shuttlesUsed).toBe(5)
    expect(arg.lines[0].holder.id).toBe('h1')
    // Midday, so rendering it back in a local timezone cannot slip it to the
    // day before.
    expect(arg.occurredAt.slice(0, 10)).toBe('2026-08-26')
  })

  it('offers no "none were used" escape — there is no day to close off', async () => {
    answered.current = ['s1', 's2', 's3']
    renderAdmin()
    fireEvent.click(await screen.findByTestId('standalone-open'))
    expect(screen.queryByTestId('usage-none')).toBeNull()
  })
})
