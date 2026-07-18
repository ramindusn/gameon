// Match-play data access (E04 / TASK-5.2). A matchmaker turns a generated draw
// (@gameon/domain GeneratedMatches) into a persisted session: one match_sessions
// row + one match_results row per court. Winners are recorded per result; the
// session is marked finished when play is done. Reads are public (RLS); writes
// are limited by RLS to admins/matchmakers of the club.

import { supabase, isE2E } from '@gameon/supabase'
import { deriveWinner, type GeneratedMatches } from '@gameon/domain'
import {
  e2eUid,
  e2ePut,
  e2eList,
  e2eGet,
  e2eFeed,
  e2eSetScore,
  e2eSetStatus,
  e2eSetHidden,
  e2eSetPlayedAt,
  e2eDelete,
  e2eUpdateLineup,
  e2eAddMatch,
  e2eDeleteMatch,
} from './e2eStore'

export type SessionStatus = 'live' | 'finished'
export type Mode = 'open' | 'mixed'
export type Side = 'a' | 'b'
/** A casual game day feeds the Glicko boards; a tournament is isolated (E11). */
export type SessionKind = 'casual' | 'tournament'

export interface MatchSession {
  id: string
  clubId: string
  status: SessionStatus
  mode: Mode
  kind: SessionKind
  rounds: number
  /** Hidden from the public home's Game Day Podium (TASK-38). */
  hidden: boolean
  /** The game-day date/time the matchmaker chose (editable). */
  playedAt: string
  createdAt: string
}

/** A single court within a session. Player ids may be null if a roster player
 *  was later deleted (FK ON DELETE SET NULL). Scores/winner are null until the
 *  match is played; winner is derived from the scores. */
