import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, cx, Field } from '@gameon/ui'
import {
  generateRounds,
  roundRobin,
  type GeneratedMatches,
  type MatchPlayer,
} from '@gameon/domain'
import { AppShell } from '../app/AppShell'
import { Icon } from '../app/Icon'
import { useRoster } from '../roster/useRoster'
import { usePlayerBoard, usePlayerAttendance } from '../ranking/useRanking'
import { RECENT_ABSENCE_LIMIT, type PlayerAttendance } from '../ranking/api'
import { effectiveSkill } from '../ranking/effectiveSkill'
import { useCreateSession, useCreateTournamentWithMatches } from '../play/useMatchPlay'
import type { TournamentFixture } from '../play/api'
import { localInputToIso, nowLocalInput } from '../play/datetime'
import type { Player } from '../roster/api'

// Each player passed to the engine keeps its nickname (the engine only reads
// id/skill/gender), so generated teams can be rendered by name. Skill defaults
// to mid (5) when unset.
type Named = MatchPlayer & { nickname: string }

type Mode = 'open' | 'mixed'

// Matchmaker draw generator (E03 / TASK-4.2). Pick present players, choose the
// number of rounds + the format, and render the balanced rounds (courts +
// sitting). Generation is the pure @gameon/domain engine — no backend call.
export function GeneratePage() {
  const navigate = useNavigate()
  const { data, isLoading } = useRoster()
  // Recent attendance drives the picker's sort + default selection (TASK-64):
  // regulars first + pre-selected, frequent absentees at the bottom + unchecked.
  const attendance = usePlayerAttendance()
  const attendanceOf = (id: string): PlayerAttendance | undefined => attendance.data?.[id]
  // Only active players (not excluded from draws) are eligible for a game day,
  // so the picker lists exactly them — sorted by recent attendance once we have
  // it (otherwise roster order, e.g. before any game days exist).
  const active = useMemo<Player[]>(() => {
    const arr = (data?.players ?? []).filter((p) => !p.absent)
    const att = attendance.data
    if (!att || Object.keys(att).length === 0) return arr
    const away = (p: Player) => ((att[p.id]?.missStreak ?? 0) >= RECENT_ABSENCE_LIMIT ? 1 : 0)
    return arr.slice().sort(
      (a, b) =>
        away(a) - away(b) || // default-unchecked absentees sink to the bottom
        (att[b.id]?.attended ?? 0) - (att[a.id]?.attended ?? 0) || // then most-attended
        a.nickname.localeCompare(b.nickname),
    )
  }, [data, attendance.data])
  // Results-based strength per player (rating + games), used to blend the manual
  // skill into the effective skill the balancer sees (TASK-44).
  const board = usePlayerBoard()
  const strengthOf = useMemo(() => {
    const m = new Map((board.data ?? []).map((r) => [r.playerId, r]))
    return (id: string) => m.get(id)
  }, [board.data])
  const createSession = useCreateSession()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [initialised, setInitialised] = useState(false)
  // Kept as text so the field can be cleared/retyped freely; clamped on blur.
  const [roundsText, setRoundsText] = useState('5')
  const rounds = Math.max(1, Math.min(30, Number(roundsText) || 1))
  // Courts: defaults to the max the selection allows (floor(selected / 4)) and
  // follows it until the matchmaker edits the field; then their value is clamped.
  const [courtsText, setCourtsText] = useState('')
  const [courtsEdited, setCourtsEdited] = useState(false)
  const mode: Mode = 'open'
  const [result, setResult] = useState<GeneratedMatches | null>(null)
  const [generated, setGenerated] = useState(false)
  // When true, the fixed-pairs tournament lock-pairs panel is shown instead.
  const [tournamentSetup, setTournamentSetup] = useState(false)
  // Game-day date/time the matchmaker confirms on "Create game day" (default now).
  const [playedAt, setPlayedAt] = useState(nowLocalInput())

  // Default selection (once the roster + attendance have loaded): everyone
  // except players who missed the last RECENT_ABSENCE_LIMIT game days in a row,
  // so regulars are pre-selected (TASK-64). Absentees can still be ticked back.
  if (!initialised && active.length > 0 && !attendance.isLoading) {
    const defaults = active.filter(
      (p) => (attendanceOf(p.id)?.missStreak ?? 0) < RECENT_ABSENCE_LIMIT,
    )
    setSelected(new Set(defaults.map((p) => p.id)))
    setInitialised(true)
  }

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  function generate() {
    const present: Named[] = active
      .filter((p) => selected.has(p.id))
      .map((p) => {
        const r = strengthOf(p.id)
        return {
          id: p.id,
          nickname: p.nickname,
          // Balance by the results-aware skill (manual seed blended with rating).
          skill: effectiveSkill(p.skill, r?.rating, r?.games ?? 0),
          gender: p.gender,
        }
      })
    setResult(generateRounds(present, rounds, { mode, courts }))
    setGenerated(true)
  }

  const selectedPlayers = useMemo(
    () => active.filter((p) => selected.has(p.id)),
    [active, selected],
  )

  // Courts the current selection can fill, and the chosen (clamped) value. Until
  // the matchmaker edits the field, it tracks the auto max.
  const maxCourts = Math.max(1, Math.floor(selected.size / 4))
  const courtsValue = courtsEdited ? courtsText : String(maxCourts)
  const courts = Math.max(1, Math.min(maxCourts, Number(courtsValue) || maxCourts))

  return (
    <AppShell title="Generate draw">
      <div data-testid="generate">
        {/* The setup widget (player selection + the two actions) hides once an
            action is chosen; each result view has a Back button to return here. */}
        {!generated && !tournamentSetup && (
          <Card title="Setup" icon={<Icon name="generate" />}>
            {isLoading && <p className="text-sm text-fg-muted">Loading roster…</p>}
            {!isLoading && active.length === 0 && (
              <p className="text-sm text-fg-muted">
                No active players — add players (or unmark them as excluded) on the
                Players page.
              </p>
            )}

            {active.length > 0 && (
              <>
                <p className="mb-2 text-sm text-fg-muted">
                  Selected: {selected.size} / {active.length}
                </p>
                <p className="mb-2 text-xs text-fg-subtle">
                  The number is each player's results-aware skill (used to balance
                  the draw): their manual skill blended with how they've been
                  playing.
                </p>
                {/* One uniform grid, sorted by recent attendance (regulars
                    first, frequent absentees last). Absentees simply start
                    unchecked — no badge or label (TASK-64). */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {active.map((p) => {
                    const r = strengthOf(p.id)
                    const eff = effectiveSkill(p.skill, r?.rating, r?.games ?? 0)
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggle(p.id)}
                          data-testid={`present-${p.id}`}
                        />
                        <span className="min-w-0 flex-1 truncate text-fg">{p.nickname}</span>
                        <span
                          className="shrink-0 text-xs font-medium tabular-nums text-fg-subtle"
                          title={`Manual skill ${p.skill ?? '—'} · results-aware ${eff.toFixed(1)}`}
                        >
                          {eff.toFixed(1)}
                        </span>
                      </label>
                    )
                  })}
                </div>

                <div className="mt-5 space-y-3 border-t border-line pt-4">
                  <div className="flex flex-wrap gap-4">
                    <Field
                      inline
                      label="Rounds"
                      type="number"
                      min={1}
                      max={30}
                      inputMode="numeric"
                      value={roundsText}
                      onChange={(e) => setRoundsText(e.target.value)}
                      onBlur={() => setRoundsText(String(rounds))}
                      data-testid="rounds-input"
                    />
                    <Field
                      inline
                      label={
                        <>
                          Courts <span className="text-fg-subtle">(max {maxCourts})</span>
                        </>
                      }
                      type="number"
                      min={1}
                      max={maxCourts}
                      inputMode="numeric"
                      value={courtsValue}
                      onChange={(e) => {
                        setCourtsEdited(true)
                        setCourtsText(e.target.value)
                      }}
                      onBlur={() => {
                        setCourtsEdited(true)
                        setCourtsText(String(courts))
                      }}
                      data-testid="courts-input"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={generate}
                      disabled={selected.size < 4}
                      data-testid="generate-button"
                      className="w-full sm:w-auto"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="generate" className="h-4 w-4" />
                        Random doubles
                      </span>
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setTournamentSetup(true)}
                      disabled={selected.size < 4}
                      data-testid="new-tournament"
                      className="w-full sm:w-auto"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="tournament" className="h-4 w-4" />
                        New tournament
                      </span>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        )}

        {tournamentSetup && (
          <div className="mt-6">
            <BackToSetup onBack={() => setTournamentSetup(false)} />
            <TournamentSetup
              players={selectedPlayers}
              clubId={data?.clubId ?? null}
              playedAt={localInputToIso(playedAt)}
              passes={rounds}
              onCreated={(id) => navigate(`/play/${id}`)}
            />
          </div>
        )}

        {generated && (
          <div className="mt-6" data-testid="draw-result">
            <BackToSetup
              onBack={() => {
                setGenerated(false)
                setResult(null)
              }}
            />
            {!result ? (
              <Card title="Couldn't generate" icon={<Icon name="warning" />}>
                <p className="text-sm text-fg-muted">
                  Need at least 4 present players.
                </p>
              </Card>
            ) : (
              <Draw
                result={result}
                canStart={Boolean(data?.clubId)}
                starting={createSession.isPending}
                playedAt={playedAt}
                onPlayedAtChange={setPlayedAt}
                onStart={() =>
                  createSession.mutate(
                    {
                      clubId: data!.clubId as string,
                      plan: result,
                      mode,
                      playedAt: localInputToIso(playedAt),
                    },
                    { onSuccess: (id) => navigate(`/play/${id}`) },
                  )
                }
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function Draw({
  result,
  canStart,
  starting,
  playedAt,
  onPlayedAtChange,
  onStart,
}: {
  result: GeneratedMatches
  canStart: boolean
  starting: boolean
  playedAt: string
  onPlayedAtChange: (v: string) => void
  onStart: () => void
}) {
  const name = (p: MatchPlayer) => (p as Named).nickname ?? p.id
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-fg">
              <Icon name="calendar" className="h-4 w-4 text-accent" />
              Create game day
            </h2>
            <p className="text-sm text-fg-muted">
              {result.rounds.length} rounds · {result.courts} court
              {result.courts === 1 ? '' : 's'} · {result.totalPlayers} players
            </p>
          </div>
          {/* Our own left-aligned display with the native picker layered on top
              (transparent), so width + alignment are fully under our control and
              don't depend on the browser's native date-field rendering. */}
          <label className="relative block w-full sm:ml-auto sm:w-64">
            <span className="sr-only">Game day date and time</span>
            <span className="block w-full rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm text-fg">
              {formatLocalInput(playedAt)}
            </span>
            <input
              type="datetime-local"
              value={playedAt}
              onChange={(e) => onPlayedAtChange(e.target.value)}
              // The input is transparent, so its native calendar icon is hidden;
              // clicking only focuses it. Open the picker explicitly so a tap
              // anywhere on the field brings it up (no-op if unsupported).
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              data-testid="game-day-datetime"
            />
          </label>
          <Button
            onClick={onStart}
            disabled={!canStart}
            loading={starting}
            data-testid="create-game-day"
            className="w-full sm:w-auto"
          >
            {starting ? 'Creating…' : 'Create game day'}
          </Button>
        </div>
      </Card>
      {result.unplaceable.length > 0 && (
        <p className="text-sm text-warning">
          Not placed (no male/female set): {result.unplaceable.map(name).join(', ')}
        </p>
      )}
      {/* Tile rounds across the width on desktop so the page isn't a tall
          single column with empty space on the right. */}
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {result.rounds.map((round, ri) => (
          <Card key={ri} title={`Round ${ri + 1}`} icon={<Icon name="shuttle" />}>
            <div className="space-y-3">
              {round.matches.map((m, ci) => (
                <div
                  key={ci}
                  className="rounded-lg border border-line bg-surface-muted px-3 py-3 text-sm"
                >
                  <div className="mb-2 text-center text-xs uppercase tracking-wide text-fg-subtle">
                    Court {ci + 1}
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                    <TeamCol a={name(m[0][0])} b={name(m[0][1])} />
                    <span className="text-xs font-medium uppercase text-fg-subtle">vs</span>
                    <TeamCol a={name(m[1][0])} b={name(m[1][1])} />
                  </div>
                </div>
              ))}
            </div>
            {round.sitting.length > 0 && (
              <p className="mt-3 text-xs text-fg-muted">
                Sitting: {round.sitting.map(name).join(', ')}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

// Render a `YYYY-MM-DDTHH:mm` local-input string as a readable label.
function formatLocalInput(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value || 'Pick date & time'
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// A back link to return from a result/tournament view to the setup widget.
function BackToSetup({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"
      data-testid="back-to-setup"
    >
      ← Back to setup
    </button>
  )
}

// Fixed-pairs tournament setup (E11): lock partners from the selected players,
// then generate a single round-robin and create the game day pre-filled with it.
function TournamentSetup({
  players,
  clubId,
  playedAt,
  passes,
  onCreated,
}: {
  players: Player[]
  clubId: string | null
  playedAt: string
  passes: number
  onCreated: (sessionId: string) => void
}) {
  const create = useCreateTournamentWithMatches()
  const [pairs, setPairs] = useState<[Player, Player][]>([])
  const [picked, setPicked] = useState<Player | null>(null)

  const pairedIds = new Set(pairs.flatMap(([a, b]) => [a.id, b.id]))
  const pool = players.filter((p) => !pairedIds.has(p.id))

  function clickPlayer(p: Player) {
    if (picked?.id === p.id) {
      setPicked(null)
    } else if (picked) {
      setPairs((ps) => [...ps, [picked, p]])
      setPicked(null)
    } else {
      setPicked(p)
    }
  }

  const rrPasses = Math.max(1, passes)

  function generate() {
    if (!clubId || pairs.length < 2) return
    // Round-robin over the locked pairs, repeated `passes` times (each pass is a
    // full round-robin); flatten to one match per court.
    const schedule = roundRobin(pairs.length)
    const fixtures: TournamentFixture[] = []
    for (let pass = 0; pass < rrPasses; pass++) {
      schedule.forEach((round, ri) => {
        round.forEach(([i, j], ci) => {
          fixtures.push({
            round: pass * schedule.length + ri + 1,
            court: ci + 1,
            teamA: [pairs[i][0].id, pairs[i][1].id],
            teamB: [pairs[j][0].id, pairs[j][1].id],
          })
        })
      })
    }
    create.mutate({ clubId, playedAt, fixtures }, { onSuccess: onCreated })
  }

  const matchCount = ((pairs.length * (pairs.length - 1)) / 2) * rrPasses

  return (
    <Card title="New tournament · Lock pairs" icon={<Icon name="tournament" />}>
      <p className="mb-3 text-sm text-fg-muted">
        Tap two players to lock them as a fixed pair. Locked pairs play a
        round-robin (everyone plays everyone)
        {rrPasses > 1 ? `, ${rrPasses} times` : ''}.
      </p>

      {pool.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
            Players ({pool.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {pool.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => clickPlayer(p)}
                data-testid={`tp-${p.id}`}
                className={cx(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  picked?.id === p.id
                    ? 'border-accent bg-accent/15 text-accent-strong'
                    : 'border-line bg-surface text-fg hover:bg-surface-muted',
                )}
              >
                {p.nickname}
              </button>
            ))}
          </div>
        </div>
      )}

      {pairs.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
            Locked pairs ({pairs.length})
          </p>
          <ul className="space-y-2" data-testid="locked-pairs">
            {pairs.map(([a, b], i) => (
              <li
                key={`${a.id}|${b.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm"
              >
                <span className="font-medium text-fg">
                  {a.nickname} <span className="text-fg-subtle">+</span> {b.nickname}
                </span>
                <button
                  type="button"
                  onClick={() => setPairs((ps) => ps.filter((_, k) => k !== i))}
                  className="text-xs text-fg-muted hover:text-negative"
                  aria-label={`Unlock ${a.nickname} and ${b.nickname}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-fg-subtle">
          {pairs.length < 2
            ? 'Lock at least 2 pairs to generate matches.'
            : `${matchCount} matches will be generated.`}
          {pool.length > 0 && pairs.length >= 2 && ` ${pool.length} player(s) will sit out.`}
        </p>
        <Button
          onClick={generate}
          disabled={!clubId || pairs.length < 2 || create.isPending}
          data-testid="generate-matches"
          className="w-full sm:w-auto"
        >
          {create.isPending ? 'Generating…' : 'Generate matches'}
        </Button>
      </div>
    </Card>
  )
}

// A team's two players stacked + centred (matches the public home's pair styling).
function TeamCol({ a, b }: { a: string; b: string }) {
  return (
    <div className="min-w-0">
      <p className="break-words font-medium leading-tight text-fg">{a}</p>
      <p className="break-words font-medium leading-tight text-fg">{b}</p>
    </div>
  )
}
