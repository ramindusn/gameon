import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button, Card, cx } from '@gameon/ui'
import { Icon, type IconName } from '../app/Icon'
import { useAuth } from '../auth/useAuth'
import { roleHome } from '../auth/roleHome'
import { AdminLogin } from '../auth/AdminLogin'
import { MatchmakerLogin } from '../auth/MatchmakerLogin'
import {
  useGameDayBoard,
  usePairBoard,
  usePlayerBoard,
  usePlayerNames,
  useTournamentPairBoard,
} from '../ranking/useRanking'
import { BoardState } from '../ranking/Leaderboard'
import { SearchBox } from '../search/SearchBox'

// Public, logged-out home (TASK-9.1 / 9.2 / 9.5). Top bar with the two login
// buttons, hero, then the latest game day's standings and the rankings. The
// Scheduled Matches / Recent Results feeds were removed to keep the public home
// focused (too much detail); the layout follows the GameOn mockup (TASK-9.5).
export function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg" data-testid="home">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-neutral-950"
      >
        Skip to content
      </a>
      <PublicNav />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <Hero />
        <LatestGameDay />
        <RankingPreview />
      </main>
      <Footer />
    </div>
  )
}

// ---- shared bits ----------------------------------------------------------

const PREVIEW_LIMIT = 5

/** A player name that links to their public profile (plain text when unknown). */
function PlayerLink({ id, nameOf }: { id: string | null; nameOf: NameOf }) {
  const name = nameOf(id)
  if (!id) return <span>{name}</span>
  return (
    <Link to={`/players/${id}`} className="hover:text-accent-strong hover:underline">
      {name}
    </Link>
  )
}

/** "Name A & Name B" with each name linking to its profile. */
function PairNames({ ids, nameOf }: { ids: [string | null, string | null]; nameOf: NameOf }) {
  // Always stack the two players on separate lines so every card is the same
  // height regardless of name length (consistent rows, no ragged wrapping).
  return (
    <>
      <span className="block">
        <PlayerLink id={ids[0]} nameOf={nameOf} />
      </span>
      <span className="block">
        <PlayerLink id={ids[1]} nameOf={nameOf} />
      </span>
    </>
  )
}

type NameOf = (id: string | null) => string

const fmtRating = (n: number) => Math.round(n).toLocaleString('en-US')

