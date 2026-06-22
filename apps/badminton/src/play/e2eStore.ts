// E2E in-memory match-play store. E2E builds run with VITE_E2E=1 and no Supabase
// env (the real client is null), so play/api.ts branches to these primitives
// instead of hitting the database. State is persisted in sessionStorage so it
// survives full page reloads within the tab — letting e2e tests navigate with
// page.goto and still find the session they just created. It clears when the
// tab/context closes (each Playwright test gets a fresh context).
//
// Only TYPES are imported from ./api (erased at runtime), so there is no runtime
// import cycle: api.ts orchestrates and calls these helpers.
import type { MatchSession, MatchResult, SessionStatus, Side, ResultInsert } from './api'
const SESSIONS_KEY = 'gameon.e2e.sessions'
const RESULTS_KEY = 'gameon.e2e.results'

function read<T>(key: string): T[] {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? '[]') as T[]
  } catch {
    return []
  }
}

function write<T>(key: string, rows: T[]): void {
  sessionStorage.setItem(key, JSON.stringify(rows))
}

let seq = 0
/** Monotonic, stable id for E2E (no crypto/uuid needed). */
export const e2eUid = (prefix: string) => `${prefix}-e2e-${Date.now()}-${++seq}`

/** Insert a session + its result rows. */
export function e2ePut(session: MatchSession, rows: ResultInsert[]): string {
  write(SESSIONS_KEY, [...read<MatchSession>(SESSIONS_KEY), session])
  const results = read<MatchResult>(RESULTS_KEY)
  for (const row of rows) {
    results.push({
      id: e2eUid('result'),
      sessionId: session.id,
      round: row.round,
      court: row.court,
      teamA: [row.team_a1, row.team_a2],
      teamB: [row.team_b1, row.team_b2],
      scoreA: null,
      scoreB: null,
      winner: null,
    })
  }
  write(RESULTS_KEY, results)
  return session.id
}

/** All sessions, newest game day first. */
export function e2eList(): MatchSession[] {
  return read<MatchSession>(SESSIONS_KEY).sort((a, b) =>
    b.playedAt.localeCompare(a.playedAt),
  )
}

/** One session + its results (ordered by round then court), or null. */
export function e2eGet(
  id: string,
): { session: MatchSession; results: MatchResult[] } | null {
  const session = read<MatchSession>(SESSIONS_KEY).find((s) => s.id === id)
  if (!session) return null
  const results = read<MatchResult>(RESULTS_KEY)
    .filter((r) => r.sessionId === id)
    .sort((a, b) => a.round - b.round || a.court - b.court)
  return { session, results }
}

/** A result joined to its owning session, for the public home feed. */
export interface E2EFeedRow {
  result: MatchResult
  session: MatchSession
}

/** Every result joined to its session (used to build the home feed). */
export function e2eFeed(): E2EFeedRow[] {
  const byId = new Map(read<MatchSession>(SESSIONS_KEY).map((s) => [s.id, s]))
  const rows: E2EFeedRow[] = []
  for (const result of read<MatchResult>(RESULTS_KEY)) {
    const session = byId.get(result.sessionId)
    if (session) rows.push({ result, session })
  }
  return rows
}

/** Record a court's point scores + derived winner. */
export function e2eSetScore(
  resultId: string,
  scoreA: number,
  scoreB: number,
  winner: Side,
): void {
  const results = read<MatchResult>(RESULTS_KEY)
  const i = results.findIndex((r) => r.id === resultId)
  if (i >= 0) {
    results[i] = { ...results[i], scoreA, scoreB, winner }
    write(RESULTS_KEY, results)
  }
}

/** Replace a match's four players; clears its (now stale) score + winner. */
export function e2eUpdateLineup(
  resultId: string,
  teamA: [string, string],
  teamB: [string, string],
): void {
  const results = read<MatchResult>(RESULTS_KEY)
  const i = results.findIndex((r) => r.id === resultId)
  if (i >= 0) {
    results[i] = {
      ...results[i],
      teamA,
      teamB,
      scoreA: null,
      scoreB: null,
      winner: null,
    }
    write(RESULTS_KEY, results)
  }
}

/** Insert an ad-hoc match into a session. */
export function e2eAddMatch(
  sessionId: string,
  round: number,
  court: number,
  players: [string, string, string, string],
): void {
  const results = read<MatchResult>(RESULTS_KEY)
  results.push({
    id: e2eUid('result'),
    sessionId,
    round,
    court,
    teamA: [players[0], players[1]],
    teamB: [players[2], players[3]],
    scoreA: null,
    scoreB: null,
    winner: null,
  })
  write(RESULTS_KEY, results)
}

/** Delete a single match row. */
export function e2eDeleteMatch(resultId: string): void {
  write(
    RESULTS_KEY,
    read<MatchResult>(RESULTS_KEY).filter((r) => r.id !== resultId),
  )
}

/** Flip a session between live/finished. */export function e2eSetStatus(id: string, status: SessionStatus): void {
  const sessions = read<MatchSession>(SESSIONS_KEY)
  const i = sessions.findIndex((s) => s.id === id)
  if (i >= 0) {
    sessions[i] = { ...sessions[i], status }
    write(SESSIONS_KEY, sessions)
  }
}

/** Update a game day's date/time. */
export function e2eSetPlayedAt(id: string, playedAt: string): void {
  const sessions = read<MatchSession>(SESSIONS_KEY)
  const i = sessions.findIndex((s) => s.id === id)
  if (i >= 0) {
    sessions[i] = { ...sessions[i], playedAt }
    write(SESSIONS_KEY, sessions)
  }
}

/** Delete a game day and its result rows. */
export function e2eDelete(id: string): void {
  write(
    SESSIONS_KEY,
    read<MatchSession>(SESSIONS_KEY).filter((s) => s.id !== id),
  )
  write(
    RESULTS_KEY,
    read<MatchResult>(RESULTS_KEY).filter((r) => r.sessionId !== id),
  )
}
