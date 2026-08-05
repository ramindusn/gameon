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
        },
      ],
      totalShuttles: 125,
    }
    renderCard()
    const row = await screen.findByTestId('my-stock-p1')
    expect(row).toHaveTextContent('RSL')
    expect(row).toHaveTextContent('10')
    expect(row).toHaveTextContent('5')
    expect(screen.getByTestId('my-stock-total')).toHaveTextContent('125 shuttles in total')
  })

  it('renders nothing when they hold no stock, rather than an empty card', async () => {
    stock.current = { holderName: 'Ramboo', items: [], totalShuttles: 0 }
    const { container } = renderCard()
    await Promise.resolve()
    expect(screen.queryByTestId('my-stock')).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
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
        },
      ],
      totalShuttles: 12,
    }
    renderCard()
    await screen.findByTestId('my-stock-p1')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
