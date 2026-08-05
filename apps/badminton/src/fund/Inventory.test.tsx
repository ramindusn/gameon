import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConfirmProvider } from '@gameon/ui'
import { LOW_STOCK_THRESHOLD, type FundState, type Product, type Purchase } from '@gameon/domain'

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
  it('shows remaining unopened barrels and loose shuttles separately, plus the derived total', () => {
    const p: Product = {
      id: 'p1',
      brand: 'Yonex',
      model: 'AS-30',
      shuttlesPerBarrel: 12,
      barrels: 3,
      looseShuttles: 5,
    }
    // A historical purchase batch of 10 barrels — distinct from the 3 unopened
    // barrels currently remaining.
    const batch: Purchase = {
      id: 'pu1',
      productId: 'p1',
      barrels: 10,
      pricePerBarrel: 24,
      date: '2026-01-01T10:00',
    }
    renderInv(makeState([p], [batch]))

    expect(screen.getByTestId('barrels-left-p1')).toHaveTextContent('3')
    expect(screen.getByTestId('loose-left-p1')).toHaveTextContent('5')
    // Total is derived: 3 barrels * 12 + 5 loose = 41.
    expect(screen.getByTestId('total-shuttles-p1')).toHaveTextContent('41')
  })

  it('renders a clean zero state (0 barrels, 0 loose → total 0)', () => {
    const p: Product = {
      id: 'p2',
      brand: 'Li-Ning',
      model: 'A+62',
      shuttlesPerBarrel: 12,
      barrels: 0,
      looseShuttles: 0,
    }
    renderInv(makeState([p]))

    expect(screen.getByTestId('barrels-left-p2')).toHaveTextContent('0')
    expect(screen.getByTestId('loose-left-p2')).toHaveTextContent('0')
    expect(screen.getByTestId('total-shuttles-p2')).toHaveTextContent('0')
  })

  it('flags low stock off the derived total, not the barrel count', () => {
    // 1 unopened barrel * 12 + 0 loose = 12 shuttles, under the threshold.
    const p: Product = {
      id: 'p3',
      brand: 'RSL',
      model: 'No.3',
      shuttlesPerBarrel: 12,
      barrels: 1,
      looseShuttles: 0,
    }
    renderInv(makeState([p]))

    expect(12).toBeLessThan(LOW_STOCK_THRESHOLD)
    expect(screen.getByTestId('barrels-left-p3')).toHaveTextContent('1')
    // Shown in both the mobile card and the desktop table.
    expect(screen.getAllByText('Low stock').length).toBeGreaterThan(0)
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
