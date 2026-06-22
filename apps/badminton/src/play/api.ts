// Match-play data access (E04 / TASK-5.2). A matchmaker turns a generated draw
// (@gameon/domain GeneratedMatches) into a persisted session: one match_sessions
// row + one match_results row per court. Winners are recorded per result; the
// session is marked finished when play is done. Reads are public (RLS); writes
// are limited by RLS to admins/matchmakers of the club.

import { supabase, isE2E } from '@gameon/supabase'
import type { GeneratedMatches } from '@gameon/domain'
import {
  e2eUid,
  e2ePut,
  e2eList,
  e2eGet,
  e2eSetResult,
  e2eSetStatus,
} from './e2eStore'

export type SessionStatus = 'live' | 'finished'
export type Mode = 'open' | 'mixed'
export type Side = 'a' | 'b'

export interface MatchSession {
  id: string
  clubId: string
  status: SessionStatus
  mode: Mode
  rounds: number
  createdAt: string
}

/** A single court within a session. Player ids may be null if a roster player
 *  was later deleted (FK ON DELETE SET NULL). Winner is null until recorded. */
export interface MatchResult {
  id: string
  sessionId: string
  round: number
  court: number
  teamA: [string | null, string | null]
  teamB: [string | null, string | null]
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
  rounds: number
  created_at: string
}): MatchSession => ({
  id: r.id,
  clubId: r.club_id,
  status: r.status as SessionStatus,
  mode: r.mode as Mode,
  rounds: r.rounds,
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
  winner: string | null
}): MatchResult => ({
  id: r.id,
  sessionId: r.session_id,
  round: r.round,
  court: r.court,
  teamA: [r.team_a1, r.team_a2],
  teamB: [r.team_b1, r.team_b2],
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

const SESSION_COLS = 'id, club_id, status, mode, rounds, created_at'
const RESULT_COLS =
  'id, session_id, round, court, team_a1, team_a2, team_b1, team_b2, winner'

/**
 * Persist a generated draw as a live session: insert the session, then its
 * result rows (one per court). Returns the new session id.
 */
export async function createSessionFromPlan(
  clubId: string,
  plan: GeneratedMatches,
  mode: Mode,
): Promise<string> {
  if (isE2E()) {
    const id = e2eUid('session')
    return e2ePut(
      {
        id,
        clubId,
        status: 'live',
        mode,
        rounds: plan.rounds.length,
        createdAt: new Date().toISOString(),
      },
      planToResultRows(plan, id, clubId),
    )
  }
  const db = client()
  const { data: session, error: sErr } = await db
    .from('match_sessions')
    .insert({ club_id: clubId, mode, rounds: plan.rounds.length, status: 'live' })
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

/** All sessions for the club(s) the caller can read, newest first. */
export async function listSessions(): Promise<MatchSession[]> {
  if (isE2E()) return e2eList()
  const { data } = await client()
    .from('match_sessions')
    .select(SESSION_COLS)
    .order('created_at', { ascending: false })
  return (data ?? []).map(mapSessionRow)
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

/** Record (or clear) the winning side of a single court. */
export async function setResult(resultId: string, winner: Side | null): Promise<void> {
  if (isE2E()) return e2eSetResult(resultId, winner)
  const { error } = await client()
    .from('match_results')
    .update({ winner })
    .eq('id', resultId)
  if (error) throw error
}

/** Mark a session finished (or back to live). */
export async function setSessionStatus(
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
