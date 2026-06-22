import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-neutral-950 hover:bg-accent-strong focus:ring-accent',
  secondary: 'bg-surface-muted text-fg hover:bg-line focus:ring-line',
  ghost: 'bg-transparent text-fg-muted hover:bg-surface-muted focus:ring-line',
  danger: 'bg-negative text-white hover:opacity-90 focus:ring-negative',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

export function Button({ variant = 'primary', className, children, ...rest }: Props) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
