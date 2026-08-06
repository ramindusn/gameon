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
            className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-lg border border-line bg-surface-muted px-3 py-2"
          >
            <div className="min-w-0">
              <span className="font-semibold text-fg">{i.brand}</span>{' '}
              <span className="text-sm text-fg-muted">{i.model}</span>
            </div>
            <div className="flex flex-col items-end text-sm">
              <div className="flex items-baseline gap-3">
                <span>
                  <b className="text-fg">{i.barrels}</b>{' '}
                  <span className="text-fg-muted">barrels</span>
                </span>
                <span>
                  <b className="text-fg">{i.looseShuttles}</b>{' '}
                  <span className="text-fg-muted">loose</span>
                </span>
              </div>
              {/* The club figure per brand, so "have we got enough RSL?" is
                  answerable here rather than only on the admin dashboard. */}
              <span className="text-xs text-fg-subtle" data-testid={`club-${i.productId}`}>
                {i.shuttles} of {i.clubShuttles} in the club
              </span>
            </div>
          </li>
        ))}
      </ul>
      {/* "in your hands", not "in total": the dashboard shows the club figure
          under the same kind of heading, and the two looked like they
          disagreed when they were only counting different things. */}
      <p className="mt-3 text-sm font-semibold text-fg" data-testid="my-stock-total">
        {data.totalShuttles} shuttles in {data.holderName}'s hands
      </p>
      {data.clubTotalShuttles > data.totalShuttles && (
        <p className="mt-0.5 text-xs text-fg-muted" data-testid="my-stock-club-total">
          of {data.clubTotalShuttles} in the club — the rest is with other matchmakers.
        </p>
      )}
      <p className="mt-1 text-xs text-fg-subtle">
        An admin allocates and moves stock. Tell them if these numbers look wrong.
      </p>
    </Card>
  )
}
