import { useId, type ReactNode } from 'react'
import { cx } from '../cx'

export interface ChipOption {
  id: string
  label: ReactNode
}

interface ChipPickerProps {
  label: ReactNode
  options: ChipOption[]
  value: string
  onChange: (id: string) => void
  /** Shown instead of the chips when there is nothing to choose from. */
  empty?: ReactNode
  /** testid for the group — or for the empty message, so either can be found. */
  'data-testid'?: string
  /** testid for each chip. Defaults to `<group>-<option id>`. */
  chipTestId?: (id: string) => string
}

/**
 * Pick one of a few options, rendered as inline chips.
 *
 * This exists because a native <select> cannot be made to work on a phone: its
 * open list is OS chrome — an iOS wheel pinned to the bottom of the screen, an
 * Android dialog in the centre — so the values appear nowhere near the control
 * and no CSS can move them. Where the option count is small and known (stock
 * holders, shuttle brands), chips put the choices exactly where they are read,
 * in one tap instead of two.
 *
 * radiogroup/radio semantics keep it keyboard- and screen-reader-navigable.
 */
export function ChipPicker({
  label,
  options,
  value,
  onChange,
  empty,
  'data-testid': testId,
  chipTestId,
}: ChipPickerProps) {
  const labelId = useId()
  const chipId = chipTestId ?? ((id: string) => (testId ? `${testId}-${id}` : undefined))

  return (
    <div>
      <p id={labelId} className="mb-1.5 text-sm font-medium text-fg-muted">
        {label}
      </p>
      {options.length === 0 ? (
        <p className="text-sm text-fg-muted" data-testid={testId}>
          {empty}
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          className="flex flex-wrap gap-2"
          data-testid={testId}
        >
          {options.map((o) => {
            const on = o.id === value
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                data-testid={chipId(o.id)}
                onClick={() => onChange(o.id)}
                className={cx(
                  // min-h keeps every chip a comfortable tap target on a phone.
                  'min-h-[2.75rem] rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent',
                  on
                    ? 'border-accent bg-accent text-neutral-950'
                    : 'border-line bg-surface text-fg hover:bg-surface-muted',
                )}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
