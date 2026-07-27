import type { ReactNode } from 'react'
import { cx } from '../cx'

interface CardProps {
  title?: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  /** Tailwind text-colour class for the header icon. Defaults to the green brand
   *  accent; game-day cards pass a blue tone so the icon matches their theme. */
  iconTone?: string
}

export function Card({ title, icon, action, children, iconTone }: CardProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-fg">
            {icon && (
              <span aria-hidden className={cx('flex', iconTone ?? 'text-accent')}>
                {icon}
              </span>
            )}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
