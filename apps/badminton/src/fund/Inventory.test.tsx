import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfirmProvider } from '@gameon/ui'
import { LOW_STOCK_THRESHOLD, type FundState, type Product, type Purchase } from '@gameon/domain'

// Inventory reads its data through useFund and gates edit controls on the admin
// role; both are stubbed so the test drives the pure rendering.
const { fundState } = vi.hoisted(() => ({ fundState: { current: null as FundState | null } }))

vi.mock('./useFund', () => ({
  useFund: () => ({
    state: fundState.current,
    addProduct: vi.fn(),
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
