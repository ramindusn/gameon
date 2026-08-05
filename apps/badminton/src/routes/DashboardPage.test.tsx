import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { emptyFundState } from '@gameon/domain'
import { ConfirmProvider } from '@gameon/ui'

// The dashboard's seven panels are grouped behind tabs (TASK-73); the KPI row
// stays put. Each panel has its own tests, so they are stubbed to markers here.
vi.mock('../fund/useFund', () => ({
  useFund: () => ({
    state: emptyFundState(),
    playerCount: 0,
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ role: 'admin', signOut: vi.fn() }),
}))
vi.mock('../fund/QuickAdd', () => ({ QuickAdd: () => <div data-testid="quick-add" /> }))
vi.mock('../fund/TodayUsage', () => ({ TodayUsage: () => <div data-testid="today-usage" /> }))
vi.mock('../fund/AdminGameDayUsage', () => ({
  AdminGameDayUsage: () => <div data-testid="admin-usage" />,
}))
vi.mock('../fund/FundSummary', () => ({ FundSummary: () => <div data-testid="fund-summary" /> }))
vi.mock('../fund/Inventory', () => ({ Inventory: () => <div data-testid="inventory" /> }))
vi.mock('../fund/StockPanel', () => ({ StockPanel: () => <div data-testid="stock-panel" /> }))
vi.mock('../fund/TransactionLog', () => ({
  TransactionLog: () => <div data-testid="tx-log" />,
}))
vi.mock('../fund/MemberBalances', () => ({
  MemberBalances: () => <div data-testid="balances" />,
}))

import { DashboardPage } from './DashboardPage'

function renderDash() {
  return render(
    <MemoryRouter>
      <ConfirmProvider>
        <DashboardPage />
      </ConfirmProvider>
    </MemoryRouter>,
  )
}

describe('DashboardPage tabs (TASK-73)', () => {
  it('keeps the KPI row on screen whichever tab is open', () => {
    renderDash()
    expect(screen.getByTestId('stat-remaining-fund')).toBeInTheDocument()
    expect(screen.getByTestId('stat-total-shuttles')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('dash-tab-money'))
    expect(screen.getByTestId('stat-remaining-fund')).toBeInTheDocument()
  })

  it('opens on game days — the recurring job', () => {
    renderDash()
    expect(screen.getByTestId('admin-usage')).toBeInTheDocument()
    expect(screen.getByTestId('today-usage')).toBeInTheDocument()
    // Everything else is out of the way.
    expect(screen.queryByTestId('inventory')).toBeNull()
    expect(screen.queryByTestId('tx-log')).toBeNull()
  })

  it('shows the stock panels under Stock, and nothing else', () => {
    renderDash()
    fireEvent.click(screen.getByTestId('dash-tab-stock'))
    expect(screen.getByTestId('stock-panel')).toBeInTheDocument()
    expect(screen.getByTestId('inventory')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-usage')).toBeNull()
    expect(screen.queryByTestId('balances')).toBeNull()
  })

  it('shows the money panels under Money, and nothing else', () => {
    renderDash()
    fireEvent.click(screen.getByTestId('dash-tab-money'))
    expect(screen.getByTestId('fund-summary')).toBeInTheDocument()
    expect(screen.getByTestId('tx-log')).toBeInTheDocument()
    expect(screen.getByTestId('balances')).toBeInTheDocument()
    expect(screen.queryByTestId('stock-panel')).toBeNull()
  })
})
