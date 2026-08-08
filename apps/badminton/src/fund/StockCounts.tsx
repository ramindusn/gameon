import { Icon } from '../app/Icon'

/**
 * The two numbers stock is counted in — unopened barrels, and loose shuttles —
 * shown as a count against its own glyph.
 *
 * The number sits immediately left of its icon, and it is the pair that gets
 * right-aligned inside a fixed-width box. Right-aligning the number itself put
 * a single digit a character-width away from the icon it belonged to, which
 * made "1" look as though it went with whichever glyph was nearest. This way
 * the count stays glued to its glyph and every icon still lands on the same x
 * down a list.
 *
 * Shared by the matchmaker's card and the admin's stock panel so the two count
 * the same things the same way.
 */
export function StockCounts({
  barrels,
  looseShuttles,
  barrelsTestId,
  looseTestId,
  className,
}: {
  barrels: number
  looseShuttles: number
  barrelsTestId?: string
  looseTestId?: string
  className?: string
}) {
  return (
    <div
      className={`flex shrink-0 items-center gap-4 whitespace-nowrap text-sm ${className ?? ''}`}
    >
      <span
        className="inline-flex min-w-[3rem] items-center justify-end gap-1"
        title="Unopened barrels"
        data-testid={barrelsTestId}
      >
        <b className="tabular-nums text-fg">{barrels}</b>
        <Icon name="barrel" className="h-[18px] w-[18px] text-fg-subtle" />
      </span>
      <span
        className="inline-flex min-w-[3rem] items-center justify-end gap-1"
        title="Loose shuttles"
        data-testid={looseTestId}
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
 * show them — this is the version that works on the device they are read on.
 */
export function StockLegend({
  testId,
  className,
}: {
  testId: string
  className?: string
}) {
  return (
    <p
      className={`flex items-center gap-4 text-xs text-fg-subtle ${className ?? 'mb-2'}`}
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
