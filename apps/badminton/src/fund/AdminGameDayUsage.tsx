import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, ChipPicker } from '@gameon/ui'
import { Icon } from '../app/Icon'
import { formatPlayedAt } from '../play/datetime'
import { useSessions } from '../play/useMatchPlay'
import { GameDayUsage, useStockContext } from './GameDayUsage'
import { loadSessionsWithUsage } from './usageApi'

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
    </Card>
  )
}
