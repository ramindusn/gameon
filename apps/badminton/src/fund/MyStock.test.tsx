import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { MyStock as MyStockData } from './api'

// A matchmaker sees the barrels in their own hands, read-only (TASK-69).
const { stock } = vi.hoisted(() => ({ stock: { current: null as MyStockData | null } }))
vi.mock('./api', () => ({ loadMyStock: () => Promise.resolve(stock.current) }))

import { MyStock } from './MyStock'

function renderCard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MyStock />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  stock.current = null
})

describe('MyStock', () => {
  it("lists the stock in the matchmaker's hands", async () => {
    stock.current = {
      holderName: 'Ramboo',
      items: [
        {
          productId: 'p1',
          brand: 'RSL',
          model: 'Classic',
          barrels: 10,
          looseShuttles: 5,
          shuttles: 125,
          clubShuttles: 250,
        },
      ],
      totalShuttles: 125,
      clubTotalShuttles: 200,
    }
    renderCard()
    const row = await screen.findByTestId('my-stock-p1')
    expect(row).toHaveTextContent('RSL')
    expect(row).toHaveTextContent('10')
    expect(row).toHaveTextContent('5')
    // "in your hands", not "in total" — the dashboard's club figure is shown
    // under a similar heading and the two read as a contradiction otherwise.
    expect(screen.getByTestId('my-stock-total')).toHaveTextContent(
      "125 shuttles in Ramboo's hands",
    )
    // Per-brand club figure, so "have we enough RSL?" is answerable here.
    expect(screen.getByTestId('club-p1')).toHaveTextContent('125 of 250 in the club')
    expect(screen.getByTestId('my-stock-club-total')).toHaveTextContent('of 200 in the club')
  })

  // Vanishing left them with no explanation for the "Nobody is holding stock"
  // they then meet in the usage form (TASK-76.2).
  it('explains itself when they are a matchmaker holding nothing', async () => {
    stock.current = { holderName: 'Ramboo', items: [], totalShuttles: 0, clubTotalShuttles: 0 }
    renderCard()
    expect(await screen.findByTestId('my-stock-empty')).toHaveTextContent(
      /not holding any shuttles/i,
    )
    expect(screen.queryByTestId('my-stock')).not.toBeInTheDocument()
  })

  it('leaves the club line off when they hold all of it', async () => {
    stock.current = {
      holderName: 'Ramboo',
      items: [
        {
          productId: 'p1',
          brand: 'RSL',
          model: 'C',
          barrels: 1,
          looseShuttles: 0,
          shuttles: 12,
          clubShuttles: 12,
        },
      ],
      totalShuttles: 12,
      clubTotalShuttles: 12,
    }
    renderCard()
    await screen.findByTestId('my-stock-total')
    expect(screen.queryByTestId('my-stock-club-total')).toBeNull()
  })

  it('renders nothing for someone who is not a matchmaker', async () => {
    stock.current = null
    const { container } = renderCard()
    await Promise.resolve()
    expect(container).toBeEmptyDOMElement()
  })

  it('offers no editing controls — allocation is an admin job', async () => {
    stock.current = {
      holderName: 'Ramboo',
      items: [
        {
          productId: 'p1',
          brand: 'RSL',
          model: 'Classic',
          barrels: 1,
          looseShuttles: 0,
          shuttles: 12,
          clubShuttles: 24,
        },
      ],
      totalShuttles: 12,
      clubTotalShuttles: 12,
    }
    renderCard()
    await screen.findByTestId('my-stock-p1')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
