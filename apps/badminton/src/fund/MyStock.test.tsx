import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
      club: {
        items: [
          {
            productId: 'p1',
            brand: 'RSL',
            model: 'Classic',
            barrels: 20,
            looseShuttles: 9,
            shuttles: 249,
          },
        ],
        holders: [
          {
            holderId: 'h1',
            name: 'Ramboo',
            cells: { p1: { barrels: 10, looseShuttles: 5 } },
            totalShuttles: 125,
          },
        ],
        totalShuttles: 200,
      },
    }
    renderCard()
    const row = await screen.findByTestId('my-stock-p1')
    expect(row).toHaveTextContent('RSL')
    expect(row).toHaveTextContent('10')
    expect(row).toHaveTextContent('5')
    // Their own total, plainly. It used to read "125 of 200 in the club",
    // which made the card answer two questions at once.
    expect(screen.getByTestId('my-stock-total')).toHaveTextContent('125 shuttles')
  })

  // The counts are icons, and their title attributes need a hover the phone
  // this card is read on does not have. The legend says it once per card.
  it('names the two glyphs once, above the rows', async () => {
    stock.current = {
      holderName: 'Ramboo',
      items: [
        { productId: 'p1', brand: 'RSL', model: 'C', barrels: 1, looseShuttles: 0, shuttles: 12 },
      ],
      totalShuttles: 12,
      club: null,
    }
    renderCard()
    const legend = await screen.findByTestId('my-stock-legend')
    expect(legend).toHaveTextContent('barrels')
    expect(legend).toHaveTextContent('loose shuttles')
  })

  it('leaves the legend off when there are no rows to read', async () => {
    stock.current = { holderName: 'Ramboo', items: [], totalShuttles: 0, club: null }
    renderCard()
    await screen.findByTestId('my-stock-empty')
    expect(screen.queryByTestId('my-stock-legend')).not.toBeInTheDocument()
  })

  // The club figures were a second line inside every row of the card above,
  // which crowded the brand name and invited comparing a personal loose count
  // against a club-wide total. They are their own card now.
  describe('the club card', () => {
    const withOthers = (mine: number, clubTotal: number): MyStockData => ({
      holderName: 'Ramboo',
      items: [
        {
          productId: 'p1',
          brand: 'RSL',
          model: 'Classic',
          barrels: 1,
          looseShuttles: 0,
          shuttles: mine,
        },
      ],
      totalShuttles: mine,
      club:
        clubTotal > mine
          ? {
              items: [
                {
                  productId: 'p1',
                  brand: 'RSL',
                  model: 'Classic',
                  barrels: 2,
                  looseShuttles: 0,
                  shuttles: 24,
                },
                // A brand this matchmaker holds none of still belongs here:
                // the card is the club's picture, not a column on theirs.
                {
                  productId: 'p2',
                  brand: 'Victor',
                  model: 'Ace',
                  barrels: 3,
                  looseShuttles: 4,
                  shuttles: 40,
                },
              ],
              holders: [
                {
                  holderId: 'h1',
                  name: 'Ramboo',
                  cells: { p1: { barrels: 1, looseShuttles: 0 } },
                  totalShuttles: mine,
                },
                {
                  holderId: 'h2',
                  name: 'Sahan',
                  // Holds Victor only — the RSL cells must read as "none".
                  cells: { p2: { barrels: 3, looseShuttles: 4 } },
                  totalShuttles: clubTotal - mine,
                },
              ],
              totalShuttles: clubTotal,
            }
          : null,
    })

    it('says who holds what, one row per matchmaker, with their total', async () => {
      stock.current = withOthers(12, 64)
      renderCard()
      const table = await screen.findByTestId('club-stock')
      // Brands are the columns.
      expect(table).toHaveTextContent('RSL')
      expect(table).toHaveTextContent('Victor')

      const sahan = screen.getByTestId('club-holder-h2')
      expect(sahan).toHaveTextContent('Sahan')
      expect(sahan).toHaveTextContent('3') // Victor barrels
      expect(sahan).toHaveTextContent('4') // Victor loose
      expect(sahan).toHaveTextContent('52') // their own shuttle total

      // A brand a holder has none of reads as nothing, not as a zero they hold.
      expect(within(sahan).getAllByText('–').length).toBe(2)

      expect(screen.getByTestId('club-stock-total')).toHaveTextContent(
        '64 shuttles across every matchmaker',
      )
      expect(screen.getByTestId('club-stock-legend')).toHaveTextContent('barrels')
    })

    it('is left off entirely when nobody else holds any', async () => {
      stock.current = withOthers(12, 12)
      renderCard()
      await screen.findByTestId('my-stock-p1')
      expect(screen.queryByTestId('club-stock')).not.toBeInTheDocument()
      expect(screen.queryByText(/club stocks/i)).not.toBeInTheDocument()
    })
  })

  // Vanishing left them with no explanation for the "Nobody is holding stock"
  // they then meet in the usage form (TASK-76.2).
  it('explains itself when they are a matchmaker holding nothing', async () => {
    stock.current = { holderName: 'Ramboo', items: [], totalShuttles: 0, club: null }
    renderCard()
    expect(await screen.findByTestId('my-stock-empty')).toHaveTextContent(
      /not holding any shuttles/i,
    )
    expect(screen.queryByTestId('my-stock')).not.toBeInTheDocument()
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
      club: null,
    }
    renderCard()
    await screen.findByTestId('my-stock-p1')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
