import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfirmProvider } from '@gameon/ui'
import { LOW_STOCK_THRESHOLD } from '@gameon/domain'
import type { FundState, Holding, Product, StockHolder } from '@gameon/domain'

// StockPanel reads through useFund and the audit log through the api; both are
// stubbed so the test drives rendering plus the allocate/transfer wiring.
const { fundState, transfer, removeHolding, myHolder, logRows } = vi.hoisted(() => ({
  fundState: { current: null as FundState | null },
  transfer: vi.fn(),
  removeHolding: vi.fn(),
  myHolder: { current: undefined as StockHolder | undefined },
  logRows: { current: [] as unknown[] },
}))

vi.mock('./useFund', () => ({
  useFund: () => ({
    state: fundState.current,
    myHolder: myHolder.current,
    transfer,
    removeHolding,
    cloudBacked: true,
  }),
}))
vi.mock('./api', () => ({ loadInventoryLog: () => Promise.resolve(logRows.current) }))

import { StockPanel } from './StockPanel'

const rsl: Product = {
  id: 'p1',
  brand: 'RSL',
  model: 'Classic',
  shuttlesPerBarrel: 12,
  barrels: 0,
  looseShuttles: 0,
}
const victor: Product = { ...rsl, id: 'p2', brand: 'Victor', model: 'Pro' }

const ramboo: StockHolder = { id: 'h1', name: 'Ramboo', userId: 'u1' }
const kasun: StockHolder = { id: 'h2', name: 'Kasun', userId: 'u2' }

const holding = (o: Partial<Holding>): Holding => ({
  productId: 'p1',
  holderId: 'h1',
  barrels: 0,
  looseShuttles: 0,
  ...o,
})

const state: FundState = {
  members: [],
  products: [rsl, victor],
  purchases: [],
  usage: [],
  expenses: [],
  holders: [ramboo, kasun],
  holdings: [
    holding({ productId: 'p1', holderId: 'h1', barrels: 10, looseShuttles: 5 }),
    holding({ productId: 'p1', holderId: 'h2', barrels: 2, looseShuttles: 3 }),
    holding({ productId: 'p2', holderId: 'h2', barrels: 4 }),
  ],
}

function renderPanel(s: FundState = state) {
  fundState.current = s
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ConfirmProvider>
        <StockPanel />
      </ConfirmProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  myHolder.current = undefined
  logRows.current = []
})

describe('grand total', () => {
  it('heads the card with the whole club position across brands', () => {
    renderPanel()
    // RSL 12 barrels + 8 loose (152) and Victor 4 barrels (48).
    expect(screen.getByTestId('grand-barrels')).toHaveTextContent('16')
    expect(screen.getByTestId('grand-loose')).toHaveTextContent('8')
    expect(screen.getByTestId('grand-shuttles')).toHaveTextContent('200')
  })

  it('reads zero when nothing is held', () => {
    renderPanel({ ...state, products: [], holdings: [] })
    expect(screen.getByTestId('grand-shuttles')).toHaveTextContent('0')
  })
})

describe('removing a stock record', () => {
  it('removes it after confirmation, passing the counts for the audit entry', async () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('remove-h2-p2'))
    // Scope to the dialog: the row buttons are also labelled "Remove".
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(removeHolding).toHaveBeenCalledTimes(1))
    expect(removeHolding).toHaveBeenCalledWith(
      expect.objectContaining({ holder: kasun, prevBarrels: 4, prevLooseShuttles: 0 }),
    )
  })

  it('does nothing when the confirmation is dismissed', async () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('remove-h1-p1'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(removeHolding).not.toHaveBeenCalled())
  })
})

