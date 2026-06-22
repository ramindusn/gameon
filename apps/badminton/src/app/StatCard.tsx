import { cx } from '@gameon/ui'

type Tone = 'default' | 'accent' | 'negative' | 'warning'

const toneText: Record<Tone, string> = {
  default: 'text-fg',
  accent: 'text-accent-strong',
  negative: 'text-negative',
  warning: 'text-warning',
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'default',
  testId,
}: {
  icon: string
  label: string
  value: string
  hint?: string
  tone?: Tone
  testId?: string
}) {
  return (
    <div
      className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5"
      data-testid={testId}
    >
      <div className="mb-2 flex items-center gap-2 text-sm text-fg-muted">
        <span aria-hidden="true" className="text-base">
          {icon}
        </span>
        {label}
      </div>
      <div className={cx('font-display text-2xl font-bold', toneText[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-fg-muted">{hint}</div>}
    </div>
  )
}
