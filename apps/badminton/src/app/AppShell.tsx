import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cx, Button } from '@gameon/ui'
import { useAuth } from '../auth/useAuth'

type NavItem = { to: string; label: string }

// Top-nav links per role; more sections light up as their epics land.
const NAV_BY_ROLE: Record<'admin' | 'matchmaker', NavItem[]> = {
  admin: [{ to: '/dashboard', label: 'Dashboard' }],
  matchmaker: [{ to: '/matchmaker', label: 'Home' }],
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { role, signOut } = useAuth()
  const nav = role ? NAV_BY_ROLE[role] : []

  return (
    <div className="min-h-screen bg-bg text-fg" data-testid="app-shell">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="font-display text-lg font-bold text-accent-strong">
              GameOn
            </NavLink>
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
            <span className="text-sm capitalize text-fg-muted" data-testid="auth-role">
              Role: {role}
            </span>
            <Button variant="ghost" onClick={() => void signOut()} data-testid="sign-out">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8"
        data-testid="app-main"
      >
        <h1 className="mb-6 font-display text-2xl font-bold">{title}</h1>
        {children}
      </main>
    </div>
  )
}
