// create-matchmaker — privileged op (ADR 0003): an Admin promotes an EXISTING
// roster player to a Matchmaker by giving them a login (TASK-14). Verifies the
// caller is an admin, validates the chosen player (same club, no login yet), then
// uses the service role to create the auth user with the matchmaker synthetic
// email + password. The bootstrap trigger links that login to the existing
// player_profiles row (via player_id metadata) — no duplicate profile is made.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const MATCHMAKER_EMAIL_DOMAIN = 'matchmaker.gameon.local'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''

  // 1) Verify the caller is an admin (RLS: admins_self_read returns their row).
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
  } = await caller.auth.getUser()
  if (!user) return json(401, { error: 'Not signed in' })

  const { data: admin } = await caller.from('admins').select('club_id').limit(1).maybeSingle()
  if (!admin) return json(403, { error: 'Admins only' })

  // 2) Validate input.
  let body: { player_id?: string; username?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }
  const playerId = (body.player_id ?? '').trim()
  const username = (body.username ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  if (!playerId) return json(400, { error: 'player_id is required' })
  if (!username || !password) return json(400, { error: 'username and password are required' })
  if (password.length < 6) return json(400, { error: 'password must be at least 6 characters' })

  const adminClient = createClient(url, serviceKey)

  // 3) The player must exist, be in the admin's club, and not already have a login.
  const { data: player } = await adminClient
    .from('player_profiles')
    .select('id, club_id, user_id, is_matchmaker')
    .eq('id', playerId)
    .maybeSingle()
  if (!player || player.club_id !== admin.club_id)
    return json(404, { error: 'Player not found in your club' })
  if (player.user_id || player.is_matchmaker)
    return json(400, { error: 'That player is already a matchmaker' })

  // 4) Create the auth user (service role). The trigger links it to the player.
  const { error } = await adminClient.auth.admin.createUser({
    email: `${username}@${MATCHMAKER_EMAIL_DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: { username, club_id: admin.club_id, player_id: playerId },
  })
  if (error) {
    const msg = /already.*registered|exists/i.test(error.message)
      ? 'That username is already taken'
      : error.message
    return json(400, { error: msg })
  }

  return json(200, { ok: true })
})
