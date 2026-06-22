interface StatCardProps {
  label: string
  value: string
  icon: string
  hint?: string
  tone?: 'default' | 'accent' | 'positive' | 'negative' | 'warning'
  testId?: string
}

const tones: Record<
  NonNullable<StatCardProps['tone']>,
  { value: string; chip: string }
> = {
  default: { value: 'text-fg', chip: 'bg-surface-muted' },
  accent: { value: 'text-accent-strong', chip: 'bg-accent/15' },
  positive: { value: 'text-emerald-400', chip: 'bg-emerald-500/15' },
  negative: { value: 'text-red-400', chip: 'bg-red-500/15' },
  warning: { value: 'text-amber-400', chip: 'bg-amber-500/15' },
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'default',
  testId,
}: StatCardProps) {
  const t = tones[tone]
  return (
    <div
      className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5"
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${t.chip}`}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
            {label}
          </div>
          <div
            className={`mt-0.5 text-2xl font-bold leading-tight ${t.value}`}
            data-testid={testId ? `${testId}-value` : undefined}
          >
            {value}
          </div>
          {hint && <div className="text-xs text-fg-subtle">{hint}</div>}
        </div>
      </div>
    </div>
  )
}