/** A friendly absolute label for a game day's date/time. */
function whenLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(d) - startOf(new Date())) / 86_400_000)
  const datePart =
    days === 0
      ? 'Today'
      : days === 1
        ? 'Tomorrow'
        : days === -1
          ? 'Yesterday'
          : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
  if (!hasTime) return datePart
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${datePart}, ${time}`
}

// ---- Latest Game Day ------------------------------------------------------

/** "+38" / "-12" / "0" — a signed net point differential. */
const fmtDiff = (n: number) => (n > 0 ? `+${n}` : String(n))

/**
 * Standings scoped to the most recent casual game day, ranked by net point
 * differential. Persists until a newer game day produces results, then rolls
 * over (TASK-33). Hidden until the first game day has been scored.
 */
function LatestGameDay() {
  const { data, isLoading } = useGameDayBoard()
  const nameOf = usePlayerNames()
  const rows = useMemo(() => {
    return (data?.standings ?? [])
      .map((s) => ({ ...s, name: nameOf(s.playerId) }))
      .sort((a, b) => b.diff - a.diff || a.name.localeCompare(b.name))
  }, [data, nameOf])

  if (isLoading || !data || rows.length === 0) return null

  return (
    <Section
      title="Latest Game Day"
      icon="trophy"
      action={<span className="text-sm font-medium text-fg-muted">{whenLabel(data.playedAt)}</span>}
    >
      <Card icon={<Icon name="ranking" />} title="Points differential">
        <table className="w-full text-sm" data-testid="game-day-board">
          <thead>
            <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
              <th className="w-14 py-2 font-medium">Rank</th>
              <th className="py-2 font-medium">Player Name</th>
              <th className="py-2 text-right font-medium">+/-</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={r.playerId} data-testid={`game-day-row-${r.playerId}`}>
                <td className="py-3">
                  <RankBadge n={i + 1} />
                </td>
                <td className="py-3 font-medium text-fg">
                  <PlayerLink id={r.playerId} nameOf={nameOf} />
                </td>
                <td
                  className={cx(
                    'py-3 text-right font-display font-bold tabular-nums',
                    r.diff > 0 ? 'text-accent-strong' : r.diff < 0 ? 'text-fg-subtle' : 'text-fg',
                  )}
                >
                  {fmtDiff(r.diff)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Section>
  )
}

// ---- Rankings -------------------------------------------------------------

function RankingPreview() {
  const players = usePlayerBoard()
  const pairs = usePairBoard()
  const tournament = useTournamentPairBoard()
  const nameOf = usePlayerNames()
  const hasTournament = (tournament.data?.length ?? 0) > 0

  return (
    <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Individual Ranking" icon={<Icon name="ranking" />} action={<ViewAll />}>
        <BoardState
          isLoading={players.isLoading}
          isError={players.isError}
          count={players.data?.length ?? 0}
          noun="individual leaderboard"
        />
        {(players.data?.length ?? 0) > 0 && (
          <RankTable
            head="Player Name"
            testid="individual-ranking"
            rows={players.data!.slice(0, PREVIEW_LIMIT).map((p, i) => ({
              key: p.playerId,
              rank: i + 1,
              rating: p.rating,
              name: <PlayerLink id={p.playerId} nameOf={nameOf} />,
            }))}
          />
        )}
      </Card>
      <Card title="Doubles Ranking" icon={<Icon name="pairs" />} action={<ViewAll />}>
        <BoardState
          isLoading={pairs.isLoading}
          isError={pairs.isError}
          count={pairs.data?.length ?? 0}
          noun="doubles leaderboard"
        />
        {(pairs.data?.length ?? 0) > 0 && (
          <RankTable
            head="Pair Names"
            testid="doubles-ranking"
            rows={pairs.data!.slice(0, PREVIEW_LIMIT).map((p, i) => ({
              key: `${p.player1Id}|${p.player2Id}`,
              rank: i + 1,
              rating: p.rating,
              name: <PairNames ids={[p.player1Id, p.player2Id]} nameOf={nameOf} />,
            }))}
          />
        )}
      </Card>
      {hasTournament && (
        <Card title="Fixed Pairs (Tournament)" icon={<Icon name="tournament" />} action={<ViewAll />}>
          <RankTable
            head="Pair Names"
            testid="tournament-ranking"
            rows={tournament.data!.slice(0, PREVIEW_LIMIT).map((p, i) => ({
              key: `${p.player1Id}|${p.player2Id}`,
              rank: i + 1,
              rating: p.rating,
              name: <PairNames ids={[p.player1Id, p.player2Id]} nameOf={nameOf} />,
            }))}
          />
        </Card>
      )}
    </div>
  )
}

function RankBadge({ n }: { n: number }) {
  return (
    <span
      className={cx(
        'grid h-7 w-7 place-items-center rounded-full font-display text-sm',
        n === 1
          ? 'bg-accent/15 font-bold text-accent-strong'
          : 'font-medium text-fg-subtle',
      )}
    >
      {n}
    </span>
  )
}

function RankTable({
  head,
  testid,
  rows,
}: {
  head: string
  testid: string
  rows: { key: string; rank: number; rating: number; name: ReactNode }[]
}) {
  return (
    <table className="w-full text-sm" data-testid={testid}>
      <thead>
        <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
          <th className="w-14 py-2 font-medium">Rank</th>
          <th className="py-2 font-medium">{head}</th>
          <th className="py-2 text-right font-medium">Rating</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((r) => (
          <tr key={r.key}>
            <td className="py-3">
              <RankBadge n={r.rank} />
            </td>
            <td className="py-3 font-medium text-fg">{r.name}</td>
            <td className="py-3 text-right font-display font-bold tabular-nums text-fg">
              {fmtRating(r.rating)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ViewAll() {
  return (
    <Link
      to="/leaderboard"
      className="text-sm font-medium text-accent-strong hover:underline"
      data-testid="view-all-leaderboard"
    >
      View all
    </Link>
  )
}

type LoginKind = 'admin' | 'matchmaker' | null

function PublicNav() {
  const { role, signOut } = useAuth()
  const navigate = useNavigate()
  const [login, setLogin] = useState<LoginKind>(null)
  const links = ['Leaderboards']

  // When a sign-in started here resolves a role, close the modal and route on.
  useEffect(() => {
    if (login && role) {
      setLogin(null)
      navigate(roleHome(role))
    }
  }, [login, role, navigate])

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-display text-lg font-bold text-accent-strong">
            BadmintonDuo
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) =>
              l === 'Leaderboards' ? (
                <Link
                  key={l}
                  to="/leaderboard"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-fg-muted hover:text-fg"
                >
                  {l}
                </Link>
              ) : (
                <span
                  key={l}
                  className="cursor-default rounded-lg px-3 py-1.5 text-sm font-medium text-fg-muted"
                >
                  {l}
                </span>
              ),
            )}
          </nav>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="hidden lg:block">
            <SearchBox />
          </div>
          {role ? (
            <>
              <Link
                to={roleHome(role)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-fg-muted hover:text-fg"
              >
                {role === 'admin' ? 'Dashboard' : 'My area'}
              </Link>
              <Button
                variant="ghost"
                onClick={() => void signOut()}
                data-testid="sign-out"
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setLogin((k) => (k === 'admin' ? null : 'admin'))}
                data-testid="nav-admin-login"
              >
                Admin Login
              </Button>
              <Button
                onClick={() =>
                  setLogin((k) => (k === 'matchmaker' ? null : 'matchmaker'))
                }
                data-testid="nav-matchmaker-login"
              >
                Matchmaker Login
              </Button>
            </>
          )}

          {login && (
            <>
              {/* click-away catcher */}
              <button
                type="button"
                aria-label="Close login"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setLogin(null)}
              />
              <div
                className="absolute right-0 top-full z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-4 shadow-xl"
                data-testid="login-dropdown"
              >
                <div className="mb-3 text-sm font-semibold text-fg">
                  {login === 'admin' ? 'Admin login' : 'Matchmaker login'}
                </div>
                {login === 'admin' ? <AdminLogin /> : <MatchmakerLogin />}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="py-16 text-center sm:py-24">
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
        Elevate Your <span className="text-accent-strong">Game</span>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-fg-muted sm:text-lg">
        The ultimate arena for badminton enthusiasts. Track scores, climb leaderboards,
        and find your next championship match.
      </p>
    </section>
  )
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string
  icon: IconName
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Icon name={icon} className="text-accent" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="font-display text-sm font-bold text-fg">BadmintonDuo</span>
        <span>© 2026 BadmintonDuo Club Management.</span>
      </div>
    </footer>
  )
}
