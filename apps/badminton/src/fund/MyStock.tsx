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
            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2"
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
            {/* Both lines share one grid, each icon in its own column, so the
                barrels and the loose shuttles line up between "mine" and
                "club" — and the min widths keep every row the same shape, so
                a row reading 205 cannot shove its icons left of a row reading
                7. The whole block stays narrow on purpose: when it carried the
                word "loose" and the club's full shuttle count it ate enough
                width to wrap "Victor New Carbonsonic Pro" onto three lines. */}
            <div className="grid shrink-0 grid-cols-[auto_auto_auto_auto_auto] items-center gap-x-1.5 whitespace-nowrap">
              <span />
              <Icon name="barrel" className="h-[18px] w-[18px] text-fg-subtle" />
              <b
                className="min-w-[1.5rem] text-right text-sm tabular-nums text-fg"
                title="Unopened barrels in your hands"
              >
                {i.barrels}
              </b>
              <Icon name="shuttle" className="ml-1.5 h-[18px] w-[18px] text-fg-subtle" />
              <b
                className="min-w-[1.5rem] text-right text-sm tabular-nums text-fg"
                title="Loose shuttles in your hands"
              >
                {i.looseShuttles}
              </b>

              {/* `contents` so the four cells still land in the grid's own
                  columns — this is only here to keep the club line one node. */}
              <div className="contents" data-testid={`club-${i.productId}`}>
                <span className="text-xs text-fg-subtle">club</span>
                <Icon name="barrel" className="h-3.5 w-3.5 text-fg-subtle" />
                <span
                  className="min-w-[1.5rem] text-right text-xs tabular-nums text-fg-subtle"
                  title="Unopened barrels across the club"
                >
                  {i.clubBarrels}
                </span>
                <Icon name="shuttle" className="ml-1.5 h-3.5 w-3.5 text-fg-subtle" />
                <span
                  className="min-w-[1.5rem] text-right text-xs tabular-nums text-fg-subtle"
                  title="Loose shuttles across the club"
                >
                  {i.clubLooseShuttles}
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
