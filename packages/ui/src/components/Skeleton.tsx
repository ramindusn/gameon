import { cx } from '../cx'

interface SkeletonProps {
  /** Extra classes for sizing (e.g. 'h-4 w-32'). */
  className?: string
}

/** A single shimmering placeholder block. Decorative (hidden from a11y tree). */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cx('motion-safe:animate-pulse rounded-md bg-surface-muted', className)}
    />
  )
}

/**
 * A card-shaped skeleton with a title bar and a few rows — a reasonable
 * stand-in for the data-heavy cards while their query loads.
 */
export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}
