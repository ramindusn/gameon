import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, cx } from '@gameon/ui'
import { validateScores } from '@gameon/domain'
import { AppShell } from '../app/AppShell'
import { useRoster } from '../roster/useRoster'
import {
  useDeleteSession,
  useSession,
  useSetScore,
  useSetSessionStatus,
  useUpdateSessionPlayedAt,
} from '../play/useMatchPlay'
import {
  formatPlayedAt,
  isoToLocalInput,
  localInputToIso,
} from '../play/datetime'
import type { MatchResult, Side } from '../play/api'

// Live scoring (E04 / E09). Open a game day, enter the point scores for each
// court (the winner is derived from the scores), and finish it. The matchmaker
// can also correct the game-day date/time or delete the game day. Player ids in
// results are resolved to nicknames via the roster.
export function PlayPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useSession(id)
  const { data: roster } = useRoster()
  const setScore = useSetScore(id)
  const setStatus = useSetSessionStatus(id)
  const updatePlayedAt = useUpdateSessionPlayedAt(id)
  const deleteSession = useDeleteSession()

  const [editingDate, setEditingDate] = useState(false)
  const [dateValue, setDateValue] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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
              title={`Game day · ${data.session.mode === 'mixed' ? 'Mixed doubles' : 'Doubles'}`}
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
              <div className="space-y-3">
                {editingDate ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-sm">
                      <span className="mb-1 block text-fg-muted">
                        Game day date &amp; time
                      </span>
                      <input
                        type="datetime-local"
                        value={dateValue}
                        onChange={(e) => setDateValue(e.target.value)}
                        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        data-testid="game-day-datetime-input"
                      />
                    </label>
                    <Button
                      onClick={() =>
                        updatePlayedAt.mutate(localInputToIso(dateValue), {
                          onSuccess: () => setEditingDate(false),
                        })
                      }
                      disabled={updatePlayedAt.isPending}
                      data-testid="save-datetime"
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setEditingDate(false)}
                      data-testid="cancel-datetime"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-sm font-medium text-fg"
                      data-testid="game-day-date"
                    >
                      {formatPlayedAt(data.session.playedAt)}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDateValue(isoToLocalInput(data.session.playedAt))
                        setEditingDate(true)
                      }}
                      data-testid="edit-datetime"
                    >
                      Edit date
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-fg-muted">
                    {rounds.length} rounds · {recordedCount(data.results)} /{' '}
                    {data.results.length} recorded
                  </p>
                  <div className="flex items-center gap-2">
                    {data.session.status === 'live' ? (
                      <Button
                        variant="secondary"
                        onClick={() => setStatus.mutate('finished')}
                        disabled={setStatus.isPending}
                        data-testid="finish-session"
                      >
                        Finish game day
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
                    {confirmingDelete ? (
                      <>
                        <Button
                          variant="danger"
                          onClick={() =>
                            deleteSession.mutate(
                              {
                                id: data.session.id,
                                wasFinished: data.session.status === 'finished',
                              },
                              { onSuccess: () => navigate('/play') },
                            )
                          }
                          disabled={deleteSession.isPending}
                          data-testid="confirm-delete-game-day"
                        >
                          Confirm delete
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setConfirmingDelete(false)}
                          data-testid="cancel-delete-game-day"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmingDelete(true)}
                        data-testid="delete-game-day"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
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
                        disabled={data.session.status !== 'live'}
                        saving={setScore.isPending}
                        onSave={(scoreA, scoreB) =>
                          setScore.mutate({ resultId: r.id, scoreA, scoreB })
                        }
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
  saving,
  onSave,
}: {
  result: MatchResult
  nameOf: (id: string | null) => string
  disabled: boolean
  saving: boolean
  onSave: (scoreA: number, scoreB: number) => void
}) {
  const [a, setA] = useState(result.scoreA?.toString() ?? '')
  const [b, setB] = useState(result.scoreB?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const scoreA = a === '' ? null : Number(a)
    const scoreB = b === '' ? null : Number(b)
    const v = validateScores(scoreA, scoreB)
    if (!v.ok) {
      setError(v.error ?? 'Invalid scores')
      return
    }
    setError(null)
    onSave(scoreA as number, scoreB as number)
  }

  const teamRow = (side: Side, ids: [string | null, string | null]) => {
    const won = result.winner === side
    const value = side === 'a' ? a : b
    const set = side === 'a' ? setA : setB
    return (
      <div
        className={cx(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
          won
            ? 'border-accent bg-accent/15 font-semibold text-fg'
            : 'border-line bg-surface-muted text-fg',
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {nameOf(ids[0])} &amp; {nameOf(ids[1])}
        </span>
        {won && <span aria-label="winner">✓</span>}
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(e) => set(e.target.value)}
          className="w-14 rounded-md border border-line bg-surface px-2 py-1 text-right text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          data-testid={`score-${result.id}-${side}`}
          aria-label={`Score for ${side === 'a' ? 'team A' : 'team B'}`}
        />
      </div>
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
        {teamRow('a', result.teamA)}
        <div className="text-center text-xs text-fg-muted">vs</div>
        {teamRow('b', result.teamB)}
      </div>
      {error && (
        <p className="mt-2 text-xs text-negative" data-testid={`score-error-${result.id}`}>
          {error}
        </p>
      )}
      {!disabled && (
        <Button
          className="mt-2 w-full"
          variant="secondary"
          onClick={save}
          disabled={saving}
          data-testid={`save-score-${result.id}`}
        >
          {result.winner ? 'Update score' : 'Save score'}
        </Button>
      )}
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
