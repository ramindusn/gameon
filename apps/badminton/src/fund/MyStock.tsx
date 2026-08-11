import { Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@gameon/ui'
import { Icon } from '../app/Icon'
import { loadMyStock } from './api'
import { StockCounts, StockLegend } from './StockCounts'

function StockRow({
  brand,
  model,
  barrels,
  looseShuttles,
  testId,
}: {
  brand: string
  model: string
  barrels: number
  looseShuttles: number
  testId: string
}) {
  return (
    <li
      data-testid={testId}
      className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2"
    >
      {/* One line, ellipsised. Left to wrap, a long model ("Aerosensa 30
          Tournament Grade") takes two or three lines at phone width and the
          rows go ragged — the full name is on the title for anyone who wants
          it, and the brand, which is what people scan for, never truncates. */}
      <div className="min-w-0 flex-1 truncate" title={`${brand} ${model}`}>
        <span className="font-semibold text-fg">{brand}</span>{' '}
        <span className="text-sm text-fg-muted">{model}</span>
      </div>
      <StockCounts barrels={barrels} looseShuttles={looseShuttles} />
    </li>
  )
}

/**
 * The stock in the signed-in matchmaker's own hands (TASK-69), and — when
 * anyone else is holding some — the club's, as a card of its own.
 *
 * Read-only by design: allocation, transfers and corrections are an admin job,
 * so these views have no controls.
 *
 * Someone who is not a matchmaker gets nothing (loadMyStock returns null) — the
 * cards would be meaningless. A matchmaker holding nothing does get the first
 * card, saying so: it used to vanish, which left them with no explanation for
 * the "Nobody is holding stock" they then meet in the usage form (TASK-76.2).
 */
export function MyStock() {
  const { data } = useQuery({ queryKey: ['my-stock'], queryFn: loadMyStock })
  if (!data) return null

  return (
    <>
      <Card
        title={`Shuttles in ${data.holderName}'s hands`}
        icon={<Icon name="inventory" />}
      >
        {data.items.length === 0 ? (
          <>
            <p className="text-sm text-fg-muted" data-testid="my-stock-empty">
              You are not holding any shuttles right now, so you cannot record
              usage against your own stock yet.
            </p>
            <p className="mt-1 text-xs text-fg-subtle">
              An admin allocates barrels to a matchmaker. Ask them to hand you
              some.
            </p>
          </>
        ) : (
          <>
            <StockLegend testId="my-stock-legend" />
            <ul className="space-y-2" data-testid="my-stock">
              {data.items.map((i) => (
                <StockRow
                  key={i.productId}
                  testId={`my-stock-${i.productId}`}
                  brand={i.brand}
                  model={i.model}
                  barrels={i.barrels}
                  looseShuttles={i.looseShuttles}
                />
              ))}
            </ul>
            <p
              className="mt-3 text-sm font-semibold text-fg"
              data-testid="my-stock-total"
            >
              {data.totalShuttles} shuttles
            </p>
          </>
        )}
      </Card>

      {/* Only when somebody else holds some. Holding all of it yourself, this
          card would repeat the one above line for line. */}
      {data.club && (
        <Card title="Club stocks" icon={<Icon name="inventory" />}>
          <StockLegend testId="club-stock-legend" />
          {/* Who holds what, as a table: people down, brands across. The card
              used to total each brand club-wide, which said how much there was
              but never who had it — the question a matchmaker actually asks
              before a game day.

              It scrolls inside its own box rather than widening the card,
              because the columns grow with the number of brands. */}
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-max text-sm" data-testid="club-stock">
              <thead>
                <tr className="text-fg-subtle">
                  <th className="py-1 pr-3 text-left font-medium">Holder</th>
                  {data.club.items.map((i) => (
                    <th
                      key={i.productId}
                      colSpan={2}
                      className="px-1.5 pb-0.5 text-center text-xs font-medium"
                      title={`${i.brand} ${i.model}`}
                    >
                      {i.brand}
                    </th>
                  ))}
                  <th className="py-1 pl-3 text-right text-xs font-medium">Total</th>
                </tr>
                <tr className="text-fg-subtle">
                  <th />
                  {data.club.items.map((i) => (
                    <Fragment key={i.productId}>
                      <th className="pb-1 pl-1.5 text-right font-normal">
                        <Icon name="barrel" className="ml-auto h-3.5 w-3.5" />
                      </th>
                      <th className="pb-1 pr-1.5 text-right font-normal">
                        <Icon name="shuttle" className="ml-auto h-3.5 w-3.5" />
                      </th>
                    </Fragment>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.club.holders.map((h) => (
                  <tr
                    key={h.holderId}
                    className="border-t border-line"
                    data-testid={`club-holder-${h.holderId}`}
                  >
                    <td className="py-1.5 pr-3 font-medium text-fg">{h.name}</td>
                    {data.club!.items.map((i) => {
                      const cell = h.cells[i.productId]
                      return (
                        <Fragment key={i.productId}>
                          <td className="py-1.5 pl-1.5 text-right tabular-nums text-fg">
                            {cell ? cell.barrels : <span className="text-fg-subtle">–</span>}
                          </td>
                          <td className="py-1.5 pr-1.5 text-right tabular-nums text-fg">
                            {cell ? cell.looseShuttles : <span className="text-fg-subtle">–</span>}
                          </td>
                        </Fragment>
                      )
                    })}
                    <td className="py-1.5 pl-3 text-right font-semibold tabular-nums text-fg">
                      {h.totalShuttles}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            className="mt-3 text-sm font-semibold text-fg"
            data-testid="club-stock-total"
          >
            {data.club.totalShuttles} shuttles across every matchmaker
          </p>
        </Card>
      )}
    </>
  )
}
