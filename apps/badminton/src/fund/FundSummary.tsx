import { Card } from '@gameon/ui'
import { Icon } from '../app/Icon'
import {
  euro,
  remainingFund,
  totalCollected,
  totalSpent,
  totalUsageIncome,
} from '@gameon/domain'
import { useFund } from './useFund'

export function FundSummary() {
  const { state } = useFund()
  const cash = totalCollected(state)
  const usage = totalUsageIncome(state)
  const spent = totalSpent(state)
  const moneyIn = cash + usage
  const remaining = remainingFund(state)
  const utilized = moneyIn > 0 ? Math.min(100, Math.round((spent / moneyIn) * 100)) : 0

  return (
    <Card title="Fund Summary" icon={<Icon name="money" />}>
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-fg-muted">
          <span>Budget utilized</span>
          <span className="tabular-nums text-fg">{utilized}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${utilized}%` }}
          />
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
          <Row label="Stock & expenses" value={`− ${euro(spent)}`} negative />
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

      <p className="mt-4 text-xs text-fg-subtle">
        Use <span className="font-medium">+ Add transaction</span> in the header to log
        cash, expenses or game-day usage.
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
