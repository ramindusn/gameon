import { useState } from 'react'

/**
 * Newer/Older paging for a list that grows with the season.
 *
 * Shared because three cards needed the same thing — game day history, the
 * admin's game days and its stock log — and three hand-rolled pagers would
 * drift apart in wording and in the edge cases below.
 *
 * `usePager` clamps the page rather than storing it blindly: a game day
 * finishing, or a stock change landing, while you sit on the last page would
 * otherwise re-slice the list under you and leave you looking at nothing.
 */
export function usePager<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const start = current * pageSize
  const slice = items.slice(start, start + pageSize)
  return { slice, page: current, pageCount, start, total: items.length, setPage }
}

const BTN =
  'rounded-full px-3 py-1 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent/15 disabled:text-fg-subtle disabled:opacity-40 disabled:hover:bg-transparent'

/**
 * Renders nothing when everything fits on one page: a list short enough not to
 * need paging reads as broken if it carries dead controls anyway.
 */
export function Pager({
  page,
  pageCount,
  start,
  shown,
  total,
  onPage,
  testId,
}: {
  page: number
  pageCount: number
  start: number
  shown: number
  total: number
  onPage: (p: number) => void
  testId: string
}) {
  if (pageCount <= 1) return null
  return (
    <div
      className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3"
      data-testid={testId}
    >
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        className={BTN}
        data-testid={`${testId}-prev`}
      >
        ‹ Newer
      </button>
      <span className="text-xs tabular-nums text-fg-subtle">
        {start + 1}–{start + shown} of {total}
      </span>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount - 1}
        className={BTN}
        data-testid={`${testId}-next`}
      >
        Older ›
      </button>
    </div>
  )
}
