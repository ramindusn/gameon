import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { Button, Card } from '@gameon/ui'
import { useAuth } from '../auth/useAuth'
import { roleHome } from '../auth/roleHome'
import { AdminLogin } from '../auth/AdminLogin'
import { MatchmakerLogin } from '../auth/MatchmakerLogin'
import {
  usePairBoard,
  usePlayerBoard,
  usePlayerNames,
  useRecentForm,
} from '../ranking/useRanking'
import {
  BoardState,
  PairBoardList,
  PlayerBoardList,
} from '../ranking/Leaderboard'

// Public, logged-out home (TASK-9.1). Top bar with the two login buttons, hero,
// then Scheduled matches → Played matches → Leaderboard. Match/ranking data
// arrives with E03/E04/E05, so those sections show empty states for now.
export function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg" data-testid="home">
      <PublicNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <Hero />
        <Section
          title="Scheduled Matches"
          icon="📅"
          action={<MutedLink>View Schedule</MutedLink>}
        >
          <EmptyState>
            No matches scheduled yet. Check back once a Matchmaker creates a draw.
          </EmptyState>
        </Section>
        <Section title="Recent Results" icon="🏁">
          <EmptyState>No matches have been played yet.</EmptyState>
        </Section>
        <RankingPreview />
      </main>
      <Footer />
    </div>
  )
}

// Top-of-board previews for the public home; "View all" opens the full
// /leaderboard. Reuses the same board components as the leaderboard page.
const PREVIEW_LIMIT = 5

function RankingPreview() {
  const players = usePlayerBoard()
  const pairs = usePairBoard()
  const form = useRecentForm()
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
          <PairBoardList pairs={pairs.data!} nameOf={nameOf} limit={PREVIEW_LIMIT} />
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
          <PlayerBoardList
            players={players.data!}
            nameOf={nameOf}
            form={form.data ?? {}}
            limit={PREVIEW_LIMIT}
          />
        )}
      </Card>
    </div>
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
          <input
            type="search"
            placeholder="Search players…"
            aria-label="Search players"
            className="hidden w-56 rounded-full border border-line bg-surface-muted px-4 py-1.5 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent lg:block"
          />
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

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-10 text-center text-sm text-fg-muted">
      {children}
    </div>
  )
}

function MutedLink({ children }: { children: ReactNode }) {
  return (
    <span className="cursor-default text-sm font-medium text-accent-strong">
      {children}
    </span>
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
