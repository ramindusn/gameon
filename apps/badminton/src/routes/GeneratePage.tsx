import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '@gameon/ui'
import { generateRounds, type GeneratedMatches, type MatchPlayer } from '@gameon/domain'
import { AppShell } from '../app/AppShell'
import { useRoster } from '../roster/useRoster'
import { useCreateSession } from '../play/useMatchPlay'
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
  const roster = useMemo<Player[]>(() => data?.players ?? [], [data])
  const createSession = useCreateSession()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [initialised, setInitialised] = useState(false)
  const [rounds, setRounds] = useState(5)
  const [mode, setMode] = useState<Mode>('open')
  const [result, setResult] = useState<GeneratedMatches | null>(null)
  const [generated, setGenerated] = useState(false)

  // Default selection = everyone not marked absent (once the roster loads).
  if (!initialised && roster.length > 0) {
    setSelected(new Set(roster.filter((p) => !p.absent).map((p) => p.id)))
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
    const present: Named[] = roster
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
            <div className="text-sm">
              <span className="mb-1 block text-fg-muted">Format</span>
              <div className="flex gap-2">
                <Button
                  variant={mode === 'open' ? 'primary' : 'secondary'}
                  onClick={() => setMode('open')}
                  data-testid="mode-open"
                >
                  Doubles
                </Button>
                <Button
                  variant={mode === 'mixed' ? 'primary' : 'secondary'}
                  onClick={() => setMode('mixed')}
                  data-testid="mode-mixed"
                >
                  Mixed doubles
                </Button>
              </div>
            </div>
            <Button
              onClick={generate}
              disabled={selected.size < 4}
              data-testid="generate-button"
            >
              Generate
            </Button>
          </div>

          {isLoading && <p className="text-sm text-fg-muted">Loading roster…</p>}
          {!isLoading && roster.length === 0 && (
            <p className="text-sm text-fg-muted">
              No players yet — add some on the Players page.
            </p>
          )}

          {roster.length > 0 && (
            <>
              <p className="mb-2 text-sm text-fg-muted">
                Present: {selected.size} / {roster.length}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {roster.map((p) => (
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
                  {mode === 'mixed'
                    ? 'Need at least 2 male and 2 female present players for a mixed court.'
                    : 'Need at least 4 present players.'}
                </p>
              </Card>
            ) : (
              <Draw
                result={result}
                canStart={Boolean(data?.clubId)}
                starting={createSession.isPending}
                onStart={() =>
                  createSession.mutate(
                    { clubId: data!.clubId as string, plan: result, mode },
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
  onStart,
}: {
  result: GeneratedMatches
  canStart: boolean
  starting: boolean
  onStart: () => void
}) {
  const name = (p: MatchPlayer) => (p as Named).nickname ?? p.id
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {result.rounds.length} rounds · {result.courts} court
          {result.courts === 1 ? '' : 's'} · {result.totalPlayers} players
        </p>
        <Button
          onClick={onStart}
          disabled={!canStart || starting}
          data-testid="start-session"
        >
          {starting ? 'Starting…' : 'Start session'}
        </Button>
      </div>
      {result.unplaceable.length > 0 && (
        <p className="text-sm text-warning">
          Not placed (no male/female set): {result.unplaceable.map(name).join(', ')}
        </p>
      )}
      {result.rounds.map((round, ri) => (
        <Card key={ri} title={`Round ${ri + 1}`} icon="🏸">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {round.matches.map((m, ci) => (
              <div
                key={ci}
                className="rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm"
              >
                <div className="mb-1 text-xs uppercase tracking-wide text-fg-subtle">
                  Court {ci + 1}
                </div>
                <div className="font-medium text-fg">
                  {name(m[0][0])} &amp; {name(m[0][1])}
                </div>
                <div className="my-0.5 text-xs text-fg-muted">vs</div>
                <div className="font-medium text-fg">
                  {name(m[1][0])} &amp; {name(m[1][1])}
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
  )
}
