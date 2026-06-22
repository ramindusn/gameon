// Roster data access (E02). Players are player_profiles rows. Reads are public
// (RLS allows anyone); writes are limited by RLS to admins/matchmakers of the
// club. A plain player has user_id = null; matchmakers have a login.

import { supabase } from '@gameon/supabase'

export interface Player {
  id: string
  nickname: string
  skill: number | null // 1–5; null until set
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
  absent: boolean
  is_matchmaker: boolean
  user_id: string | null
}): Player => ({
  id: r.id,
  nickname: r.nickname,
  skill: r.skill,
  absent: r.absent,
  isMatchmaker: r.is_matchmaker,
  hasLogin: r.user_id !== null,
})

/** Resolve the signed-in user's club: admin first, else matchmaker profile. */
export async function resolveClubId(): Promise<string | null> {
  const db = client()
  const { data: admin } = await db.from('admins').select('club_id').limit(1).maybeSingle()
  if (admin) return admin.club_id

  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return null
  const { data: profile } = await db
    .from('player_profiles')
    .select('club_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return profile?.club_id ?? null
}

/** Load the roster (public read) plus the acting user's club id for writes. */
export async function loadRoster(): Promise<RosterData> {
  const db = client()
  const [clubId, players] = await Promise.all([
    resolveClubId(),
    db
      .from('player_profiles')
      .select('id, nickname, skill, absent, is_matchmaker, user_id')
      .order('nickname'),
  ])
  return { clubId, players: (players.data ?? []).map(mapRow) }
}

export interface PlayerInput {
  nickname: string
  skill: number | null
  absent: boolean
}

export async function addPlayer(clubId: string, p: PlayerInput) {
  const { error } = await client().from('player_profiles').insert({
    club_id: clubId,
    nickname: p.nickname.trim(),
    skill: p.skill,
    absent: p.absent,
  })
  if (error) throw error
}

export async function updatePlayer(id: string, p: PlayerInput) {
  const { error } = await client()
    .from('player_profiles')
    .update({ nickname: p.nickname.trim(), skill: p.skill, absent: p.absent })
    .eq('id', id)
  if (error) throw error
}

export async function removePlayer(id: string) {
  const { error } = await client().from('player_profiles').delete().eq('id', id)
  if (error) throw error
}
