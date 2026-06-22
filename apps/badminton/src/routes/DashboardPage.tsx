import { Card } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { StatCard } from '../app/StatCard'

// Admin club-ops dashboard (REQUIREMENTS: Admin -> fund/shuttle/budget). The
// shell + layout land here (TASK-7.5); live fund/inventory data is wired in E06
// (TASK-7.1 math, 7.2 schema, 7.3 UI), replacing the placeholders below.
export function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <div data-testid="dashboard">
        <p className="mb-6 text-sm text-fg-muted">Club operations overview</p>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon="💰"
            label="Remaining Fund"
            value="—"
            tone="accent"
            testId="stat-remaining-fund"
          />
          <StatCard
            icon="📦"
            label="Total Shuttles"
            value="—"
            hint="in stock"
            testId="stat-total-shuttles"
          />
          <StatCard icon="🛡️" label="Admins" value="—" testId="stat-admins" />
          <StatCard
            icon="👥"
            label="Players"
            value="—"
            hint="incl. admins"
            testId="stat-players"
          />
        </div>

        <div id="fund" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card title="Today's usage" icon="🏸">
              <p className="text-sm text-fg-muted">
                Game-day shuttle usage will appear here once fund tracking is live (E06).
              </p>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card title="Fund summary" icon="💰">
              <p className="text-sm text-fg-muted">
                Contributions, spend and balance — coming in E06.
              </p>
            </Card>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <Card title="Inventory" icon="📦">
            <p className="text-sm text-fg-muted">
              Shuttle products and stock — coming in E06.
            </p>
          </Card>
          <Card title="Transactions" icon="🧾">
            <p className="text-sm text-fg-muted">
              Contributions, purchases and expenses — coming in E06.
            </p>
          </Card>
          <Card title="Member balances" icon="⚖️">
            <p className="text-sm text-fg-muted">
              Per-member fund share — coming in E06.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
