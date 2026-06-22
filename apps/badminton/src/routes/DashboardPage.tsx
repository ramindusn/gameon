import {
  euro,
  remainingFund,
  totalShuttlesInStock,
  totalShuttlesUsed,
} from '@gameon/domain'
import { AppShell } from '../app/AppShell'
import { StatCard } from '../app/StatCard'
import { useFund } from '../fund/useFund'
import { QuickAdd } from '../fund/QuickAdd'
import { TodayUsage } from '../fund/TodayUsage'
import { FundSummary } from '../fund/FundSummary'
import { Inventory } from '../fund/Inventory'
import { TransactionLog } from '../fund/TransactionLog'
import { MemberBalances } from '../fund/MemberBalances'

// Admin club-ops dashboard (REQUIREMENTS: Admin -> fund/shuttle/budget). Ports
// the prototype's fund/inventory dashboard into the Emerald Pro shell: KPIs +
// game-day usage, fund summary, inventory, transaction log and member balances,
// all add/edit/delete-capable. Data via @gameon/domain + TanStack Query (ADR 0006).
export function DashboardPage() {
  const { state, isLoading, isError } = useFund()
  const remaining = remainingFund(state)
  const shuttles = totalShuttlesInStock(state)

  return (
    <AppShell title="Dashboard">
      <div data-testid="dashboard">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fg-muted">Club operations overview</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent-strong">
              ● Editing enabled
            </span>
            <QuickAdd />
          </div>
        </div>

        {isLoading && <p className="text-sm text-fg-muted">Loading club data…</p>}
        {isError && (
          <p className="text-sm text-negative">
            Could not load club data. Sign in as an admin to manage the fund.
          </p>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon="💰"
            label="Remaining Fund"
            value={euro(remaining)}
            tone={remaining >= 0 ? 'accent' : 'negative'}
            testId="stat-remaining-fund"
          />
          <StatCard
            icon="📦"
            label="Total Shuttles"
            value={String(shuttles)}
            hint="in stock"
            tone={shuttles < 24 ? 'warning' : 'default'}
            testId="stat-total-shuttles"
          />
          <StatCard
            icon="🏸"
            label="Shuttles Used"
            value={String(totalShuttlesUsed(state))}
            hint="all game days"
            testId="stat-shuttles-used"
          />
          <StatCard
            icon="👥"
            label="Members"
            value={String(state.members.length)}
            testId="stat-members"
          />
        </div>

        {/* Today's usage paired with the compact fund summary */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TodayUsage />
          </div>
          <div className="lg:col-span-1">
            <FundSummary />
          </div>
        </div>

        {/* Wide tables get full width */}
        <div className="mt-6 space-y-6">
          <Inventory />
          <TransactionLog />
          <MemberBalances />
        </div>
      </div>
    </AppShell>
  )
}
