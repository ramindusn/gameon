import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { cx, Button } from '@gameon/ui'
import { useAuth } from '../auth/useAuth'
import { roleHome } from '../auth/roleHome'
import { AdminLogin } from '../auth/AdminLogin'
import { MatchmakerLogin } from '../auth/MatchmakerLogin'
import { SearchBox } from '../search/SearchBox'
import { Icon, type IconName } from './Icon'

type NavItem = { to: string; label: string; icon: IconName }
type LoginKind = 'admin' | 'matchmaker' | null

// One nav for the whole app. Every page renders through this shell — including
// the public home and player profiles, which used to carry a second, differently
// shaped header of their own. That was the inconsistency: the links did not
// change between desktop and mobile, but the *shape* changed between pages, so
// opening a player from the dashboard on a phone made the tab bar disappear.
//
// Signed out, the shell offers the public destinations plus the login buttons;
// signed in, the role's own set. Desktop puts them in the top bar, mobile in a
// bottom tab bar — same links either way.
const PUBLIC_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/leaderboard', label: 'Leaderboards', icon: 'trophy' },
]

const NAV_BY_ROLE: Record<'admin' | 'matchmaker', NavItem[]> = {
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/players', label: 'Players', icon: 'players' },
    { to: '/game-days', label: 'Game Days', icon: 'schedule' },
  ],
  matchmaker: [
    { to: '/matchmaker', label: 'Home', icon: 'home' },
    { to: '/generate', label: 'Generate', icon: 'generate' },
    { to: '/players', label: 'Players', icon: 'players' },
    { to: '/game-days', label: 'Game Days', icon: 'schedule' },
  ],
}

export function AppShell({
  title,
  actions,
  children,
}: {
  /** Page heading. Omit to let the page render its own header (e.g. a page
   *  that has a self-contained hero + sticky sub-nav). */
  title?: string
  actions?: ReactNode
  children: ReactNode
}) {
  const { role, signOut } = useAuth()
  const navigate = useNavigate()
  const nav = role ? NAV_BY_ROLE[role] : PUBLIC_NAV
  const [login, setLogin] = useState<LoginKind>(null)

  // A sign-in started from the header closes it and routes to the role's home.
  useEffect(() => {
    if (login && role) {
      setLogin(null)
      navigate(roleHome(role))
    }
  }, [login, role, navigate])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg" data-testid="app-shell">
      {/* Keyboard users can jump past the nav straight to the page content. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-neutral-950"
      >
        Skip to content
      </a>
      {/* Top navigation bar */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <NavLink
              to="/"
              className="whitespace-nowrap font-display text-base font-bold text-accent-strong sm:text-lg"
            >
              BadmintonDuo
            </NavLink>
            {/* Desktop links live in the top bar; mobile uses the bottom tabs. */}
            <nav className="hidden items-center gap-1 sm:flex">
              {nav.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    cx(
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'text-accent-strong'
                        : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="relative flex items-center gap-3">
            <div className="hidden w-56 lg:block">
              <SearchBox />
            </div>
            {role ? (
              <>
                <span
                  className="hidden text-sm capitalize text-fg-muted sm:inline"
                  data-testid="auth-role"
                >
                  Role: {role}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => void handleSignOut()}
                  data-testid="sign-out"
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                {/* "Login" is dropped on a phone: with it, both buttons wrap
                    to two lines and the header eats a third of the screen —
                    and since TASK-76.1 this header is on every page, not just
                    the public home. */}
                <Button
                  variant="ghost"
                  className="whitespace-nowrap px-2.5 sm:px-3.5"
                  onClick={() => setLogin((k) => (k === 'admin' ? null : 'admin'))}
                  data-testid="nav-admin-login"
                >
                  Admin<span className="hidden sm:inline"> Login</span>
                </Button>
                <Button
                  className="whitespace-nowrap px-2.5 sm:px-3.5"
                  onClick={() => setLogin((k) => (k === 'matchmaker' ? null : 'matchmaker'))}
                  data-testid="nav-matchmaker-login"
                >
                  Matchmaker<span className="hidden sm:inline"> Login</span>
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

        {/* Search sits in the bar on desktop (hidden lg:block above); narrower
            screens get a full-width row so it stays reachable. */}
        <div className="border-t border-line px-4 pb-3 pt-2 sm:px-6 lg:hidden">
          <SearchBox />
        </div>
      </header>

      {/* Extra bottom padding on mobile so content clears the fixed tab bar. */}
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-8"
        data-testid="app-main"
      >
        {(title || actions) && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            {title && <h1 className="font-display text-2xl font-bold">{title}</h1>}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>

      <footer className="border-t border-line pb-20 sm:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-display text-sm font-bold text-fg">BadmintonDuo</span>
          <span>© 2026 BadmintonDuo Club Management.</span>
        </div>
      </footer>

      {/* Mobile bottom tab bar — thumb-friendly, always reachable. */}
      {nav.length > 0 && (
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur sm:hidden"
          data-testid="bottom-nav"
        >
          <div className="mx-auto flex max-w-6xl items-stretch justify-around">
            {nav.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end
                className={({ isActive }) =>
                  cx(
                    'flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                    isActive ? 'text-accent-strong' : 'text-fg-muted',
                  )
                }
              >
                <Icon name={item.icon} className="h-6 w-6" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
