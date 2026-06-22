import type { ReactNode } from 'react'

/**
 * Encodes the dual-render contract: stacked cards on mobile, a wide table/layout
 * on desktop. Feed two renderings of the same data; the right one shows per
 * breakpoint (Tailwind `sm`).
 */
export function DualRender({ mobile, desktop }: { mobile: ReactNode; desktop: ReactNode }) {
  return (
    <>
      <div className="sm:hidden">{mobile}</div>
      <div className="hidden sm:block">{desktop}</div>
    </>
  )
}
