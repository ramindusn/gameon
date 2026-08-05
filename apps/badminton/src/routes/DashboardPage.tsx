import {
  euro,
  remainingFund,
  totalShuttlesInStock,
  totalShuttlesUsed,
} from '@gameon/domain'
import { SkeletonCard } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { Icon } from '../app/Icon'
import { StatCard, DualStatCard } from '../app/StatCard'
import { useFund } from '../fund/useFund'
import { QuickAdd } from '../fund/QuickAdd'
import { TodayUsage } from '../fund/TodayUsage'
import { FundSummary } from '../fund/FundSummary'
import { Inventory } from '../fund/Inventory'
import { StockPanel } from '../fund/StockPanel'
import { TransactionLog } from '../fund/TransactionLog'
import { MemberBalances } from '../fund/MemberBalances'

// Admin club-ops dashboard (REQUIREMENTS: Admin -> fund/shuttle/budget). Ports
// the prototype's fund/inventory dashboard into the Emerald Pro shell: KPIs +
// game-day usage, fund summary, inventory, transaction log and member balances,
// all add/edit/delete-capable. Data via @gameon/domain + TanStack Query (ADR 0006).
export function DashboardPage() {
  const { state, playerCount, isLoading, isError } = useFund()
  const remaining = remainingFund(state)
  const shuttles = totalShuttlesInStock(state)

  return (
    <AppShell
      title="Dashboard"
      actions={
        <>
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent-strong">
            ● Editing enabled
          </span>
          <QuickAdd />
        </>
      }
    >
      <div data-testid="dashboard">
        {isLoading && <SkeletonCard rows={4} />}
        {isError && (
          <p className="text-sm text-negative">
            Could not load club data. Sign in as an admin to manage the fund.
          </p>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<Icon name="money" />}
            label="Remaining Fund"
            value={euro(remaining)}
            tone={remaining >= 0 ? 'accent' : 'negative'}
            testId="stat-remaining-fund"
          />
          <StatCard
            icon={<Icon name="inventory" />}
            label="Total Shuttles"
            value={String(shuttles)}
            hint="in stock"
            tone={shuttles < 24 ? 'warning' : 'default'}
            testId="stat-total-shuttles"
          />
          <StatCard
            icon={<Icon name="shuttle" />}
            label="Shuttles Used"
            value={String(totalShuttlesUsed(state))}
            hint="all game days"
            testId="stat-shuttles-used"
          />
          <DualStatCard
            icon={<Icon name="players" />}
            rows={[
              { label: 'Admins', value: String(state.members.length) },
              { label: 'Players', value: String(playerCount) },
            ]}
            testId="stat-people"
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
          <StockPanel />
          <Inventory />
          <TransactionLog />
          <MemberBalances />
        </div>
      </div>
    </AppShell>
  )
}
