// recompute-ratings — server-side ranking maintenance (E05 / TASK-6.3), see
// ADR 0011. When a session's results change (e.g. a game day is finished), the
// app invokes this function. It verifies the caller is an admin/matchmaker of a
// club, then — using the service role — replays that club's FINISHED sessions
// through the shared Glicko-2 engine (one finished session = one rating period)
// and overwrites the player + pair boards. The boards are never written by app
// users (RLS public-read only); only this service-role recompute writes them.
//
// The pure engine is imported from packages/domain so there is a single source
// of truth (no reimplementation in SQL/Deno).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { computeRatings } from '../../../packages/domain/src/ranking/ranking.ts'
import type {
  MatchRecord,
  RatingPeriod,
} from '../../../packages/domain/src/ranking/types.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

interface SessionRow {
  id: string
  created_at: string
}
interface ResultRow {
  session_id: string
  team_a1: string | null
  team_a2: string | null
  team_b1: string | null
  team_b2: string | null
  winner: 'a' | 'b' | null
  score_a: number | null
  score_b: number | null
}

/**
 * Build a MatchRecord from a result row, or null if it can't be rated (missing a
 * player, or no outcome at all). Scores default from the winner when point
 * scores were not entered (degenerate 1/0 win-share — ADR 0011).
 */
