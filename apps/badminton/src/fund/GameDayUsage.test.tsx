import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { StockContext } from './usageApi'

// Usage comes out of one matchmaker's barrels (TASK-69.8): the person recording
// it by default, someone else when the barrels were shared.
const { ctx, record, recorded } = vi.hoisted(() => ({
  ctx: { current: null as StockContext | null },
  record: vi.fn(),
  recorded: { current: [] as unknown[] },
}))

vi.mock('./usageApi', () => ({
  loadStockContext: () => Promise.resolve(ctx.current),
  loadSessionUsage: () => Promise.resolve(recorded.current),
  recordGameDayUsage: record,
}))

import { GameDayUsage, GameDayUsageModal, GameDayUsagePanel } from './GameDayUsage'

const rsl = {
  id: 'p1',
  brand: 'RSL',
  model: 'Classic',
  shuttlesPerBarrel: 12,
  barrels: 0,
  looseShuttles: 0,
}
const victor = { ...rsl, id: 'p2', brand: 'Victor', model: 'Pro' }

const base: StockContext = {
  clubId: 'c1',
  products: [rsl, victor],
  holders: [
    { id: 'h1', name: 'Ramboo', userId: 'u1' },
    { id: 'h2', name: 'Sahan', userId: 'u2' },
  ],
  // Ramboo holds RSL only; Sahan holds Victor only.
  holdings: [
    { productId: 'p1', holderId: 'h1', barrels: 2, looseShuttles: 0 },
    { productId: 'p2', holderId: 'h2', barrels: 1, looseShuttles: 0 },
  ],
  myHolderId: 'h1',
  myName: 'Ramboo',
  userId: 'u1',
}

function renderUsage(c: StockContext | null = base) {
  ctx.current = c
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <GameDayUsage sessionId="s1" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  recorded.current = []
})

// The holder is picked once, up front (TASK-70) — then only that person's
// brands appear, so nobody is offered a brand nobody is holding.
describe('who the shuttles come out of', () => {
  it('defaults to the signed-in matchmaker when they hold stock', async () => {
    renderUsage()
    await waitFor(() =>
      expect(screen.getByTestId('holder-h1')).toHaveAttribute('aria-checked', 'true'),
    )
    expect(screen.getByTestId('holder-h2')).toHaveAttribute('aria-checked', 'false')
  })

  it('preselects nobody when the signed-in matchmaker holds nothing', async () => {
    // Ramboo is a matchmaker but holds no stock at all — never guess for him.
    renderUsage({
      ...base,
      holdings: [{ productId: 'p2', holderId: 'h2', barrels: 1, looseShuttles: 0 }],
    })
    // Nothing is preselected — he has to say whose barrels these were.
    await waitFor(() => expect(screen.getByTestId('holder-h2')).toBeInTheDocument())
    expect(screen.getByTestId('holder-h2')).toHaveAttribute('aria-checked', 'false')
  })

  it('asks instead of recording when no holder is chosen', async () => {
    renderUsage({
      ...base,
      holdings: [{ productId: 'p2', holderId: 'h2', barrels: 1, looseShuttles: 0 }],
    })
    fireEvent.click(await screen.findByTestId('save-usage'))
    expect(await screen.findByTestId('usage-error')).toHaveTextContent(
      'Choose whose stock the shuttles came out of.',
    )
    expect(record).not.toHaveBeenCalled()
  })

  it('can be overridden even when the recorder does hold stock', async () => {
    renderUsage()
    // Defaulted to me…
    expect(await screen.findByTestId('holder-h1')).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByTestId('holder-h2')) // …but overridable
    // Sahan's brands replace Ramboo's.
    expect(await screen.findByTestId('used-p2')).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('used-p2'), { target: { value: '5' } })
    fireEvent.click(screen.getByTestId('save-usage'))

    await waitFor(() => expect(record).toHaveBeenCalledTimes(1))
    expect(record.mock.calls[0][0].lines).toEqual([
      expect.objectContaining({
        holder: expect.objectContaining({ name: 'Sahan' }),
        shuttlesUsed: 5,
      }),
    ])
  })

  it('only offers people who are actually holding something', async () => {
    renderUsage({
      ...base,
      holders: [...base.holders, { id: 'h3', name: 'Nimal', userId: 'u3' }],
    })
    const who = await screen.findByTestId('usage-holder')
    expect(who).toHaveTextContent('Ramboo')
    expect(who).toHaveTextContent('Sahan')
    // Nimal holds nothing, so there is nothing to take off him.
    expect(who).not.toHaveTextContent('Nimal')
    expect(screen.queryByTestId('holder-h3')).toBeNull()
  })
})

