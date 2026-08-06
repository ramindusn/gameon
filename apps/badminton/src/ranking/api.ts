// Ranking data access (E05 / TASK-6.4) — see ADR 0011. Reads the two public
// leaderboard boards that the recompute-ratings Edge Function maintains
// (player_ratings, pair_ratings; RLS public-read) plus a "recent form" view
// derived from finished game days. Player names are resolved separately via the
// roster (the established id -> nickname Map idiom), so this layer stays purely
// about ratings + results.

import { supabase, isE2E } from '@gameon/supabase'
import {
  ABSENCE_GRACE_PERIOD,
  computeRatings,
  DEFAULT_RATING,
  type MatchRecord,
  type RatingPeriod,
} from '@gameon/domain'

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
export const FORM_LIMIT = 5

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

/**
 * A pair's standing within one fixed-pairs game day.
 *
 * In a tournament both partners always have identical played/wins/diff — they
 * are never apart — so per-player standings list every pair twice as two
 * identical rows. The pair is the unit that competes, so it is the unit that
 * is ranked (TASK-80).
 */
export interface GameDayPairStanding {
  /** The two players, ordered so the same pair always yields the same key. */
  players: [string, string]
  /** `a|b` with the ids sorted — stable across teamA/teamB and round order. */
  pairId: string
  played: number
  wins: number
  diff: number
}

/** Sorted pair key, so Ann+Bob and Bob+Ann are the same pair. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Aggregate one fixed-pairs game day into per-pair standings, ranked by net
 * point differential. Rows with a missing player are skipped: a pair needs both
 * halves to be a pair, and a half-empty team is a casual-day artefact rather
 * than a tournament entry.
 *
 * A pair changed mid-day becomes a separate row from the round it changed, which
 * is the honest reading — the two line-ups did not play the same matches.
 */
