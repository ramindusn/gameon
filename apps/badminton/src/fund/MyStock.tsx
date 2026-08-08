import { useQuery } from '@tanstack/react-query'
import { Card } from '@gameon/ui'
import { Icon } from '../app/Icon'
import { loadMyStock } from './api'

/**
 * The stock in the signed-in matchmaker's own hands (TASK-69). Read-only by
 * design: allocation, transfers and corrections are an admin job, so this view
 * has no controls.
 *
 * Someone who is not a matchmaker gets nothing (loadMyStock returns null) — the
 * card would be meaningless. A matchmaker holding nothing does get the card,
 * saying so: it used to vanish, which left them with no explanation for the
 * "Nobody is holding stock" they then meet in the usage form (TASK-76.2).
 */
export function MyStock() {
  const { data } = useQuery({ queryKey: ['my-stock'], queryFn: loadMyStock })
  if (!data) return null

  if (data.items.length === 0) {
    return (
      <Card
        title={`Shuttles in ${data.holderName}'s hands`}
        icon={<Icon name="inventory" />}
      >
        <p className="text-sm text-fg-muted" data-testid="my-stock-empty">
          You are not holding any shuttles right now, so you cannot record usage
          against your own stock yet.
        </p>
        <p className="mt-1 text-xs text-fg-subtle">
          An admin allocates barrels to a matchmaker. Ask them to hand you some.
        </p>
      </Card>
    )
  }

  return (
    <Card
      title={`Shuttles in ${data.holderName}'s hands`}
      icon={<Icon name="inventory" />}
    >
      <ul className="space-y-2" data-testid="my-stock">
        {data.items.map((i) => (
          <li
            key={i.productId}
            data-testid={`my-stock-${i.productId}`}
            className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2"
          >
            {/* The name wraps inside its own column and the figures keep a fixed
                one on the right, so every row lines up whatever the model is
                called. They used to share a wrapping row, which is why a long
                name pushed its numbers onto a second line and left the card
                looking ragged. */}
            <div className="min-w-0">
              <span className="font-semibold text-fg">{i.brand}</span>{' '}
              <span className="text-sm text-fg-muted">{i.model}</span>
            </div>
            <div className="shrink-0 whitespace-nowrap text-right">
              {/* Icons instead of repeating "barrels" and "loose" on every row.
                  "loose" keeps its word: on the club line the shuttle figure is
                  the brand's whole count, so the two would otherwise read as
                  the same thing when they are not. */}
              <div className="flex items-center justify-end gap-3 text-sm tabular-nums">
                <span className="inline-flex items-center gap-1" title="Unopened barrels">
                  <Icon name="inventory" className="h-3.5 w-3.5 text-fg-subtle" />
                  <b className="text-fg">{i.barrels}</b>
                </span>
                <span className="inline-flex items-center gap-1" title="Loose shuttles">
                  <Icon name="shuttle" className="h-3.5 w-3.5 text-fg-subtle" />
                  <b className="text-fg">{i.looseShuttles}</b>
                  <span className="text-fg-muted">loose</span>
                </span>
              </div>
              <div
                className="mt-0.5 flex items-center justify-end gap-3 text-xs tabular-nums text-fg-subtle"
                data-testid={`club-${i.productId}`}
              >
                <span>club</span>
                <span className="inline-flex items-center gap-1" title="Barrels across the club">
                  <Icon name="inventory" className="h-3 w-3" />
                  {i.clubBarrels}
                </span>
                <span className="inline-flex items-center gap-1" title="Shuttles across the club">
                  <Icon name="shuttle" className="h-3 w-3" />
                  {i.clubShuttles}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {/* One line. It used to take three to say this, plus a sentence about
          asking an admin that nobody needed twice. */}
      <p className="mt-3 text-sm font-semibold text-fg" data-testid="my-stock-total">
        {data.clubTotalShuttles > data.totalShuttles
          ? `${data.totalShuttles} of ${data.clubTotalShuttles} in the club`
          : `${data.totalShuttles} shuttles`}
      </p>
    </Card>
  )
}
