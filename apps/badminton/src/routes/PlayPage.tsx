import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, cx, SkeletonCard } from '@gameon/ui'
import { validateLineup, validateScores } from '@gameon/domain'
import { AppShell } from '../app/AppShell'
import { Icon } from '../app/Icon'
import { useAuth } from '../auth/useAuth'
import { useRoster } from '../roster/useRoster'
import {
  useAddCustomMatch,
  useDeleteMatch,
  useDeleteSession,
  useSession,
  useSetScore,
  useSetSessionHidden,
  useSetSessionStatus,
  useUpdateMatchLineup,
  useUpdateSessionPlayedAt,
} from '../play/useMatchPlay'
import {
  formatPlayedAt,
  isoToLocalInput,
  localInputToIso,
} from '../play/datetime'
import { usePlayerBoard } from '../ranking/useRanking'
import { effectiveSkill, matchOdds, matchPoints, type MatchOdds } from '../ranking/effectiveSkill'
import { buildGameDayBoard, type GameDayResultRow } from '../ranking/api'
import type { MatchResult, MatchSession, Side } from '../play/api'

/** A roster player reduced to what the live editors need. */
interface PresentPlayer {
  id: string
  nickname: string
}

type Tab = 'schedule' | 'points' | 'score'
/** Look up a player's effective skill (or null if unknown). */
type SkillOf = (id: string | null) => number | null

