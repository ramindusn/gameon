import { useQuery } from '@tanstack/react-query'
import { Card } from '@gameon/ui'
import { Icon } from '../app/Icon'
import { loadMyStock } from './api'

/**
 * A brand and its two counts: unopened barrels, and loose shuttles.
 *
 * The number sits immediately left of its own icon, and the pair is
 * right-aligned inside a fixed-width box. That keeps the count glued to the
 * icon it belongs to while still landing every icon on the same x down the
 * card — the two used to fight each other, because right-aligning the number
 * in its own column pushed a single digit away from its icon and left a gap
 * wide enough that you could not tell which count was which.
 */
function Counts({ barrels, looseShuttles }: { barrels: number; looseShuttles: number }) {
  return (
    <div className="flex shrink-0 items-center gap-4 whitespace-nowrap text-sm">
      <span
        className="inline-flex min-w-[3rem] items-center justify-end gap-1"
        title="Unopened barrels"
      >
        <b className="tabular-nums text-fg">{barrels}</b>
        <Icon name="barrel" className="h-[18px] w-[18px] text-fg-subtle" />
      </span>
      <span
        className="inline-flex min-w-[3rem] items-center justify-end gap-1"
        title="Loose shuttles"
      >
        <b className="tabular-nums text-fg">{looseShuttles}</b>
        <Icon name="shuttle" className="h-[18px] w-[18px] text-fg-subtle" />
      </span>
    </div>
  )
}

/**
 * Says which glyph is which, once per card, instead of repeating the words on
 * every row. The counts carry title attributes too, but a phone has no hover to
 * show them — this is the version that works on the device the card is read on.
 */
function Legend({ testId }: { testId: string }) {
  return (
    <p
      className="mb-2 flex items-center gap-4 text-xs text-fg-subtle"
      data-testid={testId}
    >
      <span className="inline-flex items-center gap-1">
        <Icon name="barrel" className="h-3.5 w-3.5" />
        barrels
      </span>
      <span className="inline-flex items-center gap-1">
        <Icon name="shuttle" className="h-3.5 w-3.5" />
        loose shuttles
      </span>
    </p>
  )
}

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
      {/* The name keeps its own column and the counts a fixed one, so a long
          model wraps inside its half instead of shoving the figures around. */}
      <div className="min-w-0">
        <span className="font-semibold text-fg">{brand}</span>{' '}
        <span className="text-sm text-fg-muted">{model}</span>
      </div>
      <Counts barrels={barrels} looseShuttles={looseShuttles} />
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
            <Legend testId="my-stock-legend" />
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
          <Legend testId="club-stock-legend" />
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
