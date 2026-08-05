import { useQuery } from '@tanstack/react-query'
import { Card } from '@gameon/ui'
import { Icon } from '../app/Icon'
import { loadMyStock } from './api'

/**
 * The stock in the signed-in matchmaker's own hands (TASK-69). Read-only by
 * design: allocation, transfers and corrections are an admin job, so this view
 * has no controls. Renders nothing at all when they hold no stock, so it never
 * adds an empty card to the matchmaker's home.
 */
export function MyStock() {
  const { data } = useQuery({ queryKey: ['my-stock'], queryFn: loadMyStock })
  if (!data || data.items.length === 0) return null

  return (
    <Card title="Shuttles in your hands" icon={<Icon name="inventory" />}>
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
            <div className="flex items-baseline gap-3 text-sm">
              <span>
                <b className="text-fg">{i.barrels}</b>{' '}
                <span className="text-fg-muted">barrels</span>
              </span>
              <span>
                <b className="text-fg">{i.looseShuttles}</b>{' '}
                <span className="text-fg-muted">loose</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-semibold text-fg" data-testid="my-stock-total">
        {data.totalShuttles} shuttles in total
      </p>
      <p className="mt-1 text-xs text-fg-subtle">
        An admin allocates and moves stock. Tell them if these numbers look wrong.
      </p>
    </Card>
  )
}
