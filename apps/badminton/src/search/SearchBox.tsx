import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRoster } from '../roster/useRoster'

// Public player search (E08 / TASK-9.4). The roster is public-read, so a
// logged-out visitor can find any player by name and open their profile. The box
// fills its container (compact in the desktop nav, full-width on the mobile row)
// and the results dropdown aligns to the input's own width.
export function SearchBox() {
  const { data } = useRoster()
  const players = data?.players ?? []
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const matches = q
    ? players.filter((p) => p.nickname.toLowerCase().includes(q)).slice(0, 8)
    : []

  return (
    <div className="relative w-full">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        placeholder="Search players…"
        aria-label="Search players"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface-muted/50 py-1.5 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle focus:border-accent/70 focus:bg-surface focus:outline-none"
        data-testid="player-search"
      />
      {q && (
        <div
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-lg"
          data-testid="search-results"
        >
          {matches.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-fg-muted">No players found.</p>
          ) : (
            <ul>
              {matches.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/players/${p.id}`}
                    onClick={() => setQuery('')}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-surface-muted"
                    data-testid={`search-result-${p.id}`}
                  >
                    <span className="truncate text-fg">{p.nickname}</span>
                    <span className="shrink-0 text-xs text-fg-subtle">
                      Skill {p.skill ?? '—'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
