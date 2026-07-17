// Roster data access (E02). Players are player_profiles rows. Reads are public
// (RLS allows anyone); writes are limited by RLS to admins/matchmakers of the
// club. A plain player has user_id = null; matchmakers have a login.

import { supabase, isE2E } from '@gameon/supabase'

export type Gender = 'male' | 'female' | 'other'

export interface Player {
  id: string
  nickname: string
  skill: number | null // 1–10; null until set
  gender: Gender | null
  absent: boolean
  isMatchmaker: boolean
  hasLogin: boolean
}

export interface RosterData {
  /** The acting user's club (admins/matchmakers); null when not signed in. */
  clubId: string | null
  players: Player[]
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export const mapRow = (r: {
  id: string
  nickname: string
  skill: number | null
  gender: string | null
  absent: boolean
  is_matchmaker: boolean
  user_id: string | null
}): Player => ({
  id: r.id,
  nickname: r.nickname,
  skill: r.skill,
  gender: (r.gender as Gender | null) ?? null,
  absent: r.absent,
  isMatchmaker: r.is_matchmaker,
  hasLogin: r.user_id !== null,
})

/** Resolve the signed-in user's club: admin first, else matchmaker profile. */
export async function resolveClubId(): Promise<string | null> {
  const db = client()
  const { data: admin } = await db.from('admins').select('club_id').limit(1).maybeSingle()
  if (admin) return admin.club_id

  // Read the locally-cached session rather than getUser(): getUser() hits the
  // auth server to re-validate the JWT and can transiently return no user, which
  // would resolve clubId to null and get cached by the roster query — leaving
  // "Create game day" stuck disabled after a background refetch. The caller is
  // already past ProtectedRoute, so the session is present locally.
  const {
    data: { session },
  } = await db.auth.getSession()
  const user = session?.user
  if (!user) return null
  const { data: profile } = await db
    .from('player_profiles')
    .select('club_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return profile?.club_id ?? null
}

// E2E seed: e2e builds run with VITE_E2E=1 (see playwright.config) and no
// Supabase env, so the real client is null. Mirroring the auth bypass, the
// roster resolves to a fixed, balanced 8-player club (4 male / 4 female, skills
// 1–8, all present) — enough for the generator to draw 2 courts.
const E2E_CLUB_ID = 'e2e-club'
const E2E_ROSTER: Player[] = Array.from({ length: 8 }, (_, i) => ({
  id: `e2e-${i + 1}`,
  nickname: `E2E Player ${i + 1}`,
  skill: i + 1,
  gender: i % 2 === 0 ? 'male' : 'female',
  absent: false,
  isMatchmaker: false,
  hasLogin: false,
}))

/** Load the roster (public read) plus the acting user's club id for writes. */
export async function loadRoster(): Promise<RosterData> {
  if (isE2E()) return { clubId: E2E_CLUB_ID, players: E2E_ROSTER }
  const db = client()
  const [clubId, players] = await Promise.all([
    resolveClubId(),
    db
      .from('player_profiles')
      .select('id, nickname, skill, gender, absent, is_matchmaker, user_id')
      .order('nickname'),
  ])
  return { clubId, players: (players.data ?? []).map(mapRow) }
}

/** Public read of a single player by id (no login required). */
export async function getPlayer(id: string): Promise<Player | null> {
  const { data } = await client()
    .from('player_profiles')
    .select('id, nickname, skill, gender, absent, is_matchmaker, user_id')
    .eq('id', id)
    .maybeSingle()
  return data ? mapRow(data) : null
}

export interface PlayerInput {
  nickname: string
  skill: number | null
  gender: Gender | null
  absent: boolean
}

export async function addPlayer(clubId: string, p: PlayerInput) {
  const { error } = await client().from('player_profiles').insert({
    club_id: clubId,
    nickname: p.nickname.trim(),
    skill: p.skill,
    gender: p.gender,
    absent: p.absent,
  })
  if (error) throw error
}

export async function updatePlayer(id: string, p: PlayerInput) {
  // `.select()` returns the changed rows: when RLS blocks the write the update
  // matches 0 rows and returns no error, so without this a failed save would
  // look like success. Throw instead so the UI can surface it.
  const { data, error } = await client()
    .from('player_profiles')
    .update({
      nickname: p.nickname.trim(),
      skill: p.skill,
      gender: p.gender,
      absent: p.absent,
    })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error("Couldn't save — you may not have permission to edit this player.")
  }
}

export async function removePlayer(id: string) {
  const { error } = await client().from('player_profiles').delete().eq('id', id)
  if (error) throw error
}

export interface MatchmakerInput {
  /** The existing roster player to promote (a matchmaker is a player). */
  playerId: string
  username: string
  password: string
}

/**
 * Promote an existing player to a Matchmaker by giving them a login. Admin-only
 * privileged op handled by the `create-matchmaker` Edge Function (service role);
 * the bootstrap trigger links the new login to the player's existing profile.
 */
export async function createMatchmaker(input: MatchmakerInput) {
  const { error } = await client().functions.invoke('create-matchmaker', {
    body: {
      player_id: input.playerId,
      username: input.username,
      password: input.password,
    },
  })
  if (error) {
    let message = error.message
    // FunctionsHttpError carries the response; surface our JSON {error} message.
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) message = body.error
    } catch {
      /* keep default message */
    }
    throw new Error(message)
  }
}