describe('the brands offered', () => {
  it('shows only the chosen holder’s brands, not every product', async () => {
    renderUsage()
    // Ramboo holds RSL only; Victor is Sahan's and must not be offered at all.
    expect(await screen.findByTestId('used-p1')).toBeInTheDocument()
    expect(screen.queryByTestId('used-p2')).toBeNull()
  })

  it('shows what that person has left, as barrels + loose', async () => {
    renderUsage({
      ...base,
      holdings: [{ productId: 'p1', holderId: 'h1', barrels: 2, looseShuttles: 5 }],
    })
    // 2 barrels of 12 + 5 loose = 29.
    expect(await screen.findByTestId('stock-p1')).toHaveTextContent(
      '2 barrels + 5 loose = 29 shuttles',
    )
  })

  it('says so when the chosen holder has run out', async () => {
    renderUsage({
      ...base,
      holders: [{ id: 'h1', name: 'Ramboo', userId: 'u1' }],
      holdings: [{ productId: 'p1', holderId: 'h1', barrels: 0, looseShuttles: 0 }],
    })
    // Nobody holds anything, so there is no one to pick and nothing to enter.
    const who = await screen.findByTestId('usage-holder')
    expect(who).toHaveTextContent('Nobody is holding stock')
    expect(screen.queryByTestId('used-p1')).toBeNull()
  })
})

describe('recording', () => {
  it('records the entered count against the defaulted holder', async () => {
    renderUsage()
    fireEvent.change(await screen.findByTestId('used-p1'), { target: { value: '4' } })
    fireEvent.click(screen.getByTestId('save-usage'))

    await waitFor(() => expect(record).toHaveBeenCalledTimes(1))
    const arg = record.mock.calls[0][0]
    expect(arg.sessionId).toBe('s1')
    expect(arg.lines).toEqual([
      expect.objectContaining({
        holder: expect.objectContaining({ name: 'Ramboo' }),
        shuttlesUsed: 4,
      }),
    ])
  })

  it('will not submit an empty form', async () => {
    renderUsage()
    fireEvent.click(await screen.findByTestId('save-usage'))
    expect(await screen.findByTestId('usage-error')).toHaveTextContent(
      'Enter how many shuttles were used.',
    )
    expect(record).not.toHaveBeenCalled()
  })

  it('surfaces a refusal to take more than the holder has', async () => {
    record.mockRejectedValueOnce(new Error('Ramboo does not have 99 RSL shuttles.'))
    renderUsage()
    fireEvent.change(await screen.findByTestId('used-p1'), { target: { value: '99' } })
    fireEvent.click(screen.getByTestId('save-usage'))
    expect(await screen.findByTestId('usage-error')).toHaveTextContent(
      'Ramboo does not have 99 RSL shuttles.',
    )
  })

  it('renders nothing for someone who is not a matchmaker', async () => {
    const { container } = renderUsage({ ...base, myHolderId: undefined })
    await Promise.resolve()
    expect(container).toBeEmptyDOMElement()
  })
})

// TASK-70: finishing a game day pops this up so usage is recorded while it is
// fresh, and the page keeps a compact way back into it.
function renderIn(node: React.ReactNode, c: StockContext | null = base) {
  ctx.current = c
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}