function toMatchRecord(r: ResultRow): MatchRecord | null {
  if (!r.team_a1 || !r.team_a2 || !r.team_b1 || !r.team_b2) return null

  let scoreA = r.score_a
  let scoreB = r.score_b
  if (scoreA == null || scoreB == null) {
    if (r.winner === 'a') {
      scoreA = 1
      scoreB = 0
    } else if (r.winner === 'b') {
      scoreA = 0
      scoreB = 1
    } else {
      return null // neither scores nor a winner — nothing to rate yet
    }
  }

  return {
    teamA: [r.team_a1, r.team_a2],
    teamB: [r.team_b1, r.team_b2],
    scoreA,
    scoreB,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''

  // 1) Authorise: the caller must be an admin or matchmaker of some club.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
  } = await caller.auth.getUser()
  if (!user) return json(401, { error: 'Not signed in' })

  // Resolve the caller's club (admin first, else matchmaker profile).
  const { data: admin } = await caller
    .from('admins')
    .select('club_id')
    .limit(1)
    .maybeSingle()
  let clubId = admin?.club_id as string | undefined
  if (!clubId) {
    const { data: profile } = await caller
      .from('player_profiles')
      .select('club_id')
      .eq('user_id', user.id)
      .eq('is_matchmaker', true)
      .maybeSingle()
    clubId = profile?.club_id as string | undefined
  }
  if (!clubId) return json(403, { error: 'Admins or matchmakers only' })

  // 2) Load the club's finished sessions + their results (service role).
  const db = createClient(url, serviceKey)
  const { data: sessions, error: sErr } = await db
    .from('match_sessions')
    .select('id, created_at')
    .eq('club_id', clubId)
    .eq('status', 'finished')
    .order('created_at', { ascending: true })
  if (sErr) return json(500, { error: sErr.message })

  const sessionRows = (sessions ?? []) as SessionRow[]
  const { data: results, error: rErr } = await db
    .from('match_results')
    .select('session_id, team_a1, team_a2, team_b1, team_b2, winner, score_a, score_b')
    .eq('club_id', clubId)
  if (rErr) return json(500, { error: rErr.message })

  // 3) Attendance snapshot (ADR 0011 / TASK-6.5). Absence must be historical, so
  //    for any finished session that has no attendance yet we freeze a snapshot:
  //    every CURRENT club player is marked present (played a court that day) or
  //    absent. Once written it is never changed, so players added later are not
  //    retroactively penalised for past game days.
  const presentBySession = new Map<string, Set<string>>()
  for (const r of (results ?? []) as ResultRow[]) {
    let set = presentBySession.get(r.session_id)
    if (!set) {
      set = new Set<string>()
      presentBySession.set(r.session_id, set)
    }
    for (const pid of [r.team_a1, r.team_a2, r.team_b1, r.team_b2]) {
      if (pid) set.add(pid)
    }
  }

  const { data: roster, error: pErr } = await db
    .from('player_profiles')
    .select('id')
    .eq('club_id', clubId)
  if (pErr) return json(500, { error: pErr.message })
  const rosterIds = (roster ?? []).map((p) => p.id as string)

  const { data: attendance, error: aErr } = await db
    .from('session_attendance')
    .select('session_id, player_id, present')
    .eq('club_id', clubId)
  if (aErr) return json(500, { error: aErr.message })

  type AttendanceRow = { session_id: string; player_id: string; present: boolean }
  const recorded = (attendance ?? []) as AttendanceRow[]
  const sessionsWithAttendance = new Set(recorded.map((a) => a.session_id))

  const newRows: (AttendanceRow & { club_id: string })[] = []
  for (const s of sessionRows) {
    if (sessionsWithAttendance.has(s.id)) continue
    const present = presentBySession.get(s.id) ?? new Set<string>()
    for (const pid of rosterIds) {
      newRows.push({
        session_id: s.id,
        player_id: pid,
        club_id: clubId,
        present: present.has(pid),
      })
    }
  }
  if (newRows.length > 0) {
    const { error } = await db.from('session_attendance').insert(newRows)
    if (error) return json(500, { error: error.message })
  }

  // Absentees per session, from the (now complete) stored attendance.
  const absenteesBySession = new Map<string, string[]>()
  for (const a of [...recorded, ...newRows]) {
    if (a.present) continue
    const list = absenteesBySession.get(a.session_id)
    if (list) list.push(a.player_id)
    else absenteesBySession.set(a.session_id, [a.player_id])
  }

  // 4) One finished session = one rating period (ADR 0011), in chronological
  //    order. Within a period, match order does not matter (engine snapshots).
  const bySession = new Map<string, MatchRecord[]>()
  for (const r of (results ?? []) as ResultRow[]) {
    const record = toMatchRecord(r)
    if (!record) continue
    const list = bySession.get(r.session_id)
    if (list) list.push(record)
    else bySession.set(r.session_id, [record])
  }
  const periods: RatingPeriod[] = sessionRows.map((s) => ({
    matches: bySession.get(s.id) ?? [],
    absentees: absenteesBySession.get(s.id) ?? [],
  }))

  const tables = computeRatings(periods)

  // 5) Overwrite both boards for this club (full replace keeps it deterministic
  //    and idempotent — matches the replay model).
  const playerRows = tables.players.map((p) => ({
    player_id: p.id,
    club_id: clubId,
    rating: p.rating,
    rd: p.rd,
    volatility: p.vol,
    games: p.games,
    updated_at: new Date().toISOString(),
  }))
  const pairRows = tables.pairs.map((p) => ({
    club_id: clubId,
    player1_id: p.players[0] < p.players[1] ? p.players[0] : p.players[1],
    player2_id: p.players[0] < p.players[1] ? p.players[1] : p.players[0],
    rating: p.rating,
    rd: p.rd,
    volatility: p.vol,
    games: p.games,
    updated_at: new Date().toISOString(),
  }))

  await db.from('player_ratings').delete().eq('club_id', clubId)
  await db.from('pair_ratings').delete().eq('club_id', clubId)
  if (playerRows.length > 0) {
    const { error } = await db.from('player_ratings').insert(playerRows)
    if (error) return json(500, { error: error.message })
  }
  if (pairRows.length > 0) {
    const { error } = await db.from('pair_ratings').insert(pairRows)
    if (error) return json(500, { error: error.message })
  }

  return json(200, {
    ok: true,
    players: playerRows.length,
    pairs: pairRows.length,
    periods: periods.length,
  })
})