// Live game-day page (E04 / E09). Public + read-only: anyone can open it to see
// the schedule, the points table, and the scores. Matchmakers additionally get
// the editable "Score" tab — enter point scores per court (winner is derived),
// fix line-ups, add custom matches, and finish the game day.
export function PlayPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useSession(id)
  const { data: roster } = useRoster()
  const board = usePlayerBoard()
  const { role } = useAuth()
  const canEdit = role === 'matchmaker'
  const staff = role === 'matchmaker' || role === 'admin'

  const setScore = useSetScore(id)
  const setStatus = useSetSessionStatus(id)
  const setHidden = useSetSessionHidden(id)
  const updatePlayedAt = useUpdateSessionPlayedAt(id)
  const deleteSession = useDeleteSession()
  const updateLineup = useUpdateMatchLineup(id)
  const addMatch = useAddCustomMatch(id)
  const deleteMatch = useDeleteMatch(id)

  const [tab, setTab] = useState<Tab>(canEdit ? 'score' : 'schedule')
  const [editingDate, setEditingDate] = useState(false)
  const [dateValue, setDateValue] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const nameOf = useMemo(() => {
    const byId = new Map((roster?.players ?? []).map((p) => [p.id, p.nickname]))
    return (pid: string | null) => (pid ? (byId.get(pid) ?? '—') : '—')
  }, [roster])

  // Results-aware skill per player (manual seed blended with rating), so the
  // court cards can show who's favoured / the per-match point swing — the same
  // measure the matchmaker balances on.
  const skillOf = useMemo<SkillOf>(() => {
    const skillById = new Map((roster?.players ?? []).map((p) => [p.id, p.skill]))
    const ratedById = new Map((board.data ?? []).map((r) => [r.playerId, r]))
    return (pid) => {
      if (!pid || !skillById.has(pid)) return null
      const r = ratedById.get(pid)
      return effectiveSkill(skillById.get(pid), r?.rating, r?.games ?? 0)
    }
  }, [roster, board.data])

  // The players actually in this game day (distinct across all its matches).
  const sessionPlayers = useMemo<PresentPlayer[]>(() => {
    const ids = new Set<string>()
    for (const r of data?.results ?? []) {
      for (const id of [...r.teamA, ...r.teamB]) if (id) ids.add(id)
    }
    const nickById = new Map((roster?.players ?? []).map((p) => [p.id, p.nickname]))
    return [...ids]
      .map((id) => ({ id, nickname: nickById.get(id) ?? '—' }))
      .sort((a, b) => a.nickname.localeCompare(b.nickname))
  }, [data, roster])

  const rounds = useMemo(() => groupByRound(data?.results ?? []), [data])

  // A game day can only be finished once every match is resolved (scored) or
  // deleted. An unscored match has no derived winner.
  const outstanding = useMemo(
    () => (data?.results ?? []).filter((r) => r.winner === null),
    [data],
  )

  // Game-day standings so far, from the scored courts — ranked by net point
  // differential then name (matching the public game-day page).
  const standings = useMemo(() => {
    const rows: GameDayResultRow[] = (data?.results ?? [])
      .filter((r) => r.winner !== null && r.scoreA !== null && r.scoreB !== null)
      .map((r) => ({
        teamA: r.teamA,
        teamB: r.teamB,
        scoreA: r.scoreA ?? 0,
        scoreB: r.scoreB ?? 0,
        winner: r.winner === 'b' ? 'b' : 'a',
      }))
    return buildGameDayBoard(rows)
      .map((s) => ({ ...s, name: nameOf(s.playerId) }))
      .sort((a, b) => b.diff - a.diff || a.name.localeCompare(b.name))
  }, [data, nameOf])

  const live = data?.session.status === 'live'

  return (
    <Frame staff={staff}>
      <div data-testid="play">
        {isLoading && <SkeletonCard rows={4} />}
        {isError && <p className="text-sm text-negative">Could not load the session.</p>}
        {!isLoading && !data && (
          <p className="text-sm text-fg-muted">Session not found.</p>
        )}

        {data && (
          // Header (summary + sticky tabs) reads as one component: the summary
          // scrolls away and the tab bar pins below the top nav.
          <>
            <SessionHeader
              session={data.session}
              playerCount={sessionPlayers.length}
              rounds={rounds.length}
              recorded={recordedCount(data.results)}
              total={data.results.length}
              canEdit={canEdit}
              outstanding={outstanding.length}
              editingDate={editingDate}
              dateValue={dateValue}
              confirmingDelete={confirmingDelete}
              busy={{
                date: updatePlayedAt.isPending,
                status: setStatus.isPending,
                hidden: setHidden.isPending,
                del: deleteSession.isPending,
              }}
              onEditDate={() => {
                setDateValue(isoToLocalInput(data.session.playedAt))
                setEditingDate(true)
              }}
              onDateChange={setDateValue}
              onSaveDate={() =>
                updatePlayedAt.mutate(localInputToIso(dateValue), {
                  onSuccess: () => setEditingDate(false),
                })
              }
              onCancelDate={() => setEditingDate(false)}
              onToggleHidden={(v) => setHidden.mutate(v)}
              onFinish={() =>
                setStatus.mutate('finished', { onSuccess: () => navigate('/leaderboard') })
              }
              onReopen={() => setStatus.mutate('live')}
              onAskDelete={() => setConfirmingDelete(true)}
              onCancelDelete={() => setConfirmingDelete(false)}
              onConfirmDelete={() =>
                deleteSession.mutate(
                  { id: data.session.id, wasFinished: data.session.status === 'finished' },
                  { onSuccess: () => navigate('/matchmaker') },
                )
              }
            />

            <div>
              <Tabs active={tab} onChange={setTab} />
              <div className="pt-4">
                {tab === 'schedule' && (
                  <ScheduleTab rounds={rounds} sessionPlayers={sessionPlayers} nameOf={nameOf} skillOf={skillOf} />
                )}

                {tab === 'points' && <PointsTab standings={standings} />}

                {tab === 'score' && (
                  <div className="space-y-4">
                    {rounds.map(({ round, results }) => {
                      const resting = restingInRound(sessionPlayers, results)
                      return (
                        <Card key={round} title={`Round ${round}`} icon={<Icon name="target" />}>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {results.map((r) => (
                              <CourtScore
                                key={r.id}
                                result={r}
                                nameOf={nameOf}
                                skillOf={skillOf}
                                present={sessionPlayers}
                                editable={canEdit && live}
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
                          {resting.length > 0 && (
                            <p className="mt-3 text-xs text-fg-muted" data-testid={`resting-${round}`}>
                              <span className="font-medium text-fg-subtle">Resting:</span>{' '}
                              {resting.map((p) => p.nickname).join(', ')}
                            </p>
                          )}
                        </Card>
                      )
                    })}

                    {canEdit && live && (
                      <AddCustomMatch
                        present={sessionPlayers}
                        results={data.results}
                        saving={addMatch.isPending}
                        onAdd={(round, players) => {
                          addMatch.mutate({
                            clubId: data.session.clubId,
                            round,
                            court: nextCourtInRound(data.results, round),
                            players,
                          })
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Frame>
  )
}

/** Staff get the full app shell (nav); the public gets a lightweight header.
 *  Both headers are sticky at top-0 so the tab bar can pin just beneath them. */
function Frame({ staff, children }: { staff: boolean; children: ReactNode }) {
  // No AppShell title: this page renders its own unified header (summary +
  // sticky tabs), so a separate "Game day" h1 above it would be redundant.
  if (staff) return <AppShell>{children}</AppShell>
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-lg font-bold text-accent-strong">
            BadmintonDuo
          </Link>
          <Link to="/" className="text-sm text-fg-muted hover:text-fg">
            ← Home
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}

// ---- Session header (compact summary + matchmaker controls) ---------------

function SessionHeader({
  session,
  playerCount,
  rounds,
  recorded,
  total,
  canEdit,
  outstanding,
  editingDate,
  dateValue,
  confirmingDelete,
  busy,
  onEditDate,
  onDateChange,
  onSaveDate,
  onCancelDate,
  onToggleHidden,
  onFinish,
  onReopen,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  session: MatchSession
  playerCount: number
  rounds: number
  recorded: number
  total: number
  canEdit: boolean
  outstanding: number
  editingDate: boolean
  dateValue: string
  confirmingDelete: boolean
  busy: { date: boolean; status: boolean; hidden: boolean; del: boolean }
  onEditDate: () => void
  onDateChange: (v: string) => void
  onSaveDate: () => void
  onCancelDate: () => void
  onToggleHidden: (v: boolean) => void
  onFinish: () => void
  onReopen: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}) {
  const live = session.status === 'live'
  return (
    <div className="rounded-t-xl border border-line border-b-0 bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-fg">
          <Icon name={session.kind === 'tournament' ? 'tournament' : 'shuttle'} className="h-4 w-4 text-accent" />
          {session.kind === 'tournament'
            ? 'Tournament · Fixed pairs'
            : `Game day · ${session.mode === 'mixed' ? 'Mixed doubles' : 'Doubles'}`}
        </h2>
        <span
          className={cx(
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
            live ? 'bg-accent/15 text-accent-strong' : 'bg-surface-muted text-fg-muted',
          )}
          data-testid="session-status"
        >
          {live ? 'Live' : 'Finished'}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
        {editingDate && canEdit ? (
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="datetime-local"
              value={dateValue}
              onChange={(e) => onDateChange(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              data-testid="game-day-datetime-input"
            />
            <Button onClick={onSaveDate} disabled={busy.date} data-testid="save-datetime">
              Save
            </Button>
            <Button variant="ghost" onClick={onCancelDate} data-testid="cancel-datetime">
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <span className="font-medium text-fg" data-testid="game-day-date">
              {formatPlayedAt(session.playedAt)}
            </span>
            {canEdit && (
              <Button variant="ghost" onClick={onEditDate} data-testid="edit-datetime">
                Edit date
              </Button>
            )}
          </>
        )}
      </div>

      <p className="mt-1 text-sm text-fg-muted">
        <span data-testid="game-day-player-count">{playerCount} players</span> · {rounds} rounds ·{' '}
        {recorded} / {total} recorded
      </p>

      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
          {live && (
            <label
              className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted"
              data-testid="hide-from-home-label"
            >
              <input
                type="checkbox"
                checked={session.hidden}
                onChange={(e) => onToggleHidden(e.target.checked)}
                disabled={busy.hidden}
                data-testid="hide-from-home"
                className="h-4 w-4 rounded border-line bg-surface text-accent focus:ring-1 focus:ring-accent"
              />
              Don&apos;t show on home page
            </label>
          )}
          {live ? (
            <span className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={onFinish}
                disabled={busy.status || outstanding > 0}
                data-testid="finish-session"
              >
                Finish game day
              </Button>
              {outstanding > 0 && (
                <span className="text-xs text-fg-subtle" data-testid="finish-hint">
                  {outstanding} match{outstanding === 1 ? '' : 'es'} still need a score
                </span>
              )}
            </span>
          ) : (
            <Button variant="ghost" onClick={onReopen} disabled={busy.status} data-testid="reopen-session">
              Reopen
            </Button>
          )}
          {confirmingDelete ? (
            <>
              <Button variant="danger" onClick={onConfirmDelete} disabled={busy.del} data-testid="confirm-delete-game-day">
                Confirm delete
              </Button>
              <Button variant="ghost" onClick={onCancelDelete} data-testid="cancel-delete-game-day">
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={onAskDelete} data-testid="delete-game-day">
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ---- Tabs -----------------------------------------------------------------

const TABS: { id: Tab; label: string; icon: 'schedule' | 'ranking' | 'target' }[] = [
  { id: 'schedule', label: 'Schedule', icon: 'schedule' },
  { id: 'points', label: 'Points', icon: 'ranking' },
  { id: 'score', label: 'Score', icon: 'target' },
]

/**
 * Sticky, centered tab bar. At rest it sits flush under the session summary
 * (shared border → the two read as one component); on scroll it pins just below
 * the top nav (top-14) while the tab content scrolls beneath it.
 */
function Tabs({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="sticky top-14 z-[9] rounded-b-xl border border-t-0 border-line bg-surface/95 px-2 py-2 shadow-sm backdrop-blur">
      <div
        role="tablist"
        aria-label="Game day views"
        className="mx-auto flex max-w-md items-center justify-center gap-1 text-sm"
      >
        {TABS.map((t) => {
          const on = active === t.id
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={on}
              onClick={() => onChange(t.id)}
              data-testid={`tab-${t.id}`}
              className={cx(
                'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-medium transition-colors',
                on
                  ? 'bg-accent/15 text-accent-strong'
                  : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
              )}
            >
              <Icon name={t.icon} className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---- Schedule tab (read-only matchups + odds/result) ----------------------

function ScheduleTab({
  rounds,
  sessionPlayers,
  nameOf,
  skillOf,
}: {
  rounds: RoundGroup[]
  sessionPlayers: PresentPlayer[]
  nameOf: (id: string | null) => string
  skillOf: SkillOf
}) {
  return (
    <div className="space-y-4" data-testid="schedule-tab">
      {rounds.map(({ round, results }) => {
        const resting = restingInRound(sessionPlayers, results)
        return (
          <Card key={round} title={`Round ${round}`} icon={<Icon name="shuttle" />}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {results.map((r) => (
                <MatchCard key={r.id} result={r} nameOf={nameOf} skillOf={skillOf} />
              ))}
            </div>
            {resting.length > 0 && (
              <p className="mt-3 text-xs text-fg-muted">
                <span className="font-medium text-fg-subtle">Resting:</span>{' '}
                {resting.map((p) => p.nickname).join(', ')}
              </p>
            )}
          </Card>
        )
      })}
    </div>
  )
}

/** Read-only matchup: names, then the odds bar (undecided) or the score +
 *  per-match points (decided). */
function MatchCard({
  result,
  nameOf,
  skillOf,
}: {
  result: MatchResult
  nameOf: (id: string | null) => string
  skillOf: SkillOf
}) {
  const info = useMatchInfo(result, skillOf)
  const decided = result.winner !== null
  const aWon = result.winner === 'a'
  const bWon = result.winner === 'b'
  return (
    <div className="rounded-lg border border-line bg-surface-muted px-3 py-2.5 text-sm" data-testid={`schedule-${result.id}`}>
      <div className="mb-1.5 flex items-center justify-between text-xs uppercase tracking-wide text-fg-subtle">
        <span>Court {result.court}</span>
      </div>
      <TeamLine ids={result.teamA} nameOf={nameOf} won={aWon} score={decided ? result.scoreA : undefined} points={info?.side === 'a' ? info : undefined} />
      {decided ? (
        <div className="my-1 text-center text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
          {info?.upset ? 'Upset' : 'Result'}
        </div>
      ) : info?.odds ? (
        <OddsBar odds={info.odds} />
      ) : (
        <div className="my-1 text-center text-xs text-fg-muted">vs</div>
      )}
      <TeamLine ids={result.teamB} nameOf={nameOf} won={bWon} score={decided ? result.scoreB : undefined} points={info?.side === 'b' ? info : undefined} />
    </div>
  )
}

function TeamLine({
  ids,
  nameOf,
  won,
  score,
  points,
}: {
  ids: [string | null, string | null]
  nameOf: (id: string | null) => string
  won: boolean
  score?: number | null
  points?: { winnerPoints: number } | undefined
}) {
  return (
    <div className={cx('flex items-center gap-2', won ? 'font-semibold text-accent-strong' : 'text-fg')}>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block break-words">{nameOf(ids[0])}</span>
        <span className="block break-words">{nameOf(ids[1])}</span>
      </span>
      {points && <PointSwing value={won ? points.winnerPoints : -points.winnerPoints} />}
      {score != null && <span className="shrink-0 font-display font-bold tabular-nums text-fg">{score}</span>}
    </div>
  )
}

// ---- Points tab -----------------------------------------------------------

function PointsTab({
  standings,
}: {
  standings: { playerId: string; name: string; wins: number; played: number; diff: number }[]
}) {
  return (
    <Card title="Points table" icon={<Icon name="ranking" />}>
      {standings.length === 0 ? (
        <p className="text-sm text-fg-muted">Standings appear once matches are scored.</p>
      ) : (
        <table className="w-full text-sm" data-testid="points-table">
          <thead>
            <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
              <th className="w-12 py-2 font-medium">Rank</th>
              <th className="py-2 font-medium">Player</th>
              <th className="py-2 text-right font-medium">W–L</th>
              <th className="py-2 text-right font-medium" title="Net point differential">
                +/-
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {standings.map((s, i) => (
              <tr key={s.playerId} data-testid={`points-${s.playerId}`}>
                <td className="py-2.5">
                  <span
                    className={cx(
                      'grid h-6 w-6 place-items-center rounded-full font-display text-xs',
                      i === 0 ? 'bg-accent/15 font-bold text-accent-strong' : 'font-medium text-fg-subtle',
                    )}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="py-2.5 font-medium text-fg">
                  <Link to={`/players/${s.playerId}`} className="hover:text-accent-strong hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="py-2.5 text-right tabular-nums text-fg-muted">
                  {s.wins}–{s.played - s.wins}
                </td>
                <td
                  className={cx(
                    'py-2.5 text-right font-display font-bold tabular-nums',
                    s.diff > 0 ? 'text-accent-strong' : s.diff < 0 ? 'text-fg-subtle' : 'text-fg',
                  )}
                >
                  {s.diff > 0 ? `+${s.diff}` : s.diff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

// ---- Odds / per-match points ----------------------------------------------

/** Derive the favoured odds (undecided) or the per-match point swing (decided)
 *  for a court from its four players' effective skills. Null when any is unknown. */
interface MatchInfo {
  odds: MatchOdds | null
  /** Side that won, when decided. */
  side: Side | null
  /** Magnitude of the winner's point swing (loser drops the same), when decided. */
  winnerPoints: number
  /** The underdog won. */
  upset: boolean
}

function useMatchInfo(result: MatchResult, skillOf: SkillOf): MatchInfo | null {
  return useMemo(() => {
    const sa = [skillOf(result.teamA[0]), skillOf(result.teamA[1])]
    const sb = [skillOf(result.teamB[0]), skillOf(result.teamB[1])]
    if ([...sa, ...sb].some((s) => s == null)) return null
    const teamA = (sa[0]! + sa[1]!) / 2
    const teamB = (sb[0]! + sb[1]!) / 2
    if (result.winner === null) {
      return { odds: matchOdds(teamA, teamB), side: null, winnerPoints: 0, upset: false }
    }
    const side = result.winner === 'b' ? 'b' : 'a'
    const winnerSkill = side === 'a' ? teamA : teamB
    const loserSkill = side === 'a' ? teamB : teamA
    return {
      odds: null,
      side,
      winnerPoints: matchPoints(winnerSkill, loserSkill),
      upset: winnerSkill < loserSkill,
    }
  }, [result.teamA, result.teamB, result.winner, skillOf])
}

/** Signed per-match point swing pill (green up / red down). */
function PointSwing({ value }: { value: number }) {
  const r = Math.round(value * 10) / 10
  const positive = r >= 0
  return (
    <span
      className={cx(
        'shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        positive ? 'bg-accent/15 text-accent-strong' : 'bg-negative/15 text-negative',
      )}
      title="Indicative ranking points from this match (settles when the game day finishes)"
      data-testid="point-swing"
    >
      {positive ? '+' : ''}
      {r.toFixed(1)}
    </span>
  )
}

/** A compact accent tag marking the favoured team's row. */
function FavouredTag() {
  return (
    <span
      className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-strong"
      data-testid="favoured-tag"
    >
      <svg aria-hidden viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor">
        <path d="M6 1.5 11 10H1z" />
      </svg>
      Favoured
    </span>
  )
}

/**
 * Favoured-to-win meter: a single bar filling from the favourite's side (team A
 * = left, team B = right) in accent green, the underdog side faint, each team's
 * win % anchored to its end. The green mass sits on the favourite.
 */
function OddsBar({ odds }: { odds: MatchOdds }) {
  const pctA = Math.round(odds.probA * 100)
  const pctB = 100 - pctA
  const aFav = odds.favoured === 'a'
  const bFav = odds.favoured === 'b'
  return (
    <div className="px-0.5 py-1" data-testid="odds-bar" aria-label={`Win odds ${pctA}% vs ${pctB}%`}>
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold tabular-nums">
        <span className={aFav ? 'text-accent-strong' : 'text-fg-subtle'}>{pctA}%</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
          {odds.favoured === null ? 'Even match' : 'Favoured to win'}
        </span>
        <span className={bFav ? 'text-accent-strong' : 'text-fg-subtle'}>{pctB}%</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className={cx('h-full', aFav ? 'bg-accent' : 'bg-fg-subtle/30')} style={{ width: `${pctA}%` }} />
        <div className="w-px shrink-0 bg-surface" />
        <div className={cx('h-full flex-1', bFav ? 'bg-accent' : 'bg-fg-subtle/30')} />
      </div>
    </div>
  )
}

// ---- Score tab: editable court card ---------------------------------------

function CourtScore({
  result,
  nameOf,
  skillOf,
  present,
  editable,
  saving,
  editing,
  deleting,
  onSave,
  onSaveLineup,
  onDelete,
}: {
  result: MatchResult
  nameOf: (id: string | null) => string
  skillOf: SkillOf
  present: PresentPlayer[]
  editable: boolean
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

  const info = useMatchInfo(result, skillOf)
  const decided = result.winner !== null

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
    const favoured = !decided && info?.odds?.favoured === side
    const value = side === 'a' ? a : b
    const set = side === 'a' ? setA : setB
    const score = side === 'a' ? result.scoreA : result.scoreB
    return (
      <div
        className={cx(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
          won
            ? 'border-accent bg-accent/15 font-semibold text-fg'
            : favoured
              ? 'border-accent/40 bg-surface-muted text-fg'
              : 'border-line bg-surface-muted text-fg',
        )}
      >
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block break-words">{nameOf(ids[0])}</span>
          <span className="block break-words">{nameOf(ids[1])}</span>
          {favoured && <FavouredTag />}
        </span>
        {won && <span aria-label="winner">✓</span>}
        {decided && info?.side && <PointSwing value={won ? info.winnerPoints : -info.winnerPoints} />}
        {editable ? (
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={value}
            onChange={(e) => set(e.target.value)}
            className="w-14 rounded-md border border-line bg-surface px-2 py-1 text-right text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            data-testid={`score-${result.id}-${side}`}
            aria-label={`Score for ${side === 'a' ? 'team A' : 'team B'}`}
          />
        ) : (
          <span className="w-8 shrink-0 text-right font-display font-bold tabular-nums text-fg">
            {score ?? '–'}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2" data-testid={`court-${result.id}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-fg-subtle">Court {result.court}</span>
        {editable && mode === 'score' && (
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
            {!decided && info?.odds ? (
              <OddsBar odds={info.odds} />
            ) : (
              <div className="text-center text-xs text-fg-muted">
                {decided ? (info?.upset ? 'Upset' : 'Result') : 'vs'}
              </div>
            )}
            {teamRow('b', result.teamB)}
          </div>
          {error && (
            <p className="mt-2 text-xs text-negative" data-testid={`score-error-${result.id}`}>
              {error}
            </p>
          )}
          {editable && (
            <div className="mt-2 space-y-2">
              <Button
                className="w-full"
                variant="secondary"
                onClick={save}
                loading={saving}
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
          loading={saving}
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

/** Add an ad-hoc match: pick a round, then four players not already in it. */
function AddCustomMatch({
  present,
  results,
  saving,
  onAdd,
}: {
  present: PresentPlayer[]
  results: MatchResult[]
  saving: boolean
  onAdd: (round: number, players: [string, string, string, string]) => void
}) {
  const existingRounds = useMemo(
    () => [...new Set(results.map((r) => r.round))].sort((a, b) => a - b),
    [results],
  )
  const lastRound = existingRounds.at(-1) ?? 1
  const roundOptions = existingRounds.length ? [...existingRounds, lastRound + 1] : [1]

  const [open, setOpen] = useState(false)
  const [round, setRound] = useState(lastRound)
  const [slots, setSlots] = useState<[string, string, string, string]>(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)

  const bookedInRound = useMemo(() => {
    const ids = new Set<string>()
    for (const r of results) {
      if (r.round !== round) continue
      for (const id of [...r.teamA, ...r.teamB]) if (id) ids.add(id)
    }
    return ids
  }, [results, round])
  const eligible = present.filter((p) => !bookedInRound.has(p.id))

  const setSlot = (i: number, value: string) =>
    setSlots((prev) => {
      const next = [...prev] as [string, string, string, string]
      next[i] = value
      return next
    })

  const changeRound = (value: number) => {
    setRound(value)
    setSlots(['', '', '', ''])
    setError(null)
  }

  const add = () => {
    const v = validateLineup(slots)
    if (!v.ok) {
      setError(v.error ?? 'Invalid line-up')
      return
    }
    if (slots.some((id) => bookedInRound.has(id))) {
      setError('That player is already playing this round.')
      return
    }
    setError(null)
    onAdd(round, slots)
    setSlots(['', '', '', ''])
    setRound(lastRound)
    setOpen(false)
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)} data-testid="add-custom-match">
        + Add custom match
      </Button>
    )
  }

  return (
    <Card title="Add custom match" icon={<Icon name="add" />}>
      <div className="space-y-2" data-testid="custom-match-form">
        <label className="block text-sm">
          <span className="mb-1 block text-fg-muted">Round</span>
          <select
            value={round}
            onChange={(e) => changeRound(Number(e.target.value))}
            data-testid="custom-round"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-fg"
          >
            {roundOptions.map((r) => (
              <option key={r} value={r}>
                {existingRounds.includes(r) ? `Round ${r}` : `New round ${r}`}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(['a1', 'a2', 'b1', 'b2'] as const).map((label, i) => (
            <PlayerSelect
              key={label}
              present={eligible}
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
          <Button variant="secondary" onClick={add} disabled={saving} data-testid="save-custom-match">
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

/** Present players not assigned to any court in the round's results. */
function restingInRound(present: PresentPlayer[], results: MatchResult[]): PresentPlayer[] {
  const booked = new Set<string>()
  for (const r of results) {
    for (const id of [...r.teamA, ...r.teamB]) if (id) booked.add(id)
  }
  return present.filter((p) => !booked.has(p.id))
}

/** The next free court in a given round (court 1 if the round is empty). */
function nextCourtInRound(results: MatchResult[], round: number): number {
  const inRound = results.filter((r) => r.round === round)
  return inRound.length === 0 ? 1 : Math.max(...inRound.map((r) => r.court)) + 1
}

const recordedCount = (results: MatchResult[]) =>
  results.filter((r) => r.winner !== null).length
