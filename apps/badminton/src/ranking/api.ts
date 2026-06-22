// Ranking data access (E05 / TASK-6.4) — see ADR 0011. Reads the two public
// leaderboard boards that the recompute-ratings Edge Function maintains
// (player_ratings, pair_ratings; RLS public-read) plus a "recent form" view
// derived from finished game days. Player names are resolved separately via the
// roster (the established id -> nickname Map idiom), so this layer stays purely
// about ratings + results.

import { supabase, isE2E } from '@gameon/supabase'

/** One rated player from the individual board (strongest first). */
export interface RatedPlayer {
  playerId: string
  rating: number
  rd: number
  games: number
}

/** One rated partnership from the doubles board (strongest first). */
export interface RatedPair {
  player1Id: string
  player2Id: string
  rating: number
  rd: number
  games: number
}

/** A single game day's outcome for a player: win, loss, or an even split. */
export type FormResult = 'W' | 'L' | 'D'

/** playerId -> recent game-day results, newest first (capped at FORM_LIMIT). */
export type FormMap = Record<string, FormResult[]>

/** How many recent game days the "recent form" strip shows. */
export const FORM_LIMIT = 10

/** A high RD means few games — the rating is still provisional (Glicko-2). */
export const PROVISIONAL_RD = 150

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

// ---- row mappers (pure, unit-tested) --------------------------------------

export const mapPlayerRatingRow = (r: {
  player_id: string
  rating: number
  rd: number
  games: number
}): RatedPlayer => ({
  playerId: r.player_id,
  rating: r.rating,
  rd: r.rd,
  games: r.games,
})

export const mapPairRatingRow = (r: {
  player1_id: string
  player2_id: string
  rating: number
  rd: number
  games: number
}): RatedPair => ({
  player1Id: r.player1_id,
  player2Id: r.player2_id,
  rating: r.rating,
  rd: r.rd,
  games: r.games,
})

// ---- recent form (pure) ---------------------------------------------------

/** A finished court result, normalised for form aggregation. */
export interface FormResultRow {
  sessionId: string
  createdAt: string
  teamA: [string | null, string | null]
  teamB: [string | null, string | null]
  winner: 'a' | 'b'
}

/**
 * Collapse finished court results into each player's recent game-day form.
 * Results are grouped per player per game day (session); a day is a Win if the
 * player won more of their courts than they lost, a Loss if fewer, else a Draw.
 * Days are returned newest-first, capped at `limit`.
 */
export function buildFormMap(rows: FormResultRow[], limit = FORM_LIMIT): FormMap {
  // player -> sessionId -> tally
  const byPlayer = new Map<string, Map<string, { w: number; l: number; at: string }>>()

  const bump = (pid: string | null, sessionId: string, at: string, won: boolean) => {
    if (!pid) return
    let days = byPlayer.get(pid)
    if (!days) {
      days = new Map()
      byPlayer.set(pid, days)
    }
    const day = days.get(sessionId) ?? { w: 0, l: 0, at }
    if (won) day.w += 1
    else day.l += 1
    days.set(sessionId, day)
  }

  for (const r of rows) {
    const winners = r.winner === 'a' ? r.teamA : r.teamB
    const losers = r.winner === 'a' ? r.teamB : r.teamA
    for (const pid of winners) bump(pid, r.sessionId, r.createdAt, true)
    for (const pid of losers) bump(pid, r.sessionId, r.createdAt, false)
  }

  const form: FormMap = {}
  for (const [pid, days] of byPlayer) {
    form[pid] = [...days.values()]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit)
      .map(({ w, l }): FormResult => (w > l ? 'W' : l > w ? 'L' : 'D'))
  }
  return form
}

// ---- data access ----------------------------------------------------------

const PLAYER_COLS = 'player_id, rating, rd, games'
const PAIR_COLS = 'player1_id, player2_id, rating, rd, games'

/** The individual leaderboard, strongest first. */
export async function loadPlayerBoard(): Promise<RatedPlayer[]> {
  if (isE2E()) return E2E_PLAYER_BOARD
  const { data } = await client()
    .from('player_ratings')
    .select(PLAYER_COLS)
    .order('rating', { ascending: false })
  return (data ?? []).map(mapPlayerRatingRow)
}