describe('club summary', () => {
  it('totals each brand across every matchmaker holding it', () => {
    renderPanel()
    expect(screen.getByTestId('summary-barrels-p1')).toHaveTextContent('12') // 10 + 2
    expect(screen.getByTestId('summary-loose-p1')).toHaveTextContent('8') // 5 + 3
    expect(screen.getByTestId('summary-p1')).toHaveTextContent('152') // 12*12 + 8
  })

  // Remaining stock used to be shown here AND in the Inventory panel on the
  // same tab; StockPanel is now its only home (TASK-76.3).
  it('derives each brand\'s shuttle total from barrels and loose', () => {
    renderPanel()
    // p1: (10 + 2) barrels * 12 + (5 + 3) loose = 152.
    expect(within(screen.getByTestId('summary-p1')).getByText(/152/)).toBeInTheDocument()
  })

  it('flags low stock off the derived total, not the barrel count', () => {
    // 1 barrel * 12 + 0 loose = 12 shuttles, under the threshold.
    renderPanel({
      ...state,
      holdings: [holding({ productId: 'p1', holderId: 'h1', barrels: 1 })],
      products: [rsl],
    })
    expect(12).toBeLessThan(LOW_STOCK_THRESHOLD)
    expect(screen.getAllByText('Low stock').length).toBeGreaterThan(0)
  })

  it('renders cleanly with no products', () => {
    renderPanel({ ...state, products: [], holdings: [] })
    expect(screen.getByText('No products yet.')).toBeInTheDocument()
  })
})

describe('held-by breakdown', () => {
  it('lists each matchmaker with their totals', () => {
    renderPanel()
    expect(
      within(screen.getByTestId('holder-h1')).getByText(/125 shuttles/),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('holder-h2')).getByText(/75 shuttles/),
    ).toBeInTheDocument()
  })

  it('leaves out matchmakers who are holding nothing', () => {
    const spare: StockHolder = { id: 'h3', name: 'Uditha' }
    renderPanel({ ...state, holders: [ramboo, kasun, spare] })
    // Uditha holds no stock, so he is not in the breakdown at all...
    expect(screen.queryByTestId('holder-h3')).not.toBeInTheDocument()
    expect(
      within(screen.getByTestId('holder-breakdown')).queryByText('Uditha'),
    ).toBeNull()
    // ...but he is still a candidate to receive a transfer.
    fireEvent.click(screen.getByTestId('transfer-stock'))
    expect(
      within(screen.getByTestId('transfer-to')).getByRole('radio', { name: 'Uditha' }),
    ).toBeInTheDocument()
  })

  it('shows an empty state when nobody is holding anything', () => {
    renderPanel({ ...state, holdings: [] })
    expect(screen.getByText(/Nobody is holding stock yet/)).toBeInTheDocument()
  })

  it('marks the signed-in matchmaker', () => {
    myHolder.current = kasun
    renderPanel()
    expect(within(screen.getByTestId('holder-h2')).getByText('You')).toBeInTheDocument()
  })
})

