import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConfirmProvider } from '@gameon/ui'
import type { FundState, Product, Purchase } from '@gameon/domain'

// Inventory reads its data through useFund and gates edit controls on the admin
// role; both are stubbed so the test drives the pure rendering.
const { fundState, addProduct } = vi.hoisted(() => ({
  fundState: { current: null as FundState | null },
  addProduct: vi.fn(),
}))

vi.mock('./useFund', () => ({
  useFund: () => ({
    state: fundState.current,
    addProduct,
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
  }),
}))
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: 'admin', signOut: vi.fn() }),
}))

import { Inventory } from './Inventory'

const makeState = (products: Product[], purchases: Purchase[] = []): FundState => ({
  members: [],
  products,
  purchases,
  usage: [],
  expenses: [],
  holders: [],
  holdings: [],
})

function renderInv(state: FundState) {
  fundState.current = state
  return render(
    <ConfirmProvider>
      <Inventory />
    </ConfirmProvider>,
  )
}

describe('Inventory (TASK-34)', () => {
  // Remaining barrels / loose / total and the low-stock flag moved to
  // StockPanel with TASK-76.3 — they were rendered in both panels on the same
  // tab. This panel now covers products, batches and prices only.
  it('shows what a batch cost, and leaves remaining stock to StockPanel', () => {
    const p: Product = {
      id: 'p1',
      brand: 'Yonex',
      model: 'AS-30',
      shuttlesPerBarrel: 12,
    }
    const batch: Purchase = {
      id: 'pu1',
      productId: 'p1',
      barrels: 10,
      pricePerBarrel: 24,
      date: '2026-01-01T10:00',
    }
    renderInv(makeState([p], [batch]))

    expect(screen.getAllByText('Yonex').length).toBeGreaterThan(0)
    // 24 € a barrel over 12 shuttles is 2 € each — the number this panel is for.
    expect(screen.getAllByText('2.00 €').length).toBeGreaterThan(0)
    // Remaining stock belongs to the other panel now.
    expect(screen.queryByTestId('barrels-left-p1')).toBeNull()
    expect(screen.queryByTestId('total-shuttles-p1')).toBeNull()
  })
})

describe('adding stock (TASK-69)', () => {
  const holder = { id: 'h1', name: 'Ramboo' }

  function openAddForm() {
    renderInv({ ...makeState([]), holders: [holder] })
    fireEvent.click(screen.getByTestId('add-product-button'))
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'RSL' } })
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'Classic' } })
    fireEvent.change(screen.getByTestId('add-barrels'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Price per barrel (€)'), {
      target: { value: '27.5' },
    })
  }

  it('will not add stock without naming the matchmaker who keeps it', async () => {
    addProduct.mockClear()
    openAddForm()
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }))

    expect(
      await screen.findByText('Choose the matchmaker who will keep this stock.'),
    ).toBeInTheDocument()
    expect(addProduct).not.toHaveBeenCalled()
  })

  it('keeps the form open and reports it when the allocation fails', async () => {
    addProduct.mockClear()
    addProduct.mockRejectedValueOnce(new Error('network'))
    openAddForm()
    fireEvent.change(screen.getByTestId('add-holder'), { target: { value: 'h1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }))

    // Nothing is half-saved: the product is rolled back, so the admin is told
    // rather than left with unallocated stock.
    expect(
      await screen.findByText('Could not allocate the stock, so nothing was added. Try again.'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('add-holder')).toBeInTheDocument()
  })

  it('allocates the new stock to the chosen matchmaker, loose shuttles included', async () => {
    addProduct.mockClear()
    openAddForm()
    fireEvent.change(screen.getByTestId('add-loose'), { target: { value: '8' } })
    fireEvent.change(screen.getByTestId('add-holder'), { target: { value: 'h1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }))

    await waitFor(() => expect(addProduct).toHaveBeenCalledTimes(1))
    expect(addProduct).toHaveBeenCalledWith(
      expect.objectContaining({ brand: 'RSL', barrels: 2, looseShuttles: 8 }),
      holder,
    )
  })
})