/** The doubles (per-pair) leaderboard, strongest first. */
export async function loadPairBoard(): Promise<RatedPair[]> {
  if (isE2E()) return E2E_PAIR_BOARD
  const { data } = await client()
    .from('pair_ratings')
    .select(PAIR_COLS)
    .order('rating', { ascending: false })
  return (data ?? []).map(mapPairRatingRow)
}

/** Recent game-day form for every player, derived from finished sessions. */
export async function loadRecentForm(): Promise<FormMap> {
  if (isE2E()) return E2E_FORM
  const { data } = await client()
    .from('match_results')
    .select(
      'session_id, team_a1, team_a2, team_b1, team_b2, winner, match_sessions!inner(created_at, status)',
    )
    .eq('match_sessions.status', 'finished')
    .not('winner', 'is', null)

  type Row = {
    session_id: string
    team_a1: string | null
    team_a2: string | null
    team_b1: string | null
    team_b2: string | null
    winner: string | null
    match_sessions: { created_at: string } | { created_at: string }[]
  }
  const rows: FormResultRow[] = ((data ?? []) as Row[]).map((r) => {
    // PostgREST returns the to-one embed as an object; guard the array shape.
    const session = Array.isArray(r.match_sessions) ? r.match_sessions[0] : r.match_sessions
    return {
      sessionId: r.session_id,
      createdAt: session?.created_at ?? '',
      teamA: [r.team_a1, r.team_a2],
      teamB: [r.team_b1, r.team_b2],
      winner: r.winner === 'b' ? 'b' : 'a',
    }
  })
  return buildFormMap(rows)
}

/**
 * Players flagged inactive on the board: those who were absent from the most
 * recent finished game day (TASK-6.5). Their rating has already decayed; the UI
 * adds an "inactive" tag so the drop is explained.
 */
export async function loadInactivePlayers(): Promise<string[]> {
  if (isE2E()) return E2E_INACTIVE
  const db = client()
  const { data: latest } = await db
    .from('match_sessions')
    .select('id')
    .eq('status', 'finished')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!latest) return []
  const { data } = await db
    .from('session_attendance')
    .select('player_id')
    .eq('session_id', latest.id)
    .eq('present', false)
  return (data ?? []).map((r) => r.player_id)
}

// ---- E2E seed -------------------------------------------------------------
// E2E builds run with VITE_E2E=1 and no Supabase env (the client is null), so —
// mirroring the roster's fixed 8-player club (e2e-1…e2e-8) — the boards resolve
// to a deterministic seed. This lets the public Home + /leaderboard render real
// ranking rows under Playwright without a live database.

const E2E_PLAYER_BOARD: RatedPlayer[] = Array.from({ length: 8 }, (_, i) => ({
  playerId: `e2e-${i + 1}`,
  rating: 1600 - i * 25,
  rd: 50 + i * 12,
  games: 12 - i,
}))

const E2E_PAIR_BOARD: RatedPair[] = [
  { player1Id: 'e2e-1', player2Id: 'e2e-2', rating: 1620, rd: 55, games: 8 },
  { player1Id: 'e2e-3', player2Id: 'e2e-4', rating: 1575, rd: 70, games: 6 },
  { player1Id: 'e2e-5', player2Id: 'e2e-6', rating: 1530, rd: 90, games: 5 },
  { player1Id: 'e2e-7', player2Id: 'e2e-8', rating: 1495, rd: 110, games: 4 },
]

const E2E_FORM: FormMap = {
  'e2e-1': ['W', 'W', 'L', 'W', 'W'],
  'e2e-2': ['W', 'L', 'W', 'W', 'L'],
  'e2e-3': ['L', 'W', 'W', 'D', 'L'],
  'e2e-4': ['W', 'L', 'L', 'W', 'D'],
  'e2e-5': ['L', 'L', 'W', 'L', 'W'],
  'e2e-6': ['D', 'L', 'W', 'L', 'L'],
  'e2e-7': ['L', 'L', 'L', 'W', 'L'],
  'e2e-8': ['L', 'W', 'L', 'L', 'L'],
}

// The two tail players skipped the latest game day — decayed + flagged inactive.
const E2E_INACTIVE: string[] = ['e2e-7', 'e2e-8']
