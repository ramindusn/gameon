import { Card, useConfirm } from '@gameon/ui'
import { Icon } from '../app/Icon'
import {
  euro,
  formatDate,
  formatDateTime,
  todayISO,
  usageForDate,
  usageHistory,
} from '@gameon/domain'
import { Pager, usePager } from '../app/Pager'
import { useAuth } from '../auth/useAuth'
import { useFund } from './useFund'

export function TodayUsage() {
  const { state, deleteTransaction } = useFund()
  const { role } = useAuth()
  const confirm = useConfirm()
  const isAuthenticated = role === 'admin'

  const today = todayISO()
  const todayTotals = usageForDate(state, today)
  // Newest first already (usageHistory sorts by date descending); this only
  // decides how many of them are on screen. It used to cut at 6 with no way to
  // reach the rest, so a club with a season behind it could not see July.
  const history = usageHistory(state)
  const historyPage = usePager(history, 8)
  const playedToday =
    todayTotals.totalCost > 0 || todayTotals.perProduct.some((p) => p.shuttlesUsed > 0)
  const lastDay = history[0]

  const focus = playedToday
    ? {
        today: true,
        label: `Today · ${formatDate(today)}`,
        costLabel: 'Cost today',
        totals: todayTotals,
      }
    : lastDay
      ? {
          today: false,
          label: `Last game day · ${formatDate(lastDay.date.slice(0, 10))}`,
          costLabel: 'Cost',
          totals: usageForDate(state, lastDay.date),
        }
      : null

  async function handleDeleteDay(day: { id: string; date: string; totalShuttles: number }) {
    const ok = await confirm({
      title: 'Delete game day',
      message: `Delete this game day (${formatDateTime(day.date)} — ${day.totalShuttles} shuttles)? This returns those shuttles to inventory and undoes the members' payment.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteTransaction({ kind: 'usage', id: day.id })
  }

  return (
    <Card title="Game-day Usage" icon={<Icon name="calendar" />}>
      {focus && (
        <div
          className={`rounded-lg p-4 ${focus.today ? 'bg-amber-500/10' : 'bg-surface-muted'}`}
        >
          <div
            className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
              focus.today ? 'text-amber-400' : 'text-fg-muted'
            }`}
          >
            {focus.label}
          </div>
          <ul className="divide-y divide-line">
            {focus.totals.perProduct.map(({ product, shuttlesUsed }) => (
              <li key={product.id} className="flex justify-between py-1.5 text-sm">
                <span className="text-fg-muted">
                  {product.brand} {product.model}
                </span>
                <strong className="text-fg">{shuttlesUsed} used</strong>
              </li>
            ))}
            {focus.totals.perProduct.length === 0 && (
              <li className="py-1.5 text-sm text-fg-muted">No products yet.</li>
            )}
          </ul>
          <div className="mt-2 border-t border-line pt-2 text-right text-base font-bold text-fg">
            {focus.costLabel}: {euro(focus.totals.totalCost)}
          </div>
        </div>
      )}

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-fg-muted">Recent game days</h3>
        {history.length === 0 ? (
          <p className="text-sm text-fg-subtle">
            No game days logged yet.
            {isAuthenticated
              ? ' Record one in the Game-day usage card above, against the day and the matchmaker whose barrels were used.'
              : ''}
          </p>
        ) : (
          <>
          <ul className="space-y-2" data-testid="usage-history">
            {historyPage.slice.map((day) => (
              <li
                key={day.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-fg">{formatDateTime(day.date)}</div>
                  <div className="break-words text-xs text-fg-subtle">
                    {day.parts
                      .filter((p) => p.shuttlesUsed > 0)
                      .map((p) => `${p.name}: ${p.shuttlesUsed}`)
                      .join(' · ') || 'no shuttles'}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold text-fg">
                    {day.totalShuttles} shuttles
                  </div>
                  <div className="text-xs text-fg-subtle">{euro(day.totalCost)}</div>
                </div>
                {isAuthenticated && (
                  <button
                    type="button"
                    aria-label="Delete game day"
                    onClick={() => void handleDeleteDay(day)}
                    className="ml-2 rounded p-1 text-fg-subtle transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
          <Pager
            page={historyPage.page}
            pageCount={historyPage.pageCount}
            start={historyPage.start}
            shown={historyPage.slice.length}
            total={historyPage.total}
            onPage={historyPage.setPage}
            testId="usage-history-pager"
          />
          </>
        )}
      </div>
    </Card>
  )
}
