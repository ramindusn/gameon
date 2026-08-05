import type { ReactNode, SelectHTMLAttributes } from 'react'
import { cx } from '../cx'

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  /** Optional label above the control, matching <Field>. */
  label?: ReactNode
  /** Extra classes for the <select>. */
  className?: string
  children: ReactNode
}

/**
 * A <select> styled to match <Field>'s input, so forms mixing the two line up.
 * `appearance-none` matters on iOS, where the native control ignores padding and
 * renders at its own height — which left dropdowns sitting off from the inputs
 * beside them. The chevron is drawn back in so the control still reads as a
 * picker.
 */
export function Select({ label, className, children, ...rest }: SelectProps) {
  const control = (
    <span className="relative block">
      <select
        className={cx(
          'w-full appearance-none rounded-lg border border-line bg-surface py-2 pl-3 pr-9 text-sm text-fg shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8l4 4 4-4" />
      </svg>
    </span>
  )
  if (!label) return control
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-fg-muted">{label}</span>
      {control}
    </label>
  )
}
