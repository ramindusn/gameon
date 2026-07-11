// Ranking data access (E05 / TASK-6.4) — see ADR 0011. Reads the two public
// leaderboard boards that the recompute-ratings Edge Function maintains
// (player_ratings, pair_ratings; RLS public-read) plus a "recent form" view
// derived from finished game days. Player names are resolved separately via the
// roster (the established id -> nickname Map idiom), so this layer stays purely
// about ratings + results.

import { supabase, isE2E } from '@gameon/supabase'
import { computeRatings, type MatchRecord, type RatingPeriod } from '@gameon/domain'

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

// ---- per-game-day board (TASK-33) -----------------------------------------

/** One scored court from a single game day, for the day-scoped board. */
export interface GameDayResultRow {
  teamA: [string | null, string | null]
  teamB: [string | null, string | null]
  scoreA: number
  scoreB: number
  winner: 'a' | 'b'
}

/** A player's standing within one game day, ranked by net point differential. */
export interface GameDayStanding {
  playerId: string
  played: number
  wins: number
  /** Net point differential: points scored minus conceded across the day. */
  diff: number
}

/** The latest game day's standings, surfaced on the public home (TASK-33). */
export interface GameDayBoard {
  sessionId: string
  playedAt: string
  standings: GameDayStanding[]
}

/**
 * Aggregate one game day's scored courts into per-player standings ranked by
 * net point differential (points scored minus conceded across the day). Ties in
 * differential are ordered by playerId here for a deterministic result; the UI
 * applies the nickname tie-break once names are resolved (TASK-33).
 */
export function buildGameDayBoard(rows: GameDayResultRow[]): GameDayStanding[] {
  const byPlayer = new Map<string, GameDayStanding>()
  const bump = (
    pid: string | null,
    scoreFor: number,
    scoreAgainst: number,
    won: boolean,
  ) => {
    if (!pid) return
    const s = byPlayer.get(pid) ?? { playerId: pid, played: 0, wins: 0, diff: 0 }
    s.played += 1
    s.wins += won ? 1 : 0
    s.diff += scoreFor - scoreAgainst
    byPlayer.set(pid, s)
  }
  for (const r of rows) {
    const aWon = r.winner === 'a'
    for (const pid of r.teamA) bump(pid, r.scoreA, r.scoreB, aWon)
    for (const pid of r.teamB) bump(pid, r.scoreB, r.scoreA, !aWon)
  }
  return [...byPlayer.values()].sort(
    (a, b) => b.diff - a.diff || a.playerId.localeCompare(b.playerId),
  )
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
      'session_id, team_a1, team_a2, team_b1, team_b2, winner, match_sessions!inner(created_at, status, kind)',
    )
    .eq('match_sessions.status', 'finished')
    .eq('match_sessions.kind', 'casual')
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
 * Every casual game day that has at least one scored match, each with its
 * per-player standings (net point differential), newest game day first. The
 * public home shows [0] and lets the visitor page back through the rest
 * (TASK-33 / TASK-37). Empty when no game day has been scored yet.
 */
