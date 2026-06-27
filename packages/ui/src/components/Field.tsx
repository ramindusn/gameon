import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from '../cx'

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: ReactNode
  /** Narrow, auto-width input (e.g. a small number field) instead of full width. */
  inline?: boolean
  /** Extra classes for the <input>. */
  className?: string
}

export function Field({ label, inline = false, className, ...rest }: FieldProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-fg-muted">{label}</span>
      <input
        className={cx(
          inline ? 'w-24' : 'w-full',
          'rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg shadow-sm placeholder:text-fg-muted/70 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
          className,
        )}
        {...rest}
      />
    </label>
  )
}
