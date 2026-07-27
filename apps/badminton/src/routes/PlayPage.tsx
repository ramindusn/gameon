import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  useSessionRealtime,
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
import {
  effectiveSkill,
  isEvenMatch,
  matchOdds,
  matchPoints,
  MATCH_POINTS_K,
  type MatchOdds,
} from '../ranking/effectiveSkill'
import { buildGameDayBoard, type GameDayResultRow } from '../ranking/api'
import { POINTS_DOT, POINTS_PILL, POINTS_TEXT, RANK_TEXT } from '../ranking/metricColors'
import type { MatchResult, MatchSession, Side } from '../play/api'

/** A roster player reduced to what the live editors need. */
interface PresentPlayer {
  id: string
  nickname: string
}

type Tab = 'matches' | 'points'
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
  // Live updates: every viewer (players + matchmaker) sees scores/standings
  // refresh the moment the matchmaker saves, no manual reload.
  useSessionRealtime(id)
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

  const [tab, setTab] = useState<Tab>('matches')
  const [roundIdx, setRoundIdx] = useState(0)
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

  // Which rounds are fully scored — drives the pager's progress dots.
  const roundsDone = useMemo(
    () => rounds.map((g) => g.results.every((r) => r.winner !== null)),
    [rounds],
  )

  // On first load, open the first round that still has an unscored match (the
  // one being played) instead of always Round 1. Runs once so it never fights
  // the user's own paging afterwards.
  const autoOpened = useRef(false)
  useEffect(() => {
    if (autoOpened.current || rounds.length === 0) return
    autoOpened.current = true
    const firstUnfinished = roundsDone.findIndex((done) => !done)
    setRoundIdx(firstUnfinished === -1 ? rounds.length - 1 : firstUnfinished)
  }, [rounds, roundsDone])

  // A game day can only be finished once every match is resolved (scored) or
  // deleted. An unscored match has no derived winner.
  const outstanding = useMemo(
    () => (data?.results ?? []).filter((r) => r.winner === null),
    [data],
  )

  // Ranking points earned so far this game day: the per-match indicative swing
  // (matchPoints) summed per player — winners gain, losers drop the same. This
  // mirrors the +/- pills on the court cards. Keyed by player id.
  const rankingPoints = useMemo(() => {
    const pts: Record<string, number> = {}
    const add = (id: string | null, v: number) => {
      if (id) pts[id] = (pts[id] ?? 0) + v
    }
    for (const r of data?.results ?? []) {
      if (r.winner === null) continue
      const sa = [skillOf(r.teamA[0]), skillOf(r.teamA[1])]
      const sb = [skillOf(r.teamB[0]), skillOf(r.teamB[1])]
      if ([...sa, ...sb].some((s) => s == null)) continue
      const teamA = (sa[0]! + sa[1]!) / 2
      const teamB = (sb[0]! + sb[1]!) / 2
      const aWon = r.winner === 'a'
      const winnerSkill = aWon ? teamA : teamB
      const loserSkill = aWon ? teamB : teamA
      const swing = isEvenMatch(teamA, teamB) ? MATCH_POINTS_K / 2 : matchPoints(winnerSkill, loserSkill)
      const [winners, losers] = aWon ? [r.teamA, r.teamB] : [r.teamB, r.teamA]
      winners.forEach((id) => add(id, swing))
      losers.forEach((id) => add(id, -swing))
    }
    return pts
  }, [data, skillOf])

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
      .map((s) => ({ ...s, name: nameOf(s.playerId), ranking: rankingPoints[s.playerId] ?? 0 }))
      .sort((a, b) => b.diff - a.diff || a.name.localeCompare(b.name))
  }, [data, nameOf, rankingPoints])

  const live = data?.session.status === 'live'

  // Share a finished game day's results to the club chat: native share sheet on
  // phones (WhatsApp etc.), wa.me fallback on desktop.
  const shareResults = () => {
    if (!data || standings.length === 0) return
    const medals = ['🥇', '🥈', '🥉']
    const lines = standings.map((s, i) => {
      const tag = medals[i] ?? `${i + 1}.`
      const pts = s.diff > 0 ? `+${s.diff}` : `${s.diff}`
      return `${tag} ${s.name}  ${s.wins}–${s.played - s.wins}  (${pts})`
    })
    const text = [
      `🏸 BadmintonDuo — ${formatPlayedAt(data.session.playedAt)}`,
      '',
      ...lines,
      '',
      `Full results: ${window.location.origin}/game-days/${data.session.id}`,
    ].join('\n')
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    }
  }

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
              onShare={!live && standings.length > 0 ? shareResults : undefined}
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

            {/* One combined panel: sticky header (tabs + round pager) with the
                tab content attached below — not three separate cards. */}
            {(() => {
              const idx = Math.min(roundIdx, Math.max(0, rounds.length - 1))
              const current = rounds[idx]
              const resting = current ? restingInRound(sessionPlayers, current.results) : []
              return (
                <div className="rounded-xl border border-line bg-surface" data-testid="game-day-panel">
                  {/* Divider lives on the sticky header (not the content) so the
                      seam stays a single crisp hairline while pinned. */}
                  <div className="sticky top-14 z-[9] rounded-t-xl border-b border-line bg-surface/95 px-2 pb-2 pt-2 shadow-sm backdrop-blur">
                    <Tabs active={tab} onChange={setTab} />
                    {tab === 'matches' && current && (
                      <RoundPager
                        round={current.round}
                        index={idx}
                        total={rounds.length}
                        done={roundsDone}
                        onPrev={() => setRoundIdx(Math.max(0, idx - 1))}
                        onNext={() => setRoundIdx(Math.min(rounds.length - 1, idx + 1))}
                      />
                    )}
                  </div>

                  <div className="px-3 py-3 sm:px-4">
                    <MetricKey />
                    {tab === 'points' && <PointsTab standings={standings} />}

                    {/* Matches = one round at a time. Same court card for everyone;
                        matchmakers edit inline, players view read-only. */}
                    {tab === 'matches' && (
                      <div className="space-y-3" data-testid="matches-tab">
                        {!current ? (
                          <p className="text-sm text-fg-muted">No matches yet.</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                              {current.results.map((r) => (
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
                              <p className="text-xs text-fg-muted" data-testid={`resting-${current.round}`}>
                                <span className="font-medium text-fg-subtle">Resting:</span>{' '}
                                {resting.map((p) => p.nickname).join(', ')}
                              </p>
                            )}
                          </>
                        )}

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
              )
            })()}
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
  onShare,
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
  /** Present once the game day is finished with results — shows the Share action. */
  onShare?: () => void
}) {
  const live = session.status === 'live'
  return (
    <div className="mb-4 rounded-xl border border-line bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-fg">
          <Icon
            name={session.kind === 'tournament' ? 'tournament' : 'shuttle'}
            className={cx('h-4 w-4', POINTS_TEXT)}
          />
          {session.kind === 'tournament'
            ? 'Tournament · Fixed pairs'
            : `Game day · ${session.mode === 'mixed' ? 'Mixed doubles' : 'Doubles'}`}
        </h2>
        <span className="flex shrink-0 items-center gap-2">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              data-testid="share-results"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent-strong transition-colors hover:bg-accent/25"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
                <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
              </svg>
              Share
            </button>
          )}
          <span
            className={cx(
              'rounded-full px-2.5 py-1 text-xs font-medium',
              live ? POINTS_PILL : 'bg-surface-muted text-fg-muted',
            )}
            data-testid="session-status"
          >
            {live ? 'Live' : 'Finished'}
          </span>
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

const TABS: { id: Tab; label: string; icon: 'shuttle' | 'ranking' }[] = [
  { id: 'matches', label: 'Matches', icon: 'shuttle' },
  { id: 'points', label: 'Standings', icon: 'ranking' },
]

/**
 * Centered tab row. Chrome (border, sticky pinning) comes from the combined
 * panel header that hosts it together with the round pager.
 */
function Tabs({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="px-1">
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
                on ? POINTS_PILL : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
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

/** The two point metrics, defined once at the top of the panel — the coloured
 *  terms themselves carry the colour language used in the tables/cards. */
function MetricKey() {
  return (
    <div
      className="mb-3 space-y-1 rounded-lg bg-surface-muted/40 px-3 py-2 text-xs text-fg-muted"
      data-testid="metric-key"
    >
      <p className="flex items-baseline gap-2">
        <span className={cx('w-14 shrink-0 font-semibold', POINTS_TEXT)}>Points</span>
        <span>match points won in this game day</span>
      </p>
      <p className="flex items-baseline gap-2">
        <span className={cx('w-14 shrink-0 font-semibold', RANK_TEXT)}>Ranking</span>
        <span>counts toward the leaderboard — beating a stronger team earns more</span>
      </p>
    </div>
  )
}

// ---- Points tab -----------------------------------------------------------

function PointsTab({
  standings,
}: {
  standings: {
    playerId: string
    name: string
    wins: number
    played: number
    diff: number
    ranking: number
  }[]
}) {
  const fmtSigned = (n: number) => (n > 0 ? `+${n}` : `${n}`)
  const fmtRank = (n: number) => {
    const r = Math.round(n * 10) / 10
    return r > 0 ? `+${r.toFixed(1)}` : r.toFixed(1)
  }
  return (
    <div>
      {standings.length === 0 ? (
        <p className="text-sm text-fg-muted">Standings appear once matches are scored.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="points-table">
              <thead>
                <tr className="border-b border-line text-right text-[11px] font-semibold">
                  <th className="w-8 py-2 text-left font-medium text-fg-subtle">#</th>
                  <th className="py-2 text-left font-medium text-fg-subtle">Player</th>
                  <th className="py-2 font-medium text-fg-subtle">Won–Lost</th>
                  <th className={cx('py-2 font-medium', POINTS_TEXT)}>Points</th>
                  <th className={cx('py-2 font-medium', RANK_TEXT)}>Ranking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {standings.map((s, i) => (
                  <tr key={s.playerId} data-testid={`points-${s.playerId}`} className="text-right">
                    <td className="py-2.5 text-left">
                      <span
                        className={cx(
                          'grid h-6 w-6 place-items-center rounded-full font-display text-xs',
                          i === 0 ? cx('font-bold', POINTS_PILL) : 'font-medium text-fg-subtle',
                        )}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-2.5 text-left font-medium text-fg">
                      <Link to={`/players/${s.playerId}`} className="hover:text-accent-strong hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="py-2.5 tabular-nums text-fg-muted">
                      {s.wins}–{s.played - s.wins}
                    </td>
                    <td className={cx('py-2.5 font-display font-bold tabular-nums', POINTS_TEXT)}>
                      {fmtSigned(s.diff)}
                    </td>
                    <td
                      className={cx(
                        'py-2.5 font-display font-bold tabular-nums',
                        s.ranking > 0 ? RANK_TEXT : s.ranking < 0 ? 'text-negative' : 'text-fg-muted',
                      )}
                    >
                      {fmtRank(s.ranking)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
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
    // An even (rounds-to-50/50) match is a toss-up: whoever wins gains the same
    // baseline points, and it's never framed as an "upset".
    const even = isEvenMatch(teamA, teamB)
    return {
      odds: null,
      side,
      winnerPoints: even ? MATCH_POINTS_K / 2 : matchPoints(winnerSkill, loserSkill),
      upset: !even && winnerSkill < loserSkill,
    }
  }, [result.teamA, result.teamB, result.winner, skillOf])
}

/** Arrow pager to step through rounds one at a time (‹ Round 2 of 5 ›), with a
 *  progress dot per round — filled green once that round is fully scored. */
function RoundPager({
  round,
  index,
  total,
  done,
  onPrev,
  onNext,
}: {
  round: number
  index: number
  total: number
  /** done[i] = round i has every match scored. */
  done: boolean[]
  onPrev: () => void
  onNext: () => void
}) {
  const arrow = cx(
    'grid h-8 w-8 place-items-center rounded-full text-xl font-bold leading-none transition-colors hover:bg-sky-400/15 disabled:text-fg-subtle disabled:opacity-40 disabled:hover:bg-transparent',
    POINTS_TEXT,
  )
  return (
    <div className="mt-2 flex items-center justify-between rounded-lg bg-surface-muted px-2 py-1.5">
      <button type="button" onClick={onPrev} disabled={index === 0} aria-label="Previous round" className={arrow}>
        ‹
      </button>
      <span className="flex flex-col items-center gap-1">
        <span className="font-display text-sm font-semibold text-fg" data-testid="round-label">
          Round {round} <span className="font-normal text-fg-subtle">of {total}</span>
        </span>
        {/* Colour = progress only (game-day blue when the round is fully
            scored); the round being viewed is marked by a ring, so the two
            never mix. */}
        <span className="flex items-center gap-1.5" aria-hidden data-testid="round-dots">
          {done.map((d, i) => (
            <span
              key={i}
              className={cx(
                'h-1.5 w-1.5 rounded-full transition-all',
                d ? POINTS_DOT : 'bg-fg-subtle/40',
                i === index && 'ring-2 ring-fg-subtle/50 ring-offset-2 ring-offset-surface-muted',
              )}
            />
          ))}
        </span>
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={index === total - 1}
        aria-label="Next round"
        className={arrow}
      >
        ›
      </button>
    </div>
  )
}

/**
 * Win-predictor bar under the two side-by-side teams: the left team (A) fills
 * from the left, the right team (B) from the right — so the mapping is obvious.
 * Favourite's side solid accent; both faint accent when even.
 */
function Predictor({ pctA, favoured }: { pctA: number; favoured: 'a' | 'b' | null }) {
  const even = favoured === null
  return (
    <div
      className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface-muted"
      data-testid="odds-bar"
      aria-label={`Win prediction ${pctA}% versus ${100 - pctA}%`}
    >
      <div
        className={cx('h-full', favoured === 'a' ? 'bg-accent' : even ? 'bg-accent/40' : 'bg-fg-subtle/30')}
        style={{ width: `${pctA}%` }}
      />
      <div className="w-px shrink-0 bg-surface" />
      <div className={cx('h-full flex-1', favoured === 'b' ? 'bg-accent' : even ? 'bg-accent/40' : 'bg-fg-subtle/30')} />
    </div>
  )
}

/** One team column in a court card: its two players stacked, plus its win % (or
 *  match points once decided) beneath. Aligned left or right for a mirrored pair. */
function TeamCol({
  ids,
  nameOf,
  align,
  won,
  favoured,
  pct,
  pts,
}: {
  ids: [string | null, string | null]
  nameOf: (id: string | null) => string
  align: 'left' | 'right'
  won: boolean
  favoured: boolean
  pct: number | null
  /** Signed match points won/lost by this team once decided (game-day Points). */
  pts: number | null
}) {
  return (
    <div className={cx('min-w-0', align === 'right' && 'text-right')}>
      <p className={cx('leading-tight', won ? cx('font-semibold', POINTS_TEXT) : 'text-fg')}>
        <span className="block break-words">{nameOf(ids[0])}</span>
        <span className="block break-words">{nameOf(ids[1])}</span>
      </p>
      {pct != null && (
        <span
          className={cx(
            'mt-1 inline-block text-[11px] font-semibold tabular-nums',
            favoured ? 'text-accent-strong' : 'text-fg-subtle',
          )}
          data-testid="win-pct"
        >
          {pct}%
        </span>
      )}
      {pts != null && (
        <span className={cx('mt-1 flex', align === 'right' ? 'justify-end' : 'justify-start')}>
          <span
            className={cx(
              'shrink-0 rounded bg-sky-400/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
              POINTS_TEXT,
            )}
            title="Match points won/lost — counted in this game day's Points"
            data-testid="match-points"
          >
            {pts > 0 ? '+' : ''}
            {pts}
          </span>
        </span>
      )}
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

  const aWon = result.winner === 'a'
  const bWon = result.winner === 'b'
  const favoured = info?.odds?.favoured ?? null
  const pctA = !decided && info?.odds ? Math.round(info.odds.probA * 100) : null
  // Game-day match points for a decided court: the winner gains the score
  // margin, the loser drops it — the same currency as the Standings' Points.
  const margin =
    decided && result.scoreA != null && result.scoreB != null
      ? Math.abs(result.scoreA - result.scoreB)
      : null
  const ptsOf = (won: boolean) => (margin != null ? (won ? margin : -margin) : null)
  const scoreInput = (side: Side) => (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      value={side === 'a' ? a : b}
      onChange={(e) => (side === 'a' ? setA : setB)(e.target.value)}
      className="w-11 rounded-md border border-line bg-surface px-1.5 py-1 text-center text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      data-testid={`score-${result.id}-${side}`}
      aria-label={`Score for ${side === 'a' ? 'team A' : 'team B'}`}
    />
  )

  return (
    // Slightly tinted vs the hosting panel so the court reads as a section, not
    // another nested card of the same colour.
    <div
      className="rounded-lg border border-line/70 bg-surface-muted/40 px-3 py-3"
      data-testid={`court-${result.id}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-fg-subtle">
          Court {result.court}
          {decided && (
            <span className="text-accent-strong" aria-label="scored">
              ✓
            </span>
          )}
        </span>
        {editable && mode === 'score' && (
          <span className="flex items-center gap-3 text-xs font-medium">
            {/* Delete is a rare action: a small header control (two-step), not a
                full-width button eating a row on every card. */}
            {confirmingDelete ? (
              <>
                <button
                  type="button"
                  className="text-negative hover:underline disabled:opacity-50"
                  onClick={onDelete}
                  disabled={deleting}
                  data-testid={`confirm-delete-match-${result.id}`}
                >
                  Delete?
                </button>
                <button
                  type="button"
                  className="text-fg-muted hover:underline"
                  onClick={() => setConfirmingDelete(false)}
                  data-testid={`cancel-delete-match-${result.id}`}
                >
                  Keep
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-fg-subtle hover:text-negative hover:underline"
                onClick={() => setConfirmingDelete(true)}
                data-testid={`delete-match-${result.id}`}
              >
                Delete
              </button>
            )}
            <button
              type="button"
              className="text-accent-strong hover:underline"
              onClick={() => setMode('edit')}
              data-testid={`edit-lineup-${result.id}`}
            >
              Edit line-up
            </button>
          </span>
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
          {/* Teams side by side (left vs right); score/inputs in the middle. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-sm">
            <TeamCol
              ids={result.teamA}
              nameOf={nameOf}
              align="left"
              won={aWon}
              favoured={favoured === 'a'}
              pct={pctA}
              pts={ptsOf(aWon)}
            />
            <div className="flex flex-col items-center gap-1 pt-0.5">
              {editable ? (
                <div className="flex items-center gap-1">
                  {scoreInput('a')}
                  <span className="text-fg-subtle">–</span>
                  {scoreInput('b')}
                </div>
              ) : decided ? (
                <span className="font-display text-base font-bold tabular-nums text-fg">
                  {result.scoreA} <span className="text-fg-subtle">–</span> {result.scoreB}
                </span>
              ) : (
                <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">vs</span>
              )}
            </div>
            <TeamCol
              ids={result.teamB}
              nameOf={nameOf}
              align="right"
              won={bWon}
              favoured={favoured === 'b'}
              pct={pctA != null ? 100 - pctA : null}
              pts={ptsOf(bWon)}
            />
          </div>
          {!decided && info?.odds && <Predictor pctA={pctA ?? 50} favoured={favoured} />}
          {decided && info?.upset && (
            <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-accent-strong">
              Upset
            </div>
          )}
          {error && (
            <p className="mt-2 text-xs text-negative" data-testid={`score-error-${result.id}`}>
              {error}
            </p>
          )}
          {editable && (
            <div className="mt-2.5">
              <Button
                className="w-full"
                variant="secondary"
                onClick={save}
                loading={saving}
                data-testid={`save-score-${result.id}`}
              >
                {result.winner ? 'Update score' : 'Save score'}
              </Button>
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
