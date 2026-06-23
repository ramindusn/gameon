import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '@gameon/ui'
import { generateRounds, type GeneratedMatches, type MatchPlayer } from '@gameon/domain'
import { AppShell } from '../app/AppShell'
import { useRoster } from '../roster/useRoster'
import { useCreateSession } from '../play/useMatchPlay'
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
  // Only active players (not excluded from draws) are eligible for a game day,
  // so the picker lists exactly them.
  const active = useMemo<Player[]>(
    () => (data?.players ?? []).filter((p) => !p.absent),
    [data],
  )
  const createSession = useCreateSession()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [initialised, setInitialised] = useState(false)
  const [rounds, setRounds] = useState(5)
  const mode: Mode = 'open'
  const [result, setResult] = useState<GeneratedMatches | null>(null)
  const [generated, setGenerated] = useState(false)
  // Game-day date/time the matchmaker confirms on "Create game day" (default now).
  const [playedAt, setPlayedAt] = useState(nowLocalInput())

  // Default selection = all active players (once the roster loads).
  if (!initialised && active.length > 0) {
    setSelected(new Set(active.map((p) => p.id)))
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
      .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        skill: p.skill ?? 5,
        gender: p.gender,
      }))
    setResult(generateRounds(present, rounds, { mode }))
    setGenerated(true)
  }

  return (
    <AppShell title="Generate draw">
      <div data-testid="generate">
        <Card title="Setup" icon="🎲">
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <label className="text-sm">
              <span className="mb-1 block text-fg-muted">Rounds</span>
              <input
                type="number"
                min={1}
                max={30}
                value={rounds}
                onChange={(e) =>
                  setRounds(Math.max(1, Math.min(30, Number(e.target.value) || 1)))
                }
                className="w-24 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                data-testid="rounds-input"
              />
            </label>
            <Button
              onClick={generate}
              disabled={selected.size < 4}
              data-testid="generate-button"
            >
              Generate
            </Button>
          </div>

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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {active.map((p) => (
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
                    <span className="truncate text-fg">{p.nickname}</span>
                    <span className="ml-auto text-xs text-fg-subtle">
                      {p.skill ?? '—'}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </Card>

        {generated && (
          <div className="mt-6" data-testid="draw-result">
            {!result ? (
              <Card title="Couldn't generate" icon="⚠️">
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
              <span aria-hidden className="text-base">
                📅
              </span>
              Create game day
            </h2>
            <p className="text-sm text-fg-muted">
              {result.rounds.length} rounds · {result.courts} court
              {result.courts === 1 ? '' : 's'} · {result.totalPlayers} players
            </p>
          </div>
          <input
            type="datetime-local"
            value={playedAt}
            onChange={(e) => onPlayedAtChange(e.target.value)}
            aria-label="Game day date and time"
            className="w-fit self-start rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:ml-auto sm:self-auto"
            data-testid="game-day-datetime"
          />
          <Button
            onClick={onStart}
            disabled={!canStart || starting}
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
          <Card key={ri} title={`Round ${ri + 1}`} icon="🏸">
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

// A team's two players stacked + centred (matches the public home's pair styling).
function TeamCol({ a, b }: { a: string; b: string }) {
  return (
    <div className="min-w-0">
      <p className="break-words font-medium leading-tight text-fg">{a}</p>
      <p className="break-words font-medium leading-tight text-fg">{b}</p>
    </div>
  )
}
