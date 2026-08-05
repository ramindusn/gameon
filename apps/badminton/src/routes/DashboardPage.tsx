import { useState } from 'react'
import {
  euro,
  remainingFund,
  totalShuttlesInStock,
  totalShuttlesUsed,
} from '@gameon/domain'
import { cx, SkeletonCard } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { Icon, type IconName } from '../app/Icon'
import { StatCard, DualStatCard } from '../app/StatCard'
import { useFund } from '../fund/useFund'
import { QuickAdd } from '../fund/QuickAdd'
import { TodayUsage } from '../fund/TodayUsage'
import { AdminGameDayUsage } from '../fund/AdminGameDayUsage'
import { FundSummary } from '../fund/FundSummary'
import { Inventory } from '../fund/Inventory'
import { StockPanel } from '../fund/StockPanel'
import { TransactionLog } from '../fund/TransactionLog'
import { MemberBalances } from '../fund/MemberBalances'

// Admin club-ops dashboard (REQUIREMENTS: Admin -> fund/shuttle/budget). Ports
// the prototype's fund/inventory dashboard into the Emerald Pro shell: KPIs +
// game-day usage, fund summary, inventory, transaction log and member balances,
// all add/edit/delete-capable. Data via @gameon/domain + TanStack Query (ADR 0006).
type DashTab = 'gamedays' | 'stock' | 'money'

const DASH_TABS: { id: DashTab; label: string; icon: IconName }[] = [
  { id: 'gamedays', label: 'Game days', icon: 'calendar' },
  { id: 'stock', label: 'Stock', icon: 'inventory' },
  { id: 'money', label: 'Money', icon: 'money' },
]

export function DashboardPage() {
  const { state, playerCount, isLoading, isError } = useFund()
  // Game days lead: recording the day's shuttles is the recurring job, and the
  // KPI row above already answers "how is the fund doing?" at a glance.
  const [tab, setTab] = useState<DashTab>('gamedays')
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
          {/* "Members" are the people who put money into the fund — they carry
              the contributions the balances are split across. This used to be
              labelled "Admins", which counted something else entirely. */}
          <DualStatCard
            icon={<Icon name="players" />}
            rows={[
              { label: 'Fund members', value: String(state.members.length) },
              { label: 'Players', value: String(playerCount) },
            ]}
            testId="stat-people"
          />
        </div>

        {/* Seven panels at once read as clutter, so the KPIs above stay put and
            the rest is grouped behind tabs — one job at a time (TASK-73). */}
        <DashboardTabs active={tab} onChange={setTab} />

        <div className="mt-6 space-y-6">
          {tab === 'gamedays' && (
            <>
              <AdminGameDayUsage />
              <TodayUsage />
            </>
          )}
          {tab === 'stock' && (
            <>
              <StockPanel />
              <Inventory />
            </>
          )}
          {tab === 'money' && (
            <>
              <FundSummary />
              <TransactionLog />
              <MemberBalances />
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

/** Groups the dashboard's panels so only one area is on screen at a time. */
function DashboardTabs({
  active,
  onChange,
}: {
  active: DashTab
  onChange: (t: DashTab) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Dashboard sections"
      className="flex items-center gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1 text-sm"
    >
      {DASH_TABS.map((t) => {
        const on = active === t.id
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            data-testid={`dash-tab-${t.id}`}
            className={cx(
              'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 font-medium transition-colors',
              on
                ? 'bg-accent text-neutral-950'
                : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
            )}
          >
            <Icon name={t.icon} className="h-4 w-4" />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
