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
          <ul className="space-y-2" data-testid="club-stock">
            {data.club.items.map((i) => (
              <StockRow
                key={i.productId}
                testId={`club-stock-${i.productId}`}
                brand={i.brand}
                model={i.model}
                barrels={i.barrels}
                looseShuttles={i.looseShuttles}
              />
            ))}
          </ul>
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
