import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, cx } from '@gameon/ui'
import { Icon } from '../app/Icon'
import { getPlayer } from '../roster/api'
import { loadPlayerHistory, type PlayerMatch } from '../play/api'
import { usePlayerBoard, usePlayerNames, useRecentForm } from '../ranking/useRanking'
import { FormStrip } from '../ranking/Leaderboard'
import { effectiveSkill } from '../ranking/effectiveSkill'
import { PerformanceChart } from '../profile/PerformanceChart'
import { useAuth } from '../auth/useAuth'

// Public, read-only player profile (E02/E08, TASK-3.3 + 9.3). Anyone can view it
// without logging in: rating + record + recent form, and full match history.
export function PlayerProfilePage() {
  const { id = '' } = useParams()
  const { data: player, isLoading, isError } = useQuery({
    queryKey: ['player', id],
    queryFn: () => getPlayer(id),
  })
  const { data: history = [] } = useQuery({
    queryKey: ['player-history', id],
    queryFn: () => loadPlayerHistory(id),
    enabled: !!id,
  })
  const board = usePlayerBoard()
  const form = useRecentForm()
  const nameOf = usePlayerNames()
  const { role } = useAuth()
  // The manual (base) skill is staff-only; everyone sees the live skill.
  const isStaff = role === 'admin' || role === 'matchmaker'

  const rated = board.data?.find((p) => p.playerId === id)
  const wins = history.filter((m) => m.won).length
  const losses = history.length - wins
  // Live, results-aware skill (manual seed blended with rating); the manual value
  // stays the reference (TASK-44).
  const liveSkill = player
    ? effectiveSkill(player.skill, rated?.rating, rated?.games ?? history.length)
    : null
  // "Improving" = recently winning more than losing (motivating up-signal only).
  const recentForm = form.data?.[id] ?? []
  const recentWins = recentForm.filter((r) => r === 'W').length
  const recentLosses = recentForm.filter((r) => r === 'L').length
  const improving = recentForm.length >= 3 && recentWins > recentLosses

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg" data-testid="player-profile">
      <header className="border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-lg font-bold text-accent-strong">
            BadmintonDuo
          </Link>
          <Link to="/" className="text-sm text-fg-muted hover:text-fg">
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        {isLoading && <p className="text-sm text-fg-muted">Loading…</p>}
        {(isError || (!isLoading && !player)) && (
          <p className="text-sm text-fg-muted" data-testid="player-not-found">
            Player not found.
          </p>
        )}

        {player && (
          <>
            <div className="mb-8 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 text-2xl">
                🏸
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold" data-testid="profile-name">
                    {player.nickname}
                  </h1>
                  {improving && (
                    <span
                      className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent-strong"
                      title="Winning more than losing lately — keep it up!"
                      data-testid="improving-badge"
                    >
                      📈 Improving
                    </span>
                  )}
                </div>
                <p className="text-sm text-fg-muted">
                  {/* Public sees the live (results-aware) skill; base is staff-only. */}
                  Skill {liveSkill != null ? liveSkill.toFixed(1) : '—'}
                  {player.isMatchmaker ? ' · Matchmaker' : ''}
                  {player.absent ? ' · Absent' : ''}
                </p>
              </div>
            </div>

            {history.length >= 2 && (
              <div className="mb-6">
                <Card title="Performance trend" icon={<Icon name="ranking" />}>
                  <PerformanceChart matches={history} />
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card title="Performance" icon={<Icon name="stats" />}>
                <dl className="space-y-3 text-sm" data-testid="profile-performance">
                  <Stat label="Rating" value={rated ? String(Math.round(rated.rating)) : '—'} />
                  {/* Base skill is the manual seed — staff-only; public sees live. */}
                  {isStaff ? (
                    <Stat
                      label="Skill (base → now)"
                      value={`${player.skill ?? '—'} → ${liveSkill != null ? liveSkill.toFixed(1) : '—'}`}
                    />
                  ) : (
                    <Stat label="Skill" value={liveSkill != null ? liveSkill.toFixed(1) : '—'} />
                  )}
                  <Stat label="Record" value={`${wins}W – ${losses}L`} />
                  <Stat label="Games" value={String(history.length)} />
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-fg-muted">Recent form</dt>
                    <dd>
                      <FormStrip results={form.data?.[id]} />
                    </dd>
                  </div>
                </dl>
              </Card>

              <div className="lg:col-span-2">
                <Card title="Match history" icon={<Icon name="matches" />}>
                  {history.length === 0 ? (
                    <p className="text-sm text-fg-muted" data-testid="profile-history-empty">
                      No matches played yet.
                    </p>
                  ) : (
                    <ul className="space-y-2" data-testid="profile-history">
                      {history.map((m) => (
                        <HistoryRow key={m.id} m={m} nameOf={nameOf} />
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-semibold text-fg">{value}</dd>
    </div>
  )
}

function HistoryRow({
  m,
  nameOf,
}: {
  m: PlayerMatch
  nameOf: (id: string | null) => string
}) {
  const date = new Date(m.date)
  const when = Number.isNaN(date.getTime())
    ? m.date
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm">
      <span
        className={cx(
          'grid h-6 w-6 shrink-0 place-items-center rounded text-xs font-bold',
          m.won ? 'bg-accent/15 text-accent-strong' : 'bg-negative/15 text-negative',
        )}
      >
        {m.won ? 'W' : 'L'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-fg">
          with <span className="font-medium">{nameOf(m.partnerId)}</span> vs{' '}
          <span className="font-medium">{nameOf(m.opponentIds[0])}</span> &amp;{' '}
          <span className="font-medium">{nameOf(m.opponentIds[1])}</span>
        </div>
        <div className="text-xs text-fg-subtle">{when}</div>
      </div>
      <span className="shrink-0 font-semibold tabular-nums text-fg">
        {m.scoreFor}–{m.scoreAgainst}
      </span>
    </li>
  )
}
