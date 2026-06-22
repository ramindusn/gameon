import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Card, cx } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { useRoster } from '../roster/useRoster'
import { useSession, useSetResult, useSetSessionStatus } from '../play/useMatchPlay'
import type { MatchResult, Side } from '../play/api'

// Live scoring (E04 / TASK-5.3). Open a session, tap the winning team on each
// court, and mark the session finished. Player ids in results are resolved to
// nicknames via the roster.
export function PlayPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useSession(id)
  const { data: roster } = useRoster()
  const setResult = useSetResult(id)
  const setStatus = useSetSessionStatus(id)

  const nameOf = useMemo(() => {
    const byId = new Map((roster?.players ?? []).map((p) => [p.id, p.nickname]))
    return (pid: string | null) => (pid ? (byId.get(pid) ?? '—') : '—')
  }, [roster])

  const rounds = useMemo(() => groupByRound(data?.results ?? []), [data])

  return (
    <AppShell title="Play">
      <div data-testid="play">
        {isLoading && <p className="text-sm text-fg-muted">Loading session…</p>}
        {isError && <p className="text-sm text-negative">Could not load the session.</p>}
        {!isLoading && !data && (
          <p className="text-sm text-fg-muted">Session not found.</p>
        )}

        {data && (
          <>
            <Card
              title={`Session · ${data.session.mode === 'mixed' ? 'Mixed doubles' : 'Doubles'}`}
              icon="🏸"
              action={
                <span
                  className={cx(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    data.session.status === 'live'
                      ? 'bg-accent/15 text-accent-strong'
                      : 'bg-surface-muted text-fg-muted',
                  )}
                  data-testid="session-status"
                >
                  {data.session.status === 'live' ? 'Live' : 'Finished'}
                </span>
              }
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-fg-muted">
                  {rounds.length} rounds · {recordedCount(data.results)} /{' '}
                  {data.results.length} recorded
                </p>
                {data.session.status === 'live' ? (
                  <Button
                    variant="secondary"
                    onClick={() => setStatus.mutate('finished')}
                    disabled={setStatus.isPending}
                    data-testid="finish-session"
                  >
                    Finish session
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => setStatus.mutate('live')}
                    disabled={setStatus.isPending}
                    data-testid="reopen-session"
                  >
                    Reopen
                  </Button>
                )}
              </div>
            </Card>

            <div className="mt-6 space-y-4">
              {rounds.map(({ round, results }) => (
                <Card key={round} title={`Round ${round}`} icon="🎯">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {results.map((r) => (
                      <CourtScore
                        key={r.id}
                        result={r}
                        nameOf={nameOf}
                        disabled={data.session.status !== 'live' || setResult.isPending}
                        onPick={(winner) => setResult.mutate({ resultId: r.id, winner })}
                      />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

function CourtScore({
  result,
  nameOf,
  disabled,
  onPick,
}: {
  result: MatchResult
  nameOf: (id: string | null) => string
  disabled: boolean
  onPick: (winner: Side) => void
}) {
  const team = (side: Side, ids: [string | null, string | null]) => {
    const won = result.winner === side
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPick(side)}
        className={cx(
          'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed',
          won
            ? 'border-accent bg-accent/15 font-semibold text-fg'
            : 'border-line bg-surface-muted text-fg hover:border-accent',
        )}
        data-testid={`pick-${result.id}-${side}`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="truncate">
            {nameOf(ids[0])} &amp; {nameOf(ids[1])}
          </span>
          {won && <span aria-label="winner">✓</span>}
        </span>
      </button>
    )
  }

  return (
    <div
      className="rounded-lg border border-line bg-surface px-3 py-2"
      data-testid={`court-${result.id}`}
    >
      <div className="mb-2 text-xs uppercase tracking-wide text-fg-subtle">
        Court {result.court}
      </div>
      <div className="space-y-1.5">
        {team('a', result.teamA)}
        <div className="text-center text-xs text-fg-muted">vs</div>
        {team('b', result.teamB)}
      </div>
    </div>
  )
}

interface RoundGroup {
  round: number
  results: MatchResult[]
}

/** Group results (already ordered by round, court) into rounds for display. */
function groupByRound(results: MatchResult[]): RoundGroup[] {
  const groups: RoundGroup[] = []
  for (const r of results) {
    let g = groups.find((x) => x.round === r.round)
    if (!g) {
      g = { round: r.round, results: [] }
      groups.push(g)
    }
    g.results.push(r)
  }
  return groups
}

const recordedCount = (results: MatchResult[]) =>
  results.filter((r) => r.winner !== null).length