describe('the finish-game-day popup (TASK-70)', () => {
  it('shows the usage form when open', async () => {
    renderIn(<GameDayUsageModal sessionId="s1" open onClose={vi.fn()} />)
    expect(await screen.findByTestId('used-p1')).toBeInTheDocument()
  })

  it('renders nothing while closed', () => {
    const { container } = renderIn(
      <GameDayUsageModal sessionId="s1" open={false} onClose={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lets the matchmaker defer with Later, recording nothing', async () => {
    const onClose = vi.fn()
    renderIn(<GameDayUsageModal sessionId="s1" open onClose={onClose} />)
    fireEvent.click(await screen.findByTestId('usage-later'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(record).not.toHaveBeenCalled()
  })

  it('closes itself once the usage is recorded', async () => {
    const onClose = vi.fn()
    renderIn(<GameDayUsageModal sessionId="s1" open onClose={onClose} />)
    fireEvent.change(await screen.findByTestId('used-p1'), { target: { value: '4' } })
    fireEvent.click(screen.getByTestId('save-usage'))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})

describe('the game day page usage panel (TASK-70)', () => {
  it('says nothing is recorded yet and offers to record it', async () => {
    renderIn(<GameDayUsagePanel sessionId="s1" onOpen={vi.fn()} />)
    expect(await screen.findByTestId('usage-empty')).toBeInTheDocument()
    expect(screen.getByTestId('open-usage')).toHaveTextContent('Record usage')
  })

  it('summarises what was recorded, per brand and holder', async () => {
    recorded.current = [
      {
        entryId: 'e1',
        sessionId: 's1',
        occurredAt: '2026-08-05T10:00:00Z',
        items: [
          { productId: 'p1', brand: 'RSL', shuttlesUsed: 4, holderName: 'Ramboo' },
        ],
      },
      // A second entry for the same brand+holder sums into one line.
      {
        entryId: 'e2',
        sessionId: 's1',
        occurredAt: '2026-08-05T11:00:00Z',
        items: [
          { productId: 'p1', brand: 'RSL', shuttlesUsed: 2, holderName: 'Ramboo' },
          { productId: 'p2', brand: 'Victor', shuttlesUsed: 3, holderName: 'Sahan' },
        ],
      },
    ]
    renderIn(<GameDayUsagePanel sessionId="s1" onOpen={vi.fn()} />)

    const summary = await screen.findByTestId('usage-summary')
    expect(summary).toHaveTextContent('6 × RSL')
    expect(summary).toHaveTextContent('from Ramboo')
    expect(summary).toHaveTextContent('3 × Victor')
    // With usage on the board the button offers a correction instead.
    expect(screen.getByTestId('open-usage')).toHaveTextContent('Update usage')
  })

  it('opens the popup when asked', async () => {
    const onOpen = vi.fn()
    renderIn(<GameDayUsagePanel sessionId="s1" onOpen={onOpen} />)
    fireEvent.click(await screen.findByTestId('open-usage'))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('stays hidden for someone with no stock of their own', async () => {
    const { container } = renderIn(
      <GameDayUsagePanel sessionId="s1" onOpen={vi.fn()} />,
      { ...base, myHolderId: undefined },
    )
    await Promise.resolve()
    expect(container).toBeEmptyDOMElement()
  })
})

// Some days are played on shuttles from outside the club, so "none" has to be
// sayable — otherwise the day never leaves the admin's missing-usage list.
describe('recording none from stock (TASK-72)', () => {
  it('records an explicit none without asking for a holder or counts', async () => {
    renderUsage()
    fireEvent.click(await screen.findByTestId('usage-none'))
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1))
    expect(record.mock.calls[0][0]).toEqual(
      expect.objectContaining({ sessionId: 's1', none: true, lines: [] }),
    )
  })

  it('shows a day answered as none as such, not as unrecorded', async () => {
    // An entry with no items is the "none" answer.
    recorded.current = [
      { entryId: 'e1', sessionId: 's1', occurredAt: '2026-08-05T10:00:00Z', items: [] },
    ]
    renderIn(<GameDayUsagePanel sessionId="s1" onOpen={vi.fn()} />)
    expect(await screen.findByTestId('usage-none-recorded')).toBeInTheDocument()
    expect(screen.queryByTestId('usage-empty')).toBeNull()
    expect(screen.getByTestId('open-usage')).toHaveTextContent('Update usage')
  })
})
