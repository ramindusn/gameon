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
          {/* A section per brand rather than one wide table. Brands were
              columns, which grew the table sideways with every new shuttle the
              club buys and forced a dash into every cell for a brand someone
              had never held. Stacked, each section lists only the people who
              actually hold that brand, and the full name fits. */}
          <div className="space-y-3" data-testid="club-stock">
            {data.club.items.map((item) => (
              // Each brand in its own bordered box, the same shape the stock
              // rows use elsewhere. Stacked tables with only whitespace between
              // them read as one long table with headings in it.
              <section
                key={item.productId}
                data-testid={`club-brand-${item.productId}`}
                className="rounded-lg border border-line bg-surface-muted px-3 py-2"
              >
                <h3 className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-fg">{item.brand}</span>
                  <span className="text-sm text-fg-muted">{item.model}</span>
                </h3>
                <table className="mt-1 w-full text-sm">
                  <thead>
                    <tr className="text-fg-subtle">
                      <th className="w-full py-1 pr-3 text-left text-xs font-medium">Holder</th>
                      <th className="px-2 py-1">
                        <Icon name="barrel" className="ml-auto h-3.5 w-3.5" />
                      </th>
                      <th className="px-2 py-1">
                        <Icon name="shuttle" className="ml-auto h-3.5 w-3.5" />
                      </th>
                      <th className="py-1 pl-3 text-right text-xs font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.holders.map((h) => (
                      <tr
                        key={h.holderId}
                        className="border-t border-line"
                        data-testid={`club-holder-${item.productId}-${h.holderId}`}
                      >
                        <td className="py-1.5 pr-3 text-fg">{h.name}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-fg">
                          {h.barrels}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-fg">
                          {h.looseShuttles}
                        </td>
                        <td className="py-1.5 pl-3 text-right font-semibold tabular-nums text-fg">
                          {h.shuttles}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* The brand's own totals, in the same columns as the people
                      above so they read as a sum rather than a separate fact.
                      This lives here rather than in the heading because
                      barrels and loose only make sense under their icons. */}
                  <tfoot>
                    <tr
                      className="border-t-2 border-line"
                      data-testid={`club-brand-total-${item.productId}`}
                    >
                      <td className="py-1.5 pr-3 text-xs font-medium text-fg-subtle">Club</td>
                      <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-fg">
                        {item.barrels}
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-fg">
                        {item.looseShuttles}
                      </td>
                      <td className="py-1.5 pl-3 text-right font-semibold tabular-nums text-fg">
                        {item.shuttles}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </section>
            ))}
          </div>
          <p
            className="mt-4 border-t border-line pt-3 text-sm font-semibold text-fg"
            data-testid="club-stock-total"
          >
            {data.club.totalShuttles} shuttles across every matchmaker
          </p>
        </Card>
      )}
    </>
  )
}
