// create-matchmaker — privileged op (ADR 0003): an Admin creates a Matchmaker
// login. Verifies the caller is an admin using their JWT, then uses the service
// role to create an auth user with the matchmaker synthetic email + password.
// The bootstrap trigger (handle_new_auth_user) enrols them as a Matchmaker
// player_profile from the user metadata.
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
  let body: { username?: string; password?: string; name?: string; skill?: number | null }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }
  const username = (body.username ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  const name = (body.name ?? '').trim() || username
  const skill = body.skill == null ? null : Number(body.skill)
  if (!username || !password) return json(400, { error: 'username and password are required' })
  if (password.length < 6) return json(400, { error: 'password must be at least 6 characters' })
  if (skill !== null && (!Number.isInteger(skill) || skill < 1 || skill > 10))
    return json(400, { error: 'skill must be an integer 1–10' })

  // 3) Create the matchmaker auth user (service role). The trigger enrols them.
  const adminClient = createClient(url, serviceKey)
  const { error } = await adminClient.auth.admin.createUser({
    email: `${username}@${MATCHMAKER_EMAIL_DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: { username, nickname: name, club_id: admin.club_id, skill },
  })
  if (error) {
    const msg = /already.*registered|exists/i.test(error.message)
      ? 'That username is already taken'
      : error.message
    return json(400, { error: msg })
  }

  return json(200, { ok: true })
})
