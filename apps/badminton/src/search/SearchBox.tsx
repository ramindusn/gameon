import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRoster } from '../roster/useRoster'

// Public player search (E08 / TASK-9.4). The roster is public-read, so a
// logged-out visitor can find any player by name and open their profile.
export function SearchBox() {
  const { data } = useRoster()
  const players = data?.players ?? []
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const matches = q
    ? players.filter((p) => p.nickname.toLowerCase().includes(q)).slice(0, 8)
    : []

  return (
    <div className="relative">
      <input
        type="search"
        placeholder="Search players…"
        aria-label="Search players"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-56 rounded-full border border-line bg-surface-muted px-4 py-1.5 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        data-testid="player-search"
      />
      {q && (
        <div
          className="absolute right-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-xl"
          data-testid="search-results"
        >
          {matches.length === 0 ? (
            <p className="px-4 py-3 text-sm text-fg-muted">No players found.</p>
          ) : (
            <ul>
              {matches.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/players/${p.id}`}
                    onClick={() => setQuery('')}
                    className="flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-surface-muted"
                    data-testid={`search-result-${p.id}`}
                  >
                    <span className="truncate text-fg">{p.nickname}</span>
                    <span className="text-xs text-fg-subtle">Skill {p.skill ?? '—'}</span>
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
