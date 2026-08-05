import { Card } from '@gameon/ui'
import { Icon } from '../app/Icon'
import {
  costPerGameDay,
  euro,
  gameDaysRecorded,
  remainingFund,
  shuttlesPerGameDay,
  totalCollected,
  totalExpenses,
  totalPurchases,
  totalSpent,
  totalUsageIncome,
} from '@gameon/domain'
import { useFund } from './useFund'

export function FundSummary() {
  const { state } = useFund()
  const cash = totalCollected(state)
  const usage = totalUsageIncome(state)
  const purchases = totalPurchases(state)
  const expenses = totalExpenses(state)
  const spent = totalSpent(state)
  const moneyIn = cash + usage
  const remaining = remainingFund(state)
  const days = gameDaysRecorded(state)
  const perDay = costPerGameDay(state)
  const shuttlesADay = shuttlesPerGameDay(state)
  const daysLeft = perDay > 0 ? Math.floor(Math.max(remaining, 0) / perDay) : 0

  return (
    <Card title="Fund Summary" icon={<Icon name="money" />}>
      {/* This used to lead with a "budget utilized" bar — spent over money in.
          It is a ratio nobody acts on, and the remaining figure below it
          already appears as a KPI card above the tabs. What an admin actually
          needs is what a game day costs, and how many more the fund covers. */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-line bg-surface-muted px-3 py-2">
          <div className="text-xs font-medium text-fg-muted">Cost per game day</div>
          <div className="font-display text-lg font-bold text-fg" data-testid="cost-per-day">
            {days === 0 ? '—' : euro(perDay)}
          </div>
          <div className="text-xs text-fg-subtle">
            {days === 0
              ? 'No game days recorded yet'
              : `${shuttlesADay.toFixed(1)} shuttles · ${days} day${days === 1 ? '' : 's'}`}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-surface-muted px-3 py-2">
          <div className="text-xs font-medium text-fg-muted">Game days covered</div>
          <div className="font-display text-lg font-bold text-fg" data-testid="days-covered">
            {perDay > 0 && remaining > 0 ? daysLeft : '—'}
          </div>
          <div className="text-xs text-fg-subtle">
            {perDay <= 0
              ? 'Record usage to project this'
              : remaining > 0
                ? 'at the current rate'
                : 'fund is in the red'}
          </div>
        </div>
      </div>

      <div className="space-y-4 text-sm">
        <section>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Money in
          </div>
          <Row label="Member cash" value={`+ ${euro(cash)}`} positive />
          <Row
            label="Game-day usage payments"
            value={`+ ${euro(usage)}`}
            positive
            faded={usage === 0}
          />
          <Subtotal label="Total in" value={`+ ${euro(moneyIn)}`} positive />
        </section>

        <section>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-500">
            Money out
          </div>
          {/* Shuttles and everything else were one "Stock & expenses" line, so
              a 16.67 € expense sat invisible inside a 768.50 € figure and read
              as though it had not been counted at all. */}
          <Row label="Shuttles bought" value={`− ${euro(purchases)}`} negative />
          <Row
            label="Other expenses"
            value={`− ${euro(expenses)}`}
            negative
            faded={expenses === 0}
          />
          <Subtotal label="Total out" value={`− ${euro(spent)}`} negative />
        </section>

        <div className="flex items-baseline justify-between border-t-2 border-dashed border-line pt-3 text-base font-bold text-fg">
          <span>Remaining fund</span>
          <span
            data-testid="fund-remaining"
            className={remaining >= 0 ? 'text-emerald-500' : 'text-red-500'}
          >
            {euro(remaining)}
          </span>
        </div>
      </div>

      {/* Game-day usage left this flow with TASK-73 — QuickAdd offers cash and
          expenses only, and usage belongs to a game day now. */}
      <p className="mt-4 text-xs text-fg-subtle">
        Use <span className="font-medium">+ Add transaction</span> in the header to log
        cash or expenses. Shuttle usage is recorded under{' '}
        <span className="font-medium">Game days</span>.
      </p>
    </Card>
  )
}

function Row({
  label,
  value,
  positive,
  negative,
  faded,
}: {
  label: string
  value: string
  positive?: boolean
  negative?: boolean
  faded?: boolean
}) {
  const color = faded
    ? 'text-fg-subtle'
    : positive
      ? 'text-emerald-500'
      : negative
        ? 'text-red-500'
        : 'text-fg'
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-fg-muted">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  )
}

function Subtotal({
  label,
  value,
  positive,
  negative,
}: {
  label: string
  value: string
  positive?: boolean
  negative?: boolean
}) {
  const color = positive ? 'text-emerald-500' : negative ? 'text-red-500' : 'text-fg'
  return (
    <div className="mt-1 flex justify-between border-t border-line pt-1 text-xs font-semibold uppercase tracking-wide">
      <span className="text-fg-muted">{label}</span>
      <span className={color}>{value}</span>
    </div>
  )
}