export interface MatchResult {
  id: string
  sessionId: string
  round: number
  court: number
  teamA: [string | null, string | null]
  teamB: [string | null, string | null]
  scoreA: number | null
  scoreB: number | null
  winner: Side | null
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

// ---- row mappers ----------------------------------------------------------

export const mapSessionRow = (r: {
  id: string
  club_id: string
  status: string
  mode: string
  kind?: string | null
  rounds: number
  hidden?: boolean | null
  played_at: string
  created_at: string
}): MatchSession => ({
  id: r.id,
  clubId: r.club_id,
  status: r.status as SessionStatus,
  mode: r.mode as Mode,
  kind: (r.kind as SessionKind) ?? 'casual',
  rounds: r.rounds,
  hidden: r.hidden ?? false,
  playedAt: r.played_at,
  createdAt: r.created_at,
})

export const mapResultRow = (r: {
  id: string
  session_id: string
  round: number
  court: number
  team_a1: string | null
  team_a2: string | null
  team_b1: string | null
  team_b2: string | null
  score_a: number | null
  score_b: number | null
  winner: string | null
}): MatchResult => ({
  id: r.id,
  sessionId: r.session_id,
  round: r.round,
  court: r.court,
  teamA: [r.team_a1, r.team_a2],
  teamB: [r.team_b1, r.team_b2],
  scoreA: r.score_a,
  scoreB: r.score_b,
  winner: (r.winner as Side | null) ?? null,
})

// ---- plan -> result rows (pure) -------------------------------------------

export interface ResultInsert {
  club_id: string
  session_id: string
  round: number
  court: number
  team_a1: string
  team_a2: string
  team_b1: string
  team_b2: string
}

/**
 * Flatten a generated draw into match_results insert rows: one per court, with
 * 1-based round/court numbers and the four player ids. Winner is left unset.
 */
export function planToResultRows(
  plan: GeneratedMatches,
  sessionId: string,
  clubId: string,
): ResultInsert[] {
  const rows: ResultInsert[] = []
  plan.rounds.forEach((round, ri) => {
    round.matches.forEach((match, ci) => {
      const [teamA, teamB] = match
      rows.push({
        club_id: clubId,
        session_id: sessionId,
        round: ri + 1,
        court: ci + 1,
        team_a1: String(teamA[0].id),
        team_a2: String(teamA[1].id),
        team_b1: String(teamB[0].id),
        team_b2: String(teamB[1].id),
      })
    })
  })
  return rows
}

// ---- data access ----------------------------------------------------------

const SESSION_COLS = 'id, club_id, status, mode, kind, rounds, hidden, played_at, created_at'
const RESULT_COLS =
  'id, session_id, round, court, team_a1, team_a2, team_b1, team_b2, score_a, score_b, winner'

/**
 * Persist a generated draw as a live game day: insert the session (with the
 * matchmaker-chosen date/time), then its result rows (one per court). Returns
 * the new session id.
 */
export async function createSessionFromPlan(
  clubId: string,
  plan: GeneratedMatches,
  mode: Mode,
  playedAt: string,
): Promise<string> {
  if (isE2E()) {
    const id = e2eUid('session')
    return e2ePut(
      {
        id,
        clubId,
        status: 'live',
        mode,
        kind: 'casual',
        rounds: plan.rounds.length,
        hidden: false,
        playedAt,
        createdAt: new Date().toISOString(),
      },
      planToResultRows(plan, id, clubId),
    )
  }
  const db = client()
  const { data: session, error: sErr } = await db
    .from('match_sessions')
    .insert({
      club_id: clubId,
      mode,
      rounds: plan.rounds.length,
      status: 'live',
      played_at: playedAt,
    })
    .select('id')
    .single()
  if (sErr) throw sErr

  const rows = planToResultRows(plan, session.id, clubId)
  if (rows.length > 0) {
    const { error: rErr } = await db.from('match_results').insert(rows)
    if (rErr) throw rErr
  }
  return session.id
}

/** One generated round-robin fixture: two fixed pairs on a round + court. */
export interface TournamentFixture {
  round: number
  court: number
  teamA: [string, string]
  teamB: [string, string]
}

/**
 * Create a fixed-pairs tournament game day pre-filled with its round-robin
 * fixtures (E11). The matchmaker locks pairs + generates matches up front, then
 * just enters scores on the play screen. Returns the new session id.
 */
export async function createTournamentWithMatches(
  clubId: string,
  playedAt: string,
  fixtures: TournamentFixture[],
): Promise<string> {
  const rounds = Math.max(1, ...fixtures.map((f) => f.round))
  const toRows = (sessionId: string): ResultInsert[] =>
    fixtures.map((f) => ({
      club_id: clubId,
      session_id: sessionId,
      round: f.round,
      court: f.court,
      team_a1: f.teamA[0],
      team_a2: f.teamA[1],
      team_b1: f.teamB[0],
      team_b2: f.teamB[1],
    }))

  if (isE2E()) {
    const id = e2eUid('session')
    return e2ePut(
      {
        id,
        clubId,
        status: 'live',
        mode: 'open',
        kind: 'tournament',
        rounds,
        hidden: false,
        playedAt,
        createdAt: new Date().toISOString(),
      },
      toRows(id),
    )
  }
  const db = client()
  const { data: session, error } = await db
    .from('match_sessions')
    .insert({
      club_id: clubId,
      mode: 'open',
      kind: 'tournament',
      rounds,
      status: 'live',
      played_at: playedAt,
    })
    .select('id')
    .single()
  if (error) throw error
  const rows = toRows(session.id)
  if (rows.length > 0) {
    const { error: rErr } = await db.from('match_results').insert(rows)
    if (rErr) throw rErr
  }
  return session.id
}

/** All game days for the club(s) the caller can read, newest game day first. */
export async function listSessions(): Promise<MatchSession[]> {
  if (isE2E()) return e2eList()
  const { data } = await client()
    .from('match_sessions')
    .select(SESSION_COLS)
    .order('played_at', { ascending: false })
  return (data ?? []).map(mapSessionRow)
}

/**
 * Count the distinct players actually in each session's draw, keyed by session
 * id. This is the real headcount for a game day (vs. the whole roster), so the
 * matchmaker home can show how many people are playing.
 */
export async function loadSessionPlayerCounts(
  sessionIds: string[],
): Promise<Record<string, number>> {
  if (sessionIds.length === 0 || isE2E()) return {}
  const { data } = await client()
    .from('match_results')
    .select('session_id, team_a1, team_a2, team_b1, team_b2')
    .in('session_id', sessionIds)
  const sets = new Map<string, Set<string>>()
  for (const r of data ?? []) {
    const set = sets.get(r.session_id) ?? new Set<string>()
    for (const id of [r.team_a1, r.team_a2, r.team_b1, r.team_b2]) {
      if (id) set.add(id)
    }
    sets.set(r.session_id, set)
  }
  const counts: Record<string, number> = {}
  for (const [id, set] of sets) counts[id] = set.size
  return counts
}

/** One session plus its result rows (ordered by round then court). */
export async function getSession(
  id: string,
): Promise<{ session: MatchSession; results: MatchResult[] } | null> {
  if (isE2E()) return e2eGet(id)
  const db = client()
  const [{ data: session }, { data: results }] = await Promise.all([
    db.from('match_sessions').select(SESSION_COLS).eq('id', id).maybeSingle(),
    db
      .from('match_results')
      .select(RESULT_COLS)
      .eq('session_id', id)
      .order('round', { ascending: true })
      .order('court', { ascending: true }),
  ])
  if (!session) return null
  return { session: mapSessionRow(session), results: (results ?? []).map(mapResultRow) }
}

/**
 * Record a match's point scores. The winning side is derived from the scores
 * (ADR 0011 — the recompute uses the point margin). Throws on invalid scores
 * (missing/negative/non-integer/tied) so callers must validate first.
 */
export async function setScore(
  resultId: string,
  scoreA: number,
  scoreB: number,
): Promise<void> {
  const winner = deriveWinner(scoreA, scoreB)
  if (!winner) throw new Error('Invalid scores')
  if (isE2E()) return e2eSetScore(resultId, scoreA, scoreB, winner)
  const { error } = await client()
    .from('match_results')
    .update({ score_a: scoreA, score_b: scoreB, winner })
    .eq('id', resultId)
  if (error) throw error
}

/**
 * Replace a live match's four players (full substitution / partner swap). The
 * recorded score belongs to the previous line-up, so it is cleared — the match
 * must be re-scored after the change.
 */
export async function updateMatchLineup(
  resultId: string,
  teamA: [string, string],
  teamB: [string, string],
): Promise<void> {
  if (isE2E()) return e2eUpdateLineup(resultId, teamA, teamB)
  const { error } = await client()
    .from('match_results')
    .update({
      team_a1: teamA[0],
      team_a2: teamA[1],
      team_b1: teamB[0],
      team_b2: teamB[1],
      score_a: null,
      score_b: null,
      winner: null,
    })
    .eq('id', resultId)
  if (error) throw error
}

/** Insert an ad-hoc match into a live game day (when the draw runs low). */
export async function addCustomMatch(
  clubId: string,
  sessionId: string,
  round: number,
  court: number,
  players: [string, string, string, string],
): Promise<void> {
  if (isE2E()) return e2eAddMatch(sessionId, round, court, players)
  const { error } = await client()
    .from('match_results')
    .insert({
      club_id: clubId,
      session_id: sessionId,
      round,
      court,
      team_a1: players[0],
      team_a2: players[1],
      team_b1: players[2],
      team_b2: players[3],
    })
  if (error) throw error
}

/** Delete a single match (e.g. one that will not be played). */
export async function deleteMatch(resultId: string): Promise<void> {
  if (isE2E()) return e2eDeleteMatch(resultId)
  const { error } = await client().from('match_results').delete().eq('id', resultId)
  if (error) throw error
}

/** Mark a session finished (or back to live). */export async function setSessionStatus(
  id: string,
  status: SessionStatus,
): Promise<void> {
  if (isE2E()) return e2eSetStatus(id, status)
  const db = client()
  const { error } = await db.from('match_sessions').update({ status }).eq('id', id)
  if (error) throw error
  // Finishing a session locks its results (one rating period — ADR 0011), so
  // ask the server to replay the boards. Best-effort: a failed recompute must
  // not roll back the finish; the next finish (or TASK-8.3 trigger) will retry.
  if (status === 'finished') {
    try {
      await db.functions.invoke('recompute-ratings')
    } catch (e) {
      console.error('recompute-ratings failed', e)
    }
  }
}

/**
 * Show/hide a game day on the public home's Game Day Podium (TASK-38). The
 * matchmaker ticks "Don't show on home page" next to Finish game day.
 */
export async function setSessionHidden(id: string, hidden: boolean): Promise<void> {
  if (isE2E()) return e2eSetHidden(id, hidden)
  const { error } = await client()
    .from('match_sessions')
    .update({ hidden })
    .eq('id', id)
  if (error) throw error
}

/** Update a game day's date/time (the matchmaker can correct it any time). */
export async function updateSessionPlayedAt(
  id: string,
  playedAt: string,
): Promise<void> {
  if (isE2E()) return e2eSetPlayedAt(id, playedAt)
  const { error } = await client()
    .from('match_sessions')
    .update({ played_at: playedAt })
    .eq('id', id)
  if (error) throw error
}

/**
 * Delete a game day (and its results, via ON DELETE CASCADE). If it was already
 * finished it contributed to the boards, so replay ratings afterwards (best-
 * effort) to drop its contribution.
 */
export async function deleteSession(
  id: string,
  wasFinished: boolean,
): Promise<void> {
  if (isE2E()) return e2eDelete(id)
  const db = client()
  const { error } = await db.from('match_sessions').delete().eq('id', id)
  if (error) throw error
  if (wasFinished) {
    try {
      await db.functions.invoke('recompute-ratings')
    } catch (e) {
      console.error('recompute-ratings failed', e)
    }
  }
}

// ---- public home feed (E08 / TASK-9.5) ------------------------------------

/** A match awaiting play, surfaced on the public home's "Scheduled Matches". */
export interface ScheduledMatch {
  id: string
  playedAt: string
  mode: Mode
  court: number
  teamA: [string | null, string | null]
  teamB: [string | null, string | null]
}

/** A finished match, surfaced on the public home's "Recent Results". */
export interface RecentResult {
  id: string
  playedAt: string
  mode: Mode
  court: number
  teamA: [string | null, string | null]
  teamB: [string | null, string | null]
  scoreA: number
  scoreB: number
  winner: Side
}

const FEED_COLS =
  'id, round, court, team_a1, team_a2, team_b1, team_b2, score_a, score_b, winner, ' +
  'match_sessions!inner(played_at, mode, status)'

type FeedRow = {
  id: string
  court: number
  team_a1: string | null
  team_a2: string | null
  team_b1: string | null
  team_b2: string | null
  score_a: number | null
  score_b: number | null
  winner: string | null
  match_sessions:
    | { played_at: string; mode: string; status: string }
    | { played_at: string; mode: string; status: string }[]
}

/** PostgREST returns a to-one embed as an object; guard the array shape. */
function embed(r: FeedRow) {
  return Array.isArray(r.match_sessions) ? r.match_sessions[0] : r.match_sessions
}

/**
 * Matches in live game days that have not been scored yet, soonest game day
 * first. Public read (RLS). `limit` caps the cards shown on the home page.
 */
export async function loadScheduledMatches(limit = 6): Promise<ScheduledMatch[]> {
  if (isE2E()) {
    return e2eFeed()
      .filter(({ result, session }) => session.status === 'live' && result.winner === null)
      .sort((a, b) => a.session.playedAt.localeCompare(b.session.playedAt))
      .slice(0, limit)
      .map(({ result, session }) => ({
        id: result.id,
        playedAt: session.playedAt,
        mode: session.mode,
        court: result.court,
        teamA: result.teamA,
        teamB: result.teamB,
      }))
  }
  const { data } = await client()
    .from('match_results')
    .select(FEED_COLS)
    .is('winner', null)
    .eq('match_sessions.status', 'live')
  const rows = (data ?? []) as unknown as FeedRow[]
  return rows
    .map((r) => ({ r, s: embed(r) }))
    .filter(({ s }) => Boolean(s))
    .sort((a, b) => a.s.played_at.localeCompare(b.s.played_at))
    .slice(0, limit)
    .map(({ r, s }) => ({
      id: r.id,
      playedAt: s.played_at,
      mode: s.mode as Mode,
      court: r.court,
      teamA: [r.team_a1, r.team_a2],
      teamB: [r.team_b1, r.team_b2],
    }))
}

/**
 * The most recently played matches across every game day, newest first.
 * Public read (RLS). `limit` caps the rows shown on the home page.
 */
export async function loadRecentResults(limit = 5): Promise<RecentResult[]> {
  if (isE2E()) {
    return e2eFeed()
      .filter(({ result }) => result.winner !== null)
      .sort((a, b) => b.session.playedAt.localeCompare(a.session.playedAt))
      .slice(0, limit)
      .map(({ result, session }) => ({
        id: result.id,
        playedAt: session.playedAt,
        mode: session.mode,
        court: result.court,
        teamA: result.teamA,
        teamB: result.teamB,
        scoreA: result.scoreA ?? 0,
        scoreB: result.scoreB ?? 0,
        winner: result.winner as Side,
      }))
  }
  const { data } = await client()
    .from('match_results')
    .select(FEED_COLS)
    .not('winner', 'is', null)
  const rows = (data ?? []) as unknown as FeedRow[]
  return rows
    .map((r) => ({ r, s: embed(r) }))
    .filter(({ s }) => Boolean(s))
    .sort((a, b) => b.s.played_at.localeCompare(a.s.played_at))
    .slice(0, limit)
    .map(({ r, s }) => ({
      id: r.id,
      playedAt: s.played_at,
      mode: s.mode as Mode,
      court: r.court,
      teamA: [r.team_a1, r.team_a2],
      teamB: [r.team_b1, r.team_b2],
      scoreA: r.score_a ?? 0,
      scoreB: r.score_b ?? 0,
      winner: r.winner as Side,
    }))
}

// ---- public player history (E08 / TASK-9.3) -------------------------------

/** One played match from a player's perspective. */
export interface PlayerMatch {
  id: string
  /** Game day (session) this match belongs to — groups the history view. */
  sessionId: string
  date: string
  mode: Mode
  partnerId: string | null
  opponentIds: [string | null, string | null]
  scoreFor: number
  scoreAgainst: number
  won: boolean
}

function toPlayerMatch(
  r: MatchResult,
  session: { played_at: string; mode: string },
  playerId: string,
): PlayerMatch {
  const onA = r.teamA[0] === playerId || r.teamA[1] === playerId
  const mine = onA ? r.teamA : r.teamB
  const theirs = onA ? r.teamB : r.teamA
  return {
    id: r.id,
    sessionId: r.sessionId,
    date: session.played_at,
    mode: session.mode as Mode,
    partnerId: mine.find((x) => x !== playerId) ?? null,
    opponentIds: theirs,
    scoreFor: (onA ? r.scoreA : r.scoreB) ?? 0,
    scoreAgainst: (onA ? r.scoreB : r.scoreA) ?? 0,
    won: onA ? r.winner === 'a' : r.winner === 'b',
  }
}

/** A player's played matches, newest first. Public read (RLS allows anyone). */
export async function loadPlayerHistory(playerId: string): Promise<PlayerMatch[]> {
  if (!playerId) return []
  const db = client()
  const { data: rows } = await db
    .from('match_results')
    .select(RESULT_COLS)
    .or(
      `team_a1.eq.${playerId},team_a2.eq.${playerId},team_b1.eq.${playerId},team_b2.eq.${playerId}`,
    )
    .not('winner', 'is', null)
  const results = (rows ?? []).map(mapResultRow)
  if (results.length === 0) return []

  const sessionIds = [...new Set(results.map((r) => r.sessionId))]
  const { data: srows } = await db
    .from('match_sessions')
    .select('id, played_at, mode')
    .in('id', sessionIds)
  const byId = new Map((srows ?? []).map((s) => [s.id, s]))

  return results
    .map((r) => {
      const s = byId.get(r.sessionId)
      return s ? toPlayerMatch(r, s, playerId) : null
    })
    .filter((m): m is PlayerMatch => m !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
}
