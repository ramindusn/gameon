import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, ChipPicker, Field } from '@gameon/ui'
import { Icon } from '../app/Icon'
import { formatPlayedAt } from '../play/datetime'
import { useSessions } from '../play/useMatchPlay'
import { GameDayUsage, UsageForm, useStockContext } from './GameDayUsage'
import { loadSessionsWithUsage, recordStandaloneUsage, type StockContext } from './usageApi'

/**
 * Admin-side game-day usage (TASK-72). Recording used to be a date-keyed entry
 * against the old club-wide pool, which contradicted the matchmaker's flow —
 * this is the same model they use: pick the day, say whose barrels it came out
 * of, enter the count per brand.
 *
 * The picker lists only game days still waiting on an answer, newest first, so
 * the admin's job is simply to empty the list. A dropdown rather than the
 * matchmaker's chips because there can be a great many game days.
 */
export function AdminGameDayUsage() {
  const { data: ctx } = useStockContext()
  const { data: sessions } = useSessions()
  const { data: answered } = useQuery({
    queryKey: ['sessions-with-usage'],
    queryFn: loadSessionsWithUsage,
  })

  // Days with nothing recorded yet — including days answered as "none", which
  // count as done and drop off here.
  const pending = useMemo(() => {
    const done = new Set(answered ?? [])
    return (sessions ?? [])
      .filter((s) => s.kind === 'casual' && !done.has(s.id))
      .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
  }, [sessions, answered])

  // Null until the admin picks one; until then it follows the list, so the
  // latest outstanding day is selected as soon as the data lands.
  const [picked, setPicked] = useState<string | null>(null)
  const sessionId = picked && pending.some((s) => s.id === picked) ? picked : pending[0]?.id

  if (!ctx?.isAdmin) return null

  return (
    <Card title="Game-day usage" icon={<Icon name="calendar" />}>
      {pending.length === 0 ? (
        <p className="text-sm text-fg-muted" data-testid="usage-all-done">
          Every game day has its shuttle usage recorded.
        </p>
      ) : (
        <div className="space-y-4">
          {/* A picker offering one option is just a step to get past, so a
              single outstanding day is stated rather than chosen (TASK-76.5).
              Beyond that the days are chips: a native select's list renders as
              OS chrome away from the control on a phone. */}
          {pending.length === 1 ? (
            <p className="text-sm text-fg-muted" data-testid="usage-game-day">
              Recording{' '}
              <span className="font-medium text-fg">
                {formatPlayedAt(pending[0].playedAt)}
              </span>{' '}
              — the only game day still to record.
            </p>
          ) : (
            <ChipPicker
              label={`Game day (${pending.length} still to record)`}
              data-testid="usage-game-day"
              value={sessionId ?? ''}
              onChange={setPicked}
              options={pending.map((s) => ({
                id: s.id,
                label: formatPlayedAt(s.playedAt),
              }))}
            />
          )}

          {/* Keyed on the day so switching starts from a clean form. */}
          {sessionId && <GameDayUsage key={sessionId} sessionId={sessionId} />}
        </div>
      )}

      <StandaloneUsage ctx={ctx} />
    </Card>
  )
}

/**
 * Usage with no game day behind it (TASK-95).
 *
 * Shuttles get used whether or not a game day row survives to hold the record.
 * On 2026-08-26 an evening was played, club shuttles were used, and the game day
 * was then deleted by accident — leaving a holder short with no way to say so,
 * because recording usage required a day to attach it to.
 *
 * Folded away behind a link rather than shown outright: this is the exception,
 * and the day-by-day flow above is what should be reached for first. It stays
 * available even when every game day is answered, which is precisely when a
 * correction like this is needed and when the card used to offer nothing at all.
 */
function StandaloneUsage({ ctx }: { ctx: StockContext }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  // Today by default. Yesterday's shuttles are the common case, so the date is
  // editable rather than assumed.
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  if (!open) {
    return (
      <div className="mt-4 border-t border-line pt-3">
        {saved && (
          <p className="mb-2 text-sm text-fg-muted" data-testid="standalone-saved">
            Usage recorded.
          </p>
        )}
        <button
          type="button"
          className="text-sm text-fg-muted underline underline-offset-2 hover:text-fg"
          data-testid="standalone-open"
          onClick={() => {
            setSaved(false)
            setOpen(true)
          }}
        >
          Record usage with no game day
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4 border-t border-line pt-4" data-testid="standalone-usage">
      <p className="text-sm text-fg-muted">
        For shuttles used on an evening with no game day — including one that was deleted.
        The date and note are how you will recognise it later.
      </p>
      <Field
        label="Date"
        type="date"
        data-testid="standalone-date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <Field
        label="Note"
        placeholder="e.g. Tue session, game day was deleted"
        data-testid="standalone-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <UsageForm
        ctx={ctx}
        // Midday rather than midnight: a bare date parsed as UTC can land on the
        // day before once it is rendered back in a local timezone.
        record={(v) =>
          recordStandaloneUsage({
            ctx,
            lines: v.lines,
            occurredAt: new Date(`${date}T12:00:00`).toISOString(),
            note,
          })
        }
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: ['stock-context'] })
          void qc.invalidateQueries({ queryKey: ['fund'] })
          setNote('')
          setSaved(true)
          setOpen(false)
        }}
        secondary={
          <button
            type="button"
            className="text-sm text-fg-muted underline underline-offset-2 hover:text-fg"
            data-testid="standalone-cancel"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
        }
      />
    </div>
  )
}
