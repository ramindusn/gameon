import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { cx, Button } from '@gameon/ui'
import { useAuth } from '../auth/useAuth'

type NavItem = { to: string; label: string; icon: string }

// Top-nav (desktop) + bottom tab bar (mobile) links per role.
const NAV_BY_ROLE: Record<'admin' | 'matchmaker', NavItem[]> = {
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/players', label: 'Players', icon: '👥' },
  ],
  matchmaker: [
    { to: '/matchmaker', label: 'Home', icon: '🏠' },
    { to: '/generate', label: 'Generate', icon: '🎲' },
    { to: '/players', label: 'Players', icon: '👥' },
  ],
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { role, signOut } = useAuth()
  const navigate = useNavigate()
  const nav = role ? NAV_BY_ROLE[role] : []

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-bg text-fg" data-testid="app-shell">
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
            <NavLink to="/" className="font-display text-lg font-bold text-accent-strong">
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
          <div className="flex items-center gap-3">
            <span
              className="hidden text-sm capitalize text-fg-muted sm:inline"
              data-testid="auth-role"
            >
              Role: {role}
            </span>
            <Button variant="ghost" onClick={() => void handleSignOut()} data-testid="sign-out">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Extra bottom padding on mobile so content clears the fixed tab bar. */}
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-8"
        data-testid="app-main"
      >
        <h1 className="mb-6 font-display text-2xl font-bold">{title}</h1>
        {children}
      </main>

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
                    'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                    isActive ? 'text-accent-strong' : 'text-fg-muted',
                  )
                }
              >
                <span aria-hidden className="text-lg leading-none">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