describe('transferring stock', () => {
  it('moves barrels from one matchmaker to another', async () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('transfer-stock'))
    fireEvent.click(screen.getByTestId('stock-product-p1'))
    fireEvent.click(screen.getByTestId('transfer-from-h1'))
    fireEvent.click(screen.getByTestId('transfer-to-h2'))
    fireEvent.change(screen.getByTestId('transfer-barrels'), { target: { value: '4' } })
    fireEvent.click(screen.getByTestId('save-transfer'))

    await waitFor(() => expect(transfer).toHaveBeenCalledTimes(1))
    expect(transfer).toHaveBeenCalledWith(
      expect.objectContaining({
        from: ramboo,
        to: kasun,
        barrels: 4,
        fromBarrels: 10,
        toBarrels: 2,
      }),
    )
  })

  it('offers only matchmakers who hold the chosen product as the giver', async () => {
    const spare: StockHolder = { id: 'h3', name: 'Uditha' }
    renderPanel({ ...state, holders: [ramboo, kasun, spare] })
    fireEvent.click(screen.getByTestId('transfer-stock'))

    // Before a product is chosen there is nobody to give it.
    expect(screen.getByTestId('transfer-from')).toHaveTextContent(/Pick a product first/)
    expect(screen.queryByTestId('transfer-from-h1')).toBeNull()

    // Victor (p2) is held only by Kasun.
    fireEvent.click(screen.getByTestId('stock-product-p2'))
    expect(
      within(screen.getByTestId('transfer-from')).getByRole('radio', { name: 'Kasun' }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('transfer-from-h1')).toBeNull()
    expect(screen.queryByTestId('transfer-from-h3')).toBeNull()

    // RSL (p1) is held by both Ramboo and Kasun, but never by Uditha.
    fireEvent.click(screen.getByTestId('stock-product-p1'))
    expect(
      within(screen.getByTestId('transfer-from')).getByRole('radio', { name: 'Ramboo' }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('transfer-from-h3')).toBeNull()
  })

  it('offers only products somebody is actually holding', () => {
    // A third product nobody holds — used up, or no longer stocked.
    const gone: Product = { ...rsl, id: 'p3', brand: 'Li-Ning', model: 'A+90' }
    renderPanel({ ...state, products: [rsl, victor, gone] })
    fireEvent.click(screen.getByTestId('transfer-stock'))

    const picker = screen.getByTestId('stock-product')
    expect(within(picker).getByRole('radio', { name: 'RSL Classic' })).toBeInTheDocument()
    expect(within(picker).queryByRole('radio', { name: 'Li-Ning A+90' })).toBeNull()
  })

  it('disables transfer entirely when nothing is held', () => {
    renderPanel({ ...state, holdings: [] })
    expect(screen.getByTestId('transfer-stock')).toBeDisabled()
  })

  it('drops a product from the list once the last holder is emptied', () => {
    // Victor is held only by Kasun; zero him out and it is no longer offered.
    renderPanel({
      ...state,
      holdings: state.holdings.map((h) =>
        h.productId === 'p2' ? { ...h, barrels: 0, looseShuttles: 0 } : h,
      ),
    })
    fireEvent.click(screen.getByTestId('transfer-stock'))
    const picker = screen.getByTestId('stock-product')
    expect(within(picker).queryByRole('radio', { name: 'Victor Pro' })).toBeNull()
  })

  it('clears a chosen giver when the product changes to one they do not hold', async () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('transfer-stock'))
    fireEvent.click(screen.getByTestId('stock-product-p1'))
    fireEvent.click(screen.getByTestId('transfer-from-h1'))
    expect(screen.getByTestId('transfer-from-h1')).toHaveAttribute('aria-checked', 'true')
    // Ramboo holds no Victor, so the selection cannot stand.
    fireEvent.click(screen.getByTestId('stock-product-p2'))
    expect(screen.queryByTestId('transfer-from-h1')).toBeNull()
    expect(screen.getByTestId('transfer-from-h2')).toHaveAttribute('aria-checked', 'false')
  })

  it('refuses to move more than the giver is holding', async () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('transfer-stock'))
    fireEvent.click(screen.getByTestId('stock-product-p1'))
    fireEvent.click(screen.getByTestId('transfer-from-h2'))
    fireEvent.click(screen.getByTestId('transfer-to-h1'))
    fireEvent.change(screen.getByTestId('transfer-barrels'), { target: { value: '99' } })
    fireEvent.click(screen.getByTestId('save-transfer'))

    expect(await screen.findByText(/only holds 2 barrels/)).toBeInTheDocument()
    expect(transfer).not.toHaveBeenCalled()
  })
})

describe('audit log', () => {
  it('names who made each change and describes it in words', async () => {
    logRows.current = [
      {
        id: 'l1',
        actorName: 'Ramindu',
        holderName: 'Kasun',
        productLabel: 'RSL Classic',
        action: 'allocate',
        barrelsDelta: 5,
        looseDelta: -2,
        occurredAt: '2026-08-04T10:00:00Z',
        note: 'handed over',
      },
    ]
    renderPanel()
    expect(await screen.findByText('Ramindu')).toBeInTheDocument()
    const log = screen.getByTestId('inventory-log')
    expect(
      within(log).getByText(/added 5 barrels and removed 2 loose shuttles/),
    ).toBeInTheDocument()
  })

  it('shows an empty state when nothing has been logged', async () => {
    renderPanel()
    expect(await screen.findByText('No changes logged yet.')).toBeInTheDocument()
  })
})
