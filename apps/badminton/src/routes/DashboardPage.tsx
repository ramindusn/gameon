import { Card } from '@gameon/ui'
import {
  euro,
  isLowStock,
  memberBalances,
  productShuttleCount,
  remainingFund,
  totalShuttlesInStock,
} from '@gameon/domain'
import { AppShell } from '../app/AppShell'
import { StatCard } from '../app/StatCard'
import { QuickAdd } from '../fund/QuickAdd'
import { useFund } from '../fund/useFund'

// Admin club-ops dashboard (REQUIREMENTS: Admin -> fund/shuttle/budget). KPIs and
// tables compute from live fund data via @gameon/domain. Add/edit polish + the
// richer Stitch layout continue under TASK-7.3.
export function DashboardPage() {
  const { data, isLoading, isError } = useFund()
  const fund = data?.state

  return (
    <AppShell title="Dashboard">
      <div data-testid="dashboard">
        <p className="mb-6 text-sm text-fg-muted">Club operations overview</p>

        {isLoading && <p className="text-sm text-fg-muted">Loading club data…</p>}
        {isError && <p className="text-sm text-negative">Could not load club data.</p>}
        {!isLoading && !data && (
          <p className="text-sm text-fg-muted">No club found for this account.</p>
        )}

        {fund && data && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                icon="💰"
                label="Remaining Fund"
                value={euro(remainingFund(fund))}
                tone={remainingFund(fund) >= 0 ? 'accent' : 'negative'}
                testId="stat-remaining-fund"
              />
              <StatCard
                icon="📦"
                label="Total Shuttles"
                value={String(totalShuttlesInStock(fund))}
                hint="in stock"
                tone={totalShuttlesInStock(fund) < 24 ? 'warning' : 'default'}
                testId="stat-total-shuttles"
              />
              <StatCard
                icon="🏸"
                label="Products"
                value={String(fund.products.length)}
                testId="stat-products"
              />
              <StatCard
                icon="👥"
                label="Members"
                value={String(fund.members.length)}
                testId="stat-members"
              />
            </div>

            <div className="mb-6">
              <QuickAdd clubId={data.clubId} state={fund} />
            </div>

            <div className="space-y-6">
              <Card title="Inventory" icon="📦">
                {fund.products.length === 0 ? (
                  <p className="text-sm text-fg-muted">No products yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-fg-muted">
                      <tr>
                        <th className="py-1">Product</th>
                        <th className="py-1">In stock</th>
                        <th className="py-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fund.products.map((p) => (
                        <tr key={p.id} className="border-t border-line">
                          <td className="py-1.5">
                            {p.brand} {p.model}
                          </td>
                          <td className="py-1.5">{productShuttleCount(p)}</td>
                          <td className="py-1.5">
                            {isLowStock(p) ? (
                              <span className="text-warning">Low</span>
                            ) : (
                              <span className="text-fg-muted">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              <Card title="Member balances" icon="⚖️">
                {fund.members.length === 0 ? (
                  <p className="text-sm text-fg-muted">No members yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-fg-muted">
                      <tr>
                        <th className="py-1">Member</th>
                        <th className="py-1">Contributed</th>
                        <th className="py-1">Share spent</th>
                        <th className="py-1">Left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberBalances(fund).map((b) => (
                        <tr key={b.id} className="border-t border-line">
                          <td className="py-1.5">{b.name}</td>
                          <td className="py-1.5">{euro(b.starting)}</td>
                          <td className="py-1.5">{euro(b.spent)}</td>
                          <td className="py-1.5">{euro(b.left)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              <Card title="Activity" icon="🧾">
                <p className="text-sm text-fg-muted">
                  {fund.members.reduce((n, mem) => n + mem.contributions.length, 0)}{' '}
                  contributions · {fund.purchases.length} purchases ·{' '}
                  {fund.expenses.length} expenses · {fund.usage.length} game days logged
                </p>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