export function buildGameDayPairBoard(rows: GameDayResultRow[]): GameDayPairStanding[] {
  const byPair = new Map<string, GameDayPairStanding>()
  const bump = (
    team: [string | null, string | null],
    scoreFor: number,
    scoreAgainst: number,
    won: boolean,
  ) => {
    const [x, y] = team
    if (!x || !y) return
    const key = pairKey(x, y)
    const s = byPair.get(key) ?? {
      players: (x < y ? [x, y] : [y, x]) as [string, string],
      pairId: key,
      played: 0,
      wins: 0,
      diff: 0,
    }
    s.played += 1
    s.wins += won ? 1 : 0
    s.diff += scoreFor - scoreAgainst
    byPair.set(key, s)
  }
  for (const r of rows) {
    const aWon = r.winner === 'a'
    bump(r.teamA, r.scoreA, r.scoreB, aWon)
    bump(r.teamB, r.scoreB, r.scoreA, !aWon)
  }
  return [...byPair.values()].sort(
    (a, b) => b.diff - a.diff || a.pairId.localeCompare(b.pairId),
  )
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
 * Players flagged inactive on the board: those who missed the last
 * ABSENCE_GRACE_PERIOD (5) finished game days in a row — i.e. their absence
 * streak has reached the grace period and their rating is about to decay
 * (TASK-6.5 / TASK-36 / TASK-45). A single missed game day is NOT inactive.
 * The UI adds an "inactive" tag so the drift is explained.
 *
 * Sessions of every kind count here (casual + tournaments), matching the set
 * recompute-ratings/applyAbsenceDecay actually replays (TASK-39 folded
 * tournaments into the same decay streak) — otherwise a player's tournament
 * attendance can reset their real decay streak while this tag, looking only
 * at casual game days, still flags them inactive (TASK-57).
 */
export async function loadInactivePlayers(): Promise<string[]> {
  if (isE2E()) return E2E_INACTIVE
  const db = client()
  // The most recent finished game days of any kind (one attendance snapshot each).
  const { data: sessions } = await db
    .from('match_sessions')
    .select('id')
    .eq('status', 'finished')
    .order('created_at', { ascending: false })
    .limit(ABSENCE_GRACE_PERIOD)
  const ids = (sessions ?? []).map((s) => s.id)
  // Nobody can have missed 5 in a row until there are at least 5 game days.
  if (ids.length < ABSENCE_GRACE_PERIOD) return []

  const { data } = await db
    .from('session_attendance')
    .select('player_id, present')
    .in('session_id', ids)

  return computeInactivePlayers(
    (data ?? []) as AttendanceRow[],
    ABSENCE_GRACE_PERIOD,
  )
}

type AttendanceRow = { player_id: string; present: boolean }

/**
 * A player is inactive only if they have an attendance record for every one
 * of the last `gracePeriod` finished sessions AND was absent from all of
 * them (a full miss streak; playing any of them would have reset it).
 */
export function computeInactivePlayers(
  rows: AttendanceRow[],
  gracePeriod: number,
): string[] {
  const seen = new Map<string, number>()
  const present = new Set<string>()
  for (const r of rows) {
    seen.set(r.player_id, (seen.get(r.player_id) ?? 0) + 1)
    if (r.present) present.add(r.player_id)
  }
  const inactive: string[] = []
  for (const [pid, count] of seen) {
    if (count >= gracePeriod && !present.has(pid)) inactive.push(pid)
  }
  return inactive
}

// ---- recent attendance (setup picker, TASK-64) ----------------------------

/** How many recent finished game days feed the setup picker's attendance sort. */
export const ATTENDANCE_WINDOW = 5
/** Missing this many recent game days in a row leaves a player unchecked by
 *  default on the game-day setup picker, so regulars are pre-selected. */
export const RECENT_ABSENCE_LIMIT = 3

export interface PlayerAttendance {
  /** Present count across the recent window (higher = comes more often). */
  attended: number
  /** Consecutive misses counting back from the most recent rostered game day. */
  missStreak: number
}

type OrderedAttendanceRow = { session_id: string; player_id: string; present: boolean }

/**
 * Per-player recent attendance for the game-day setup picker: how often they've
 * come lately (for sorting) and their current consecutive-miss streak (for the
 * default-unchecked rule). `orderedSessionIds` are the recent finished game days
 * newest-first; a player with no row for a session (joined after it) is skipped
 * for that session, so it neither counts against them nor breaks their streak.
 */
export function computeAttendance(
  rows: OrderedAttendanceRow[],
  orderedSessionIds: string[],
): Record<string, PlayerAttendance> {
  const byPlayer = new Map<string, Map<string, boolean>>()
  for (const r of rows) {
    let m = byPlayer.get(r.player_id)
    if (!m) {
      m = new Map()
      byPlayer.set(r.player_id, m)
    }
    m.set(r.session_id, r.present)
  }
  const out: Record<string, PlayerAttendance> = {}
  for (const [pid, m] of byPlayer) {
    let attended = 0
    let missStreak = 0
    let streakOpen = true // still counting the leading run of misses
    for (const sid of orderedSessionIds) {
      const present = m.get(sid)
      if (present === undefined) continue // not rostered for that game day
      if (present) {
        attended++
        streakOpen = false
      } else if (streakOpen) {
        missStreak++
      }
    }
    out[pid] = { attended, missStreak }
  }
  return out
}

/**
 * Recent attendance for every player who has an attendance record, from the last
 * ATTENDANCE_WINDOW finished game days (any kind). Drives the setup picker's sort
 * and default selection (TASK-64). Empty when there are no finished game days.
 */
export async function loadPlayerAttendance(): Promise<Record<string, PlayerAttendance>> {
  if (isE2E()) return {}
  const db = client()
  const { data: sessions } = await db
    .from('match_sessions')
    .select('id')
    .eq('status', 'finished')
    .order('created_at', { ascending: false })
    .limit(ATTENDANCE_WINDOW)
  const ids = (sessions ?? []).map((s) => s.id) // newest-first
  if (ids.length === 0) return {}

  const { data } = await db
    .from('session_attendance')
    .select('session_id, player_id, present')
    .in('session_id', ids)
  return computeAttendance((data ?? []) as OrderedAttendanceRow[], ids)
}

// ---- per-game-day rating change (TASK-46) ---------------------------------

/**
 * Ranking points each player gained/lost on one game day: the change in their
 * Glicko rating caused by that day's rating period. Replays all finished
 * sessions (casual + tournament, chronological) up to and including the target
 * day, and just before it, and diffs — for the players who played that day.
 */
export async function loadGameDayRatingDeltas(
  sessionId: string,
): Promise<Record<string, number>> {
  if (isE2E()) return {}
  const db = client()
  const { data: sessions } = await db
    .from('match_sessions')
    .select('id, created_at')
    .eq('status', 'finished')
    .order('created_at', { ascending: true })
  const sRows = (sessions ?? []) as { id: string; created_at: string }[]
  const targetIdx = sRows.findIndex((s) => s.id === sessionId)
  if (targetIdx < 0) return {}

  const { data: results } = await db
    .from('match_results')
    .select('session_id, team_a1, team_a2, team_b1, team_b2, winner, score_a, score_b')
  const { data: attendance } = await db
    .from('session_attendance')
    .select('session_id, player_id, present')

  type R = {
    session_id: string
    team_a1: string | null
    team_a2: string | null
    team_b1: string | null
    team_b2: string | null
    winner: string | null
    score_a: number | null
    score_b: number | null
  }
  const toRecord = (r: R): MatchRecord | null => {
    if (!r.team_a1 || !r.team_a2 || !r.team_b1 || !r.team_b2) return null
    let a = r.score_a
    let b = r.score_b
    if (a == null || b == null) {
      if (r.winner === 'a') [a, b] = [1, 0]
      else if (r.winner === 'b') [a, b] = [0, 1]
      else return null
    }
    return { teamA: [r.team_a1, r.team_a2], teamB: [r.team_b1, r.team_b2], scoreA: a, scoreB: b }
  }

  const bySession = new Map<string, MatchRecord[]>()
  for (const r of (results ?? []) as R[]) {
    const rec = toRecord(r)
    if (!rec) continue
    ;(bySession.get(r.session_id) ?? bySession.set(r.session_id, []).get(r.session_id)!).push(rec)
  }
  const absBySession = new Map<string, string[]>()
  for (const a of (attendance ?? []) as { session_id: string; player_id: string; present: boolean }[]) {
    if (a.present) continue
    ;(absBySession.get(a.session_id) ?? absBySession.set(a.session_id, []).get(a.session_id)!).push(
      a.player_id,
    )
  }

  const ratingsAfter = (count: number): Map<string, number> => {
    const periods: RatingPeriod[] = sRows.slice(0, count).map((s) => ({
      matches: bySession.get(s.id) ?? [],
      absentees: absBySession.get(s.id) ?? [],
    }))
    return new Map(computeRatings(periods).players.map((p) => [p.id, p.rating]))
  }
  const before = ratingsAfter(targetIdx)
  const after = ratingsAfter(targetIdx + 1)

  const played = new Set<string>()
  for (const m of bySession.get(sessionId) ?? []) {
    for (const pid of [...m.teamA, ...m.teamB]) played.add(pid)
  }
  const deltas: Record<string, number> = {}
  for (const pid of played) {
    deltas[pid] = (after.get(pid) ?? DEFAULT_RATING) - (before.get(pid) ?? DEFAULT_RATING)
  }
  return deltas
}

// ---- Rating history (profile trend + rank context, TASK-55) ---------------

/** The player's rating after one finished game day. */
export interface RatingHistoryPoint {
  sessionId: string
  playedAt: string
  rating: number
}

export interface RatingContext {
  /** Rating after each finished game day since the player first appeared. */
  points: RatingHistoryPoint[]
  /** Leaderboard rank among established players (null while provisional). */
  rank: number | null
  /** Rank after the previous game day (null if unranked then). */
  prevRank: number | null
  /** True while the rating is still settling (high RD). */
  provisional: boolean
}

const EMPTY_RATING_CONTEXT: RatingContext = {
  points: [],
  rank: null,
  prevRank: null,
  provisional: true,
}

/**
 * Replay every finished game day through the rating engine (same maths as the
 * leaderboard) and extract one player's rating after each day, plus their
 * current rank and the rank they held after the previous day. Mirrors
 * loadGameDayRatingDeltas' replay so the profile agrees with the boards.
 */
/**
 * A player's leaderboard rank: their position among the established (low-RD),
 * non-inactive players by rating. Returns null when the player is provisional
 * or inactive — they never hold a rank, mirroring the leaderboard (TASK-58/68).
 */
export function computeRank(
  players: { id: string; rating: number; rd: number }[],
  playerId: string,
  inactive: ReadonlySet<string>,
): number | null {
  const me = players.find((p) => p.id === playerId)
  if (!me || me.rd >= PROVISIONAL_RD || inactive.has(playerId)) return null
  return (
    players.filter((p) => p.rd < PROVISIONAL_RD && !inactive.has(p.id) && p.rating > me.rating)
      .length + 1
  )
}

export async function loadRatingHistory(playerId: string): Promise<RatingContext> {
  if (isE2E()) {
    const row = E2E_PLAYER_BOARD.find((p) => p.playerId === playerId)
    if (!row || row.rd >= PROVISIONAL_RD || E2E_INACTIVE.includes(playerId)) {
      return EMPTY_RATING_CONTEXT
    }
    const rank = E2E_PLAYER_BOARD.filter(
      (p) => p.rd < PROVISIONAL_RD && !E2E_INACTIVE.includes(p.playerId) && p.rating > row.rating,
    ).length
    return { points: [], rank: rank + 1, prevRank: rank + 1, provisional: false }
  }
  const db = client()
  const { data: sessions } = await db
    .from('match_sessions')
    .select('id, created_at, played_at')
    .eq('status', 'finished')
    .order('created_at', { ascending: true })
  const sRows = (sessions ?? []) as { id: string; created_at: string; played_at: string }[]
  if (sRows.length === 0) return EMPTY_RATING_CONTEXT

  const { data: results } = await db
    .from('match_results')
    .select('session_id, team_a1, team_a2, team_b1, team_b2, winner, score_a, score_b')
  const { data: attendance } = await db
    .from('session_attendance')
    .select('session_id, player_id, present')

  type R = {
    session_id: string
    team_a1: string | null
    team_a2: string | null
    team_b1: string | null
    team_b2: string | null
    winner: string | null
    score_a: number | null
    score_b: number | null
  }
  const toRecord = (r: R): MatchRecord | null => {
    if (!r.team_a1 || !r.team_a2 || !r.team_b1 || !r.team_b2) return null
    let a = r.score_a
    let b = r.score_b
    if (a == null || b == null) {
      if (r.winner === 'a') [a, b] = [1, 0]
      else if (r.winner === 'b') [a, b] = [0, 1]
      else return null
    }
    return { teamA: [r.team_a1, r.team_a2], teamB: [r.team_b1, r.team_b2], scoreA: a, scoreB: b }
  }
  const bySession = new Map<string, MatchRecord[]>()
  for (const r of (results ?? []) as R[]) {
    const rec = toRecord(r)
    if (!rec) continue
    ;(bySession.get(r.session_id) ?? bySession.set(r.session_id, []).get(r.session_id)!).push(rec)
  }
  const absBySession = new Map<string, string[]>()
  for (const a of (attendance ?? []) as { session_id: string; player_id: string; present: boolean }[]) {
    if (a.present) continue
    ;(absBySession.get(a.session_id) ?? absBySession.set(a.session_id, []).get(a.session_id)!).push(
      a.player_id,
    )
  }

  const periods: RatingPeriod[] = sRows.map((s) => ({
    matches: bySession.get(s.id) ?? [],
    absentees: absBySession.get(s.id) ?? [],
  }))

  // First game day the player actually appears in — the trend starts there.
  const firstIdx = sRows.findIndex((s) =>
    (bySession.get(s.id) ?? []).some((m) => [...m.teamA, ...m.teamB].includes(playerId)),
  )
  if (firstIdx === -1) return EMPTY_RATING_CONTEXT

  // Inactive players (missed the last ABSENCE_GRACE_PERIOD finished game days)
  // are excluded from the ranking, same as the leaderboard (TASK-58/68).
  const recentIds = new Set(sRows.slice(-ABSENCE_GRACE_PERIOD).map((s) => s.id))
  const recentAttendance = (
    (attendance ?? []) as { session_id: string; player_id: string; present: boolean }[]
  ).filter((a) => recentIds.has(a.session_id))
  const inactive = new Set(computeInactivePlayers(recentAttendance, ABSENCE_GRACE_PERIOD))

  const rankOf = (players: { id: string; rating: number; rd: number }[]): number | null =>
    computeRank(players, playerId, inactive)

  const points: RatingHistoryPoint[] = []
  let rank: number | null = null
  let prevRank: number | null = null
  let provisional = true
  for (let i = firstIdx; i < sRows.length; i++) {
    const out = computeRatings(periods.slice(0, i + 1))
    const me = out.players.find((p) => p.id === playerId)
    points.push({
      sessionId: sRows[i].id,
      playedAt: sRows[i].played_at,
      rating: me?.rating ?? DEFAULT_RATING,
    })
    if (i === sRows.length - 2) prevRank = rankOf(out.players)
    if (i === sRows.length - 1) {
      rank = rankOf(out.players)
      provisional = !me || me.rd >= PROVISIONAL_RD
    }
  }
  return { points, rank, prevRank, provisional }
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
