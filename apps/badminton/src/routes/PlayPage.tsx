import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, cx } from '@gameon/ui'
import { validateLineup, validateScores } from '@gameon/domain'
import { AppShell } from '../app/AppShell'
import { useRoster } from '../roster/useRoster'
import {
  useAddCustomMatch,
  useDeleteMatch,
  useDeleteSession,
  useSession,
  useSetScore,
  useSetSessionStatus,
  useUpdateMatchLineup,
  useUpdateSessionPlayedAt,
} from '../play/useMatchPlay'
import {
  formatPlayedAt,
  isoToLocalInput,
  localInputToIso,
} from '../play/datetime'
import type { MatchResult, Side } from '../play/api'

/** A roster player reduced to what the live editors need. */
interface PresentPlayer {
  id: string
  nickname: string
}

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
  const updateLineup = useUpdateMatchLineup(id)
  const addMatch = useAddCustomMatch(id)
  const deleteMatch = useDeleteMatch(id)

  const [editingDate, setEditingDate] = useState(false)
  const [dateValue, setDateValue] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const nameOf = useMemo(() => {
    const byId = new Map((roster?.players ?? []).map((p) => [p.id, p.nickname]))
    return (pid: string | null) => (pid ? (byId.get(pid) ?? '—') : '—')
  }, [roster])

  const present = useMemo<PresentPlayer[]>(
    () =>
      (roster?.players ?? [])
        .filter((p) => !p.absent)
        .map((p) => ({ id: p.id, nickname: p.nickname })),
    [roster],
  )

  const rounds = useMemo(() => groupByRound(data?.results ?? []), [data])

  // A game day can only be finished once every match is resolved (scored) or
  // deleted. An unscored match has no derived winner (TASK-10.5 / AC#1).
  const outstanding = useMemo(
    () => (data?.results ?? []).filter((r) => r.winner === null),
    [data],
  )

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
              title={
                data.session.kind === 'tournament'
                  ? 'Tournament · Fixed pairs'
                  : `Game day · ${data.session.mode === 'mixed' ? 'Mixed doubles' : 'Doubles'}`
              }
              icon={data.session.kind === 'tournament' ? '🏆' : '🏸'}
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
                        onClick={() =>
                          setStatus.mutate('finished', {
                            onSuccess: () => navigate('/leaderboard'),
                          })
                        }
                        disabled={setStatus.isPending || outstanding.length > 0}
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
                              { onSuccess: () => navigate('/matchmaker') },
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

            {data.session.status === 'live' && outstanding.length > 0 && (
              <div
                className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50/60 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
                data-testid="outstanding-matches"
              >
                <p className="font-medium text-fg">
                  Score or delete every match to finish ({outstanding.length}{' '}
                  outstanding)
                </p>
                <ul className="mt-1 list-disc pl-5 text-fg-muted">
                  {outstanding.map((r) => (
                    <li key={r.id} data-testid={`outstanding-${r.id}`}>
                      Round {r.round} · Court {r.court} — {nameOf(r.teamA[0])} &amp;{' '}
                      {nameOf(r.teamA[1])} vs {nameOf(r.teamB[0])} &amp;{' '}
                      {nameOf(r.teamB[1])}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 space-y-4">
              {rounds.map(({ round, results }) => (
                <Card key={round} title={`Round ${round}`} icon="🎯">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {results.map((r) => (
                      <CourtScore
                        key={r.id}
                        result={r}
                        nameOf={nameOf}
                        present={present}
                        live={data.session.status === 'live'}
                        saving={setScore.isPending}
                        editing={updateLineup.isPending}
                        deleting={deleteMatch.isPending}
                        onSave={(scoreA, scoreB) =>
                          setScore.mutate({ resultId: r.id, scoreA, scoreB })
                        }
                        onSaveLineup={(teamA, teamB) =>
                          updateLineup.mutate({ resultId: r.id, teamA, teamB })
                        }
                        onDelete={() => deleteMatch.mutate(r.id)}
                      />
                    ))}
                  </div>
                </Card>
              ))}

              {data.session.status === 'live' && (
                <AddCustomMatch
                  present={present}
                  saving={addMatch.isPending}
                  onAdd={(players) => {
                    const { round, court } = nextSlot(data.results)
                    addMatch.mutate({
                      clubId: data.session.clubId,
                      round,
                      court,
                      players,
                    })
                  }}
                />
              )}
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
  present,
  live,
  saving,
  editing,
  deleting,
  onSave,
  onSaveLineup,
  onDelete,
}: {
  result: MatchResult
  nameOf: (id: string | null) => string
  present: PresentPlayer[]
  live: boolean
  saving: boolean
  editing: boolean
  deleting: boolean
  onSave: (scoreA: number, scoreB: number) => void
  onSaveLineup: (teamA: [string, string], teamB: [string, string]) => void
  onDelete: () => void
}) {
  const [a, setA] = useState(result.scoreA?.toString() ?? '')
  const [b, setB] = useState(result.scoreB?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'score' | 'edit'>('score')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block break-words">{nameOf(ids[0])}</span>
          <span className="block break-words">{nameOf(ids[1])}</span>
        </span>
        {won && <span aria-label="winner">✓</span>}
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          disabled={!live}
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
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-fg-subtle">
          Court {result.court}
        </span>
        {live && mode === 'score' && (
          <button
            type="button"
            className="text-xs font-medium text-accent-strong hover:underline"
            onClick={() => setMode('edit')}
            data-testid={`edit-lineup-${result.id}`}
          >
            Edit line-up
          </button>
        )}
      </div>

      {mode === 'edit' ? (
        <LineupEditor
          result={result}
          present={present}
          saving={editing}
          onCancel={() => setMode('score')}
          onSave={(teamA, teamB) => {
            onSaveLineup(teamA, teamB)
            setMode('score')
          }}
        />
      ) : (
        <>
          <div className="space-y-1.5">
            {teamRow('a', result.teamA)}
            <div className="text-center text-xs text-fg-muted">vs</div>
            {teamRow('b', result.teamB)}
          </div>
          {error && (
            <p
              className="mt-2 text-xs text-negative"
              data-testid={`score-error-${result.id}`}
            >
              {error}
            </p>
          )}
          {live && (
            <div className="mt-2 space-y-2">
              <Button
                className="w-full"
                variant="secondary"
                onClick={save}
                disabled={saving}
                data-testid={`save-score-${result.id}`}
              >
                {result.winner ? 'Update score' : 'Save score'}
              </Button>
              {confirmingDelete ? (
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="danger"
                    onClick={onDelete}
                    disabled={deleting}
                    data-testid={`confirm-delete-match-${result.id}`}
                  >
                    Confirm
                  </Button>
                  <Button
                    className="flex-1"
                    variant="ghost"
                    onClick={() => setConfirmingDelete(false)}
                    data-testid={`cancel-delete-match-${result.id}`}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full"
                  variant="ghost"
                  onClick={() => setConfirmingDelete(true)}
                  data-testid={`delete-match-${result.id}`}
                >
                  Delete match
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Four player <select>s for replacing a match's line-up (full substitution). */
function LineupEditor({
  result,
  present,
  saving,
  onCancel,
  onSave,
}: {
  result: MatchResult
  present: PresentPlayer[]
  saving: boolean
  onCancel: () => void
  onSave: (teamA: [string, string], teamB: [string, string]) => void
}) {
  const [slots, setSlots] = useState<[string, string, string, string]>([
    result.teamA[0] ?? '',
    result.teamA[1] ?? '',
    result.teamB[0] ?? '',
    result.teamB[1] ?? '',
  ])
  const [error, setError] = useState<string | null>(null)

  const setSlot = (i: number, value: string) =>
    setSlots((prev) => {
      const next = [...prev] as [string, string, string, string]
      next[i] = value
      return next
    })

  const save = () => {
    const v = validateLineup(slots)
    if (!v.ok) {
      setError(v.error ?? 'Invalid line-up')
      return
    }
    setError(null)
    onSave([slots[0], slots[1]], [slots[2], slots[3]])
  }

  return (
    <div className="space-y-2" data-testid={`lineup-editor-${result.id}`}>
      {(['a1', 'a2', 'b1', 'b2'] as const).map((label, i) => (
        <PlayerSelect
          key={label}
          present={present}
          value={slots[i]}
          onChange={(v) => setSlot(i, v)}
          testid={`lineup-${result.id}-${label}`}
        />
      ))}
      {error && (
        <p className="text-xs text-negative" data-testid={`lineup-error-${result.id}`}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          variant="secondary"
          onClick={save}
          disabled={saving}
          data-testid={`save-lineup-${result.id}`}
        >
          Save line-up
        </Button>
        <Button
          className="flex-1"
          variant="ghost"
          onClick={onCancel}
          data-testid={`cancel-lineup-${result.id}`}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

/** Add an ad-hoc match by picking four present players. */
function AddCustomMatch({
  present,
  saving,
  onAdd,
}: {
  present: PresentPlayer[]
  saving: boolean
  onAdd: (players: [string, string, string, string]) => void
}) {
  const [open, setOpen] = useState(false)
  const [slots, setSlots] = useState<[string, string, string, string]>([
    '',
    '',
    '',
    '',
  ])
  const [error, setError] = useState<string | null>(null)

  const setSlot = (i: number, value: string) =>
    setSlots((prev) => {
      const next = [...prev] as [string, string, string, string]
      next[i] = value
      return next
    })

  const add = () => {
    const v = validateLineup(slots)
    if (!v.ok) {
      setError(v.error ?? 'Invalid line-up')
      return
    }
    setError(null)
    onAdd(slots)
    setSlots(['', '', '', ''])
    setOpen(false)
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        data-testid="add-custom-match"
      >
        + Add custom match
      </Button>
    )
  }

  return (
    <Card title="Add custom match" icon="➕">
      <div className="space-y-2" data-testid="custom-match-form">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(['a1', 'a2', 'b1', 'b2'] as const).map((label, i) => (
            <PlayerSelect
              key={label}
              present={present}
              value={slots[i]}
              onChange={(v) => setSlot(i, v)}
              testid={`custom-${label}`}
            />
          ))}
        </div>
        {error && (
          <p className="text-xs text-negative" data-testid="custom-match-error">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={add}
            disabled={saving}
            data-testid="save-custom-match"
          >
            Add match
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false)
              setError(null)
            }}
            data-testid="cancel-custom-match"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  )
}

/** A <select> over the present roster (blank = unset). */
function PlayerSelect({
  present,
  value,
  onChange,
  testid,
}: {
  present: PresentPlayer[]
  value: string
  onChange: (value: string) => void
  testid: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      data-testid={testid}
    >
      <option value="">— Pick a player —</option>
      {present.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nickname}
        </option>
      ))}
    </select>
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

/**
 * Where a new custom match goes: the last round, on the next free court (or
 * round 1 / court 1 when the game day has no matches yet).
 */
function nextSlot(results: MatchResult[]): { round: number; court: number } {
  if (results.length === 0) return { round: 1, court: 1 }
  const round = Math.max(...results.map((r) => r.round))
  const court =
    Math.max(...results.filter((r) => r.round === round).map((r) => r.court)) + 1
  return { round, court }
}

const recordedCount = (results: MatchResult[]) =>
  results.filter((r) => r.winner !== null).length
