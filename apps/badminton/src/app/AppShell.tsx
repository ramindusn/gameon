import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cx, Button } from '@gameon/ui'
import { useAuth } from '../auth/useAuth'

type NavItem = { to: string; label: string; icon: string }

// Admin nav today covers club-ops; more sections light up as their epics land.
const NAV_BY_ROLE: Record<'admin' | 'matchmaker', NavItem[]> = {
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/dashboard#fund', label: 'Fund', icon: '💰' },
  ],
  matchmaker: [{ to: '/matchmaker', label: 'Home', icon: '🏠' }],
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { role, signOut } = useAuth()
  const nav = role && role !== null ? NAV_BY_ROLE[role] : []

  return (
    <div className="flex min-h-screen bg-bg text-fg" data-testid="app-shell">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">
            🏸
          </span>
          <div>
            <div className="font-display text-sm font-bold leading-tight">GameOn</div>
            <div className="text-[10px] uppercase tracking-wide text-fg-muted">
              Club management
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                )
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 rounded-lg border border-line bg-surface-muted px-3 py-2 text-xs">
          <div className="text-fg-muted">Club management</div>
          <div className="font-medium text-fg">GameOn</div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3 sm:px-6">
          <h1 className="font-display text-lg font-semibold">{title}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm capitalize text-fg-muted" data-testid="auth-role">
              Role: {role}
            </span>
            <Button variant="ghost" onClick={() => void signOut()} data-testid="sign-out">
              Sign out
            </Button>
          </div>
        </header>

        <main
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8"
          data-testid="app-main"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