export async function loadGameDayBoards(): Promise<GameDayBoard[]> {
  if (isE2E()) return E2E_GAME_DAY_BOARDS
  const { data } = await client()
    .from('match_results')
    .select(
      'session_id, team_a1, team_a2, team_b1, team_b2, score_a, score_b, winner, match_sessions!inner(played_at, kind, hidden)',
    )
    .eq('match_sessions.kind', 'casual')
    .eq('match_sessions.hidden', false)
    .not('winner', 'is', null)

  type Row = {
    session_id: string
    team_a1: string | null
    team_a2: string | null
    team_b1: string | null
    team_b2: string | null
    score_a: number | null
    score_b: number | null
    winner: string | null
    match_sessions: { played_at: string } | { played_at: string }[]
  }
  const rows = (data ?? []) as Row[]
  if (rows.length === 0) return []

  const playedAtOf = (r: Row): string => {
    // PostgREST returns the to-one embed as an object; guard the array shape.
    const s = Array.isArray(r.match_sessions) ? r.match_sessions[0] : r.match_sessions
    return s?.played_at ?? ''
  }

  // Group the scored courts by game day, keeping each day's date.
  const bySession = new Map<string, { playedAt: string; rows: GameDayResultRow[] }>()
  for (const r of rows) {
    const entry = bySession.get(r.session_id) ?? { playedAt: playedAtOf(r), rows: [] }
    entry.rows.push({
      teamA: [r.team_a1, r.team_a2],
      teamB: [r.team_b1, r.team_b2],
      scoreA: r.score_a ?? 0,
      scoreB: r.score_b ?? 0,
      winner: r.winner === 'b' ? 'b' : 'a',
    })
    bySession.set(r.session_id, entry)
  }

  return [...bySession.entries()]
    .map(([sessionId, { playedAt, rows }]): GameDayBoard => ({
      sessionId,
      playedAt,
      standings: buildGameDayBoard(rows),
    }))
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
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

// ---- fixed-pairs tournament board (E11) -----------------------------------

/**
 * The isolated Fixed Pairs leaderboard, ranked with the SAME Glicko-2 technique
 * as the doubles board but computed only over finished tournament sessions (one
 * session = one rating period, chronological). Computed on read from the public
 * match tables; kept entirely separate from the casual boards. Public read.
 */
export async function loadTournamentPairBoard(): Promise<RatedPair[]> {
  if (isE2E()) return E2E_TOURNAMENT_BOARD
  const db = client()
  const { data: sessions } = await db
    .from('match_sessions')
    .select('id, created_at')
    .eq('status', 'finished')
    .eq('kind', 'tournament')
    .order('created_at', { ascending: true })
  const sRows = (sessions ?? []) as { id: string; created_at: string }[]
  if (sRows.length === 0) return []

  const { data: results } = await db
    .from('match_results')
    .select('session_id, team_a1, team_a2, team_b1, team_b2, score_a, score_b')
    .in(
      'session_id',
      sRows.map((s) => s.id),
    )
  type R = {
    session_id: string
    team_a1: string | null
    team_a2: string | null
    team_b1: string | null
    team_b2: string | null
    score_a: number | null
    score_b: number | null
  }
  const bySession = new Map<string, MatchRecord[]>()
  for (const r of (results ?? []) as R[]) {
    if (!r.team_a1 || !r.team_a2 || !r.team_b1 || !r.team_b2) continue
    if (r.score_a == null || r.score_b == null) continue
    const rec: MatchRecord = {
      teamA: [r.team_a1, r.team_a2],
      teamB: [r.team_b1, r.team_b2],
      scoreA: r.score_a,
      scoreB: r.score_b,
    }
    const list = bySession.get(r.session_id)
    if (list) list.push(rec)
    else bySession.set(r.session_id, [rec])
  }
  const periods: RatingPeriod[] = sRows.map((s) => ({ matches: bySession.get(s.id) ?? [] }))
  const tables = computeRatings(periods)
  return tables.pairs.map((p) => {
    const [a, b] = p.players[0] < p.players[1] ? p.players : [p.players[1], p.players[0]]
    return { player1Id: a, player2Id: b, rating: p.rating, rd: p.rd, games: p.games }
  })
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

// The two tail players skipped the latest game day — flagged inactive (a single
// skip is within the grace period, so no rating decay yet; see ADR 0011 / TASK-36).
const E2E_INACTIVE: string[] = ['e2e-7', 'e2e-8']

// Game-day board seed (TASK-33 / TASK-37): two casual game days, newest first,
// each ranked by net point differential (strongest first). Two days let the
// public home's paging arrows be exercised.
const E2E_GAME_DAY_BOARDS: GameDayBoard[] = [
  {
    sessionId: 'e2e-day-2',
    playedAt: '2026-07-10T18:00:00Z',
    standings: [
      { playerId: 'e2e-1', played: 3, wins: 3, diff: 34 },
      { playerId: 'e2e-2', played: 3, wins: 2, diff: 17 },
      { playerId: 'e2e-3', played: 3, wins: 2, diff: 8 },
      { playerId: 'e2e-4', played: 3, wins: 1, diff: -6 },
      { playerId: 'e2e-5', played: 3, wins: 1, diff: -18 },
      { playerId: 'e2e-6', played: 3, wins: 0, diff: -35 },
    ],
  },
  {
    sessionId: 'e2e-day-1',
    playedAt: '2026-07-03T18:00:00Z',
    standings: [
      { playerId: 'e2e-3', played: 2, wins: 2, diff: 21 },
      { playerId: 'e2e-5', played: 2, wins: 1, diff: 4 },
      { playerId: 'e2e-2', played: 2, wins: 1, diff: -3 },
      { playerId: 'e2e-8', played: 2, wins: 0, diff: -22 },
    ],
  },
]

// Fixed-pairs tournament board seed (E11) — Glicko-rated, like the doubles board.
const E2E_TOURNAMENT_BOARD: RatedPair[] = [
  { player1Id: 'e2e-1', player2Id: 'e2e-2', rating: 1635, rd: 60, games: 6 },
  { player1Id: 'e2e-3', player2Id: 'e2e-4', rating: 1560, rd: 75, games: 5 },
  { player1Id: 'e2e-5', player2Id: 'e2e-6', rating: 1505, rd: 95, games: 4 },
  { player1Id: 'e2e-7', player2Id: 'e2e-8', rating: 1470, rd: 120, games: 3 },
]
