import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button, Card, cx } from '@gameon/ui'
import { useAuth } from '../auth/useAuth'
import { roleHome } from '../auth/roleHome'
import { AdminLogin } from '../auth/AdminLogin'
import { MatchmakerLogin } from '../auth/MatchmakerLogin'
import { usePairBoard, usePlayerBoard, usePlayerNames } from '../ranking/useRanking'
import { BoardState } from '../ranking/Leaderboard'
import { SearchBox } from '../search/SearchBox'
import { useRecentResults, useScheduledMatches } from '../play/useMatchPlay'
import type { RecentResult, ScheduledMatch } from '../play/api'

// Public, logged-out home (TASK-9.1 / 9.2 / 9.5). Top bar with the two login
// buttons, hero, then Scheduled Matches → Recent Results → rankings. When no
// game days exist the match sections hide and only the leaderboard shows
// (TASK-9.2); the layout follows the GameOn mockup (TASK-9.5).
export function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg" data-testid="home">
      <PublicNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <Hero />
        <ScheduledMatches />
        <RecentResults />
        <RankingPreview />
      </main>
      <Footer />
    </div>
  )
}

// ---- shared bits ----------------------------------------------------------

const PREVIEW_LIMIT = 5
const SCHEDULED_LIMIT = 6
const RESULTS_LIMIT = 5

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
  return (
    <>
      <PlayerLink id={ids[0]} nameOf={nameOf} />
      <span className="text-fg-subtle"> &amp; </span>
      <PlayerLink id={ids[1]} nameOf={nameOf} />
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

/** A compact "x minutes ago" label, falling back to a date for older results. */
function timeAgo(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const pairKey = (a: string, b: string) => [a, b].sort().join('|')

/**
 * The partnership's own doubles rating, or null when the pair has never played
 * together (no row on the pair board) — in that case the home shows no rating
 * rather than inventing one from the players' singles standings.
 */
function useSideRating() {
  const pairs = usePairBoard()
  return useMemo(() => {
    const byPair = new Map<string, number>()
    for (const p of pairs.data ?? []) byPair.set(pairKey(p.player1Id, p.player2Id), p.rating)
    return (a: string | null, b: string | null): number | null => {
      if (!a || !b) return null
      return byPair.get(pairKey(a, b)) ?? null
    }
  }, [pairs.data])
}

// ---- Scheduled Matches ----------------------------------------------------

function ScheduledMatches() {
  const { data, isLoading } = useScheduledMatches(SCHEDULED_LIMIT)
  const nameOf = usePlayerNames()
  const sideRating = useSideRating()
  const matches = data ?? []
  if (isLoading || matches.length === 0) return null
  return (
    <Section title="Scheduled Matches" icon="📅">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} nameOf={nameOf} sideRating={sideRating} />
        ))}
      </div>
    </Section>
  )
}

function MatchCard({
  match,
  nameOf,
  sideRating,
}: {
  match: ScheduledMatch
  nameOf: NameOf
  sideRating: (a: string | null, b: string | null) => number | null
}) {
  const ra = sideRating(match.teamA[0], match.teamA[1])
  const rb = sideRating(match.teamB[0], match.teamB[1])
  return (
    <div
      className="rounded-2xl border border-line bg-surface p-5"
      data-testid={`scheduled-${match.id}`}
    >
      <div className="mb-5 flex items-start justify-between gap-2">
        <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-strong">
          Doubles
        </span>
        <div className="text-right">
          <p className="text-xs text-fg-muted">Court #{match.court}</p>
          <p className="text-sm font-semibold text-accent-strong">{whenLabel(match.playedAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold text-fg">
            <PairNames ids={match.teamA} nameOf={nameOf} />
          </p>
          {ra != null && <p className="text-xs text-fg-muted">Rating: {fmtRating(ra)}</p>}
        </div>
        <span className="text-xs font-medium uppercase text-fg-subtle">vs</span>
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate font-display text-sm font-bold text-fg">
            <PairNames ids={match.teamB} nameOf={nameOf} />
          </p>
          {rb != null && <p className="text-xs text-fg-muted">Rating: {fmtRating(rb)}</p>}
        </div>
      </div>
    </div>
  )
}

// ---- Recent Results -------------------------------------------------------

function RecentResults() {
  const { data, isLoading } = useRecentResults(RESULTS_LIMIT)
  const nameOf = usePlayerNames()
  const results = data ?? []
  if (isLoading || results.length === 0) return null
  return (
    <Section title="Recent Results" icon="🏁">
      <div className="space-y-3">
        {results.map((r) => (
          <ResultRow key={r.id} result={r} nameOf={nameOf} />
        ))}
      </div>
    </Section>
  )
}

function ResultRow({ result, nameOf }: { result: RecentResult; nameOf: NameOf }) {
  const aWon = result.winner === 'a'
  const bWon = result.winner === 'b'
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-4 sm:px-6"
      data-testid={`result-${result.id}`}
    >
      <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <div className="min-w-0 text-right">
          <p
            className={cx(
              'truncate font-display text-sm font-bold',
              aWon ? 'text-accent-strong' : 'text-fg',
            )}
          >
            <PairNames ids={result.teamA} nameOf={nameOf} />
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
            {aWon ? 'Winner' : 'Finalist'}
          </p>
        </div>
        <div className="flex items-center gap-2 font-display tabular-nums">
          <span className={cx('text-2xl font-extrabold', aWon ? 'text-fg' : 'text-fg-subtle')}>
            {result.scoreA}
          </span>
          <span className="text-fg-subtle">-</span>
          <span className={cx('text-2xl font-extrabold', bWon ? 'text-fg' : 'text-fg-subtle')}>
            {result.scoreB}
          </span>
        </div>
        <div className="min-w-0 text-left">
          <p
            className={cx(
              'truncate font-display text-sm font-bold',
              bWon ? 'text-accent-strong' : 'text-fg',
            )}
          >
            <PairNames ids={result.teamB} nameOf={nameOf} />
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
            {bWon ? 'Winner' : 'Finalist'}
          </p>
        </div>
      </div>
      <span className="hidden w-20 shrink-0 text-right text-xs text-fg-subtle sm:block">
        {timeAgo(result.playedAt)}
      </span>
    </div>
  )
}

// ---- Rankings -------------------------------------------------------------

function RankingPreview() {
  const players = usePlayerBoard()
  const pairs = usePairBoard()
  const nameOf = usePlayerNames()

  return (
    <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Doubles Ranking" icon="👥" action={<ViewAll />}>
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
      <Card title="Individual Ranking" icon="🏅" action={<ViewAll />}>
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
  const links = ['Leagues', 'Matches', 'Leaderboards', 'Clubs']

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
  icon: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <span aria-hidden>{icon}</span>
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
