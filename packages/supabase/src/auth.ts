// @gameon/supabase/auth — sign-in flows + role resolution (E01, per ADR 0010).
//
// Two login types, one non-authenticating actor:
//   - Admin       -> email magic link (passwordless OTP).
//   - Matchmaker  -> username + password. Supabase Auth is email-keyed, so the
//                    username maps to a synthetic email (never shown to users).
//   - Player      -> no login; resolves to role `null`.
//
// Matchmaker accounts are created by an Admin/Matchmaker (no self-service signup,
// per REQUIREMENTS), so only sign-IN lives here. Role is resolved from the DB and
// enforced by RLS — never trusted from which button the user pressed.

import { supabase } from './client'

export type Role = 'admin' | 'matchmaker' | null

/** Domain for Matchmaker synthetic emails (see ADR 0010). */
export const MATCHMAKER_EMAIL_DOMAIN = 'matchmaker.gameon.local'

/** Map a Matchmaker username to the synthetic email their account is keyed on. */
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${MATCHMAKER_EMAIL_DOMAIN}`
}

/** Pure role decision from resolved DB flags. Admin wins over matchmaker. */
export function decideRole(flags: { isAdmin: boolean; isMatchmaker: boolean }): Role {
  if (flags.isAdmin) return 'admin'
  if (flags.isMatchmaker) return 'matchmaker'
  return null
}

// --- E2E bypass -------------------------------------------------------------
// e2e builds run with VITE_E2E=1 (see playwright.config). Sign-in then records a
// fake role in sessionStorage instead of hitting Supabase, so tests sign in
// without a real email/password. resolveRole reads it back.

const E2E_ROLE_KEY = 'gameon.e2e.role'

export function isE2E(): boolean {
  return import.meta.env.VITE_E2E === '1'
}

function readE2ERole(): Role {
  if (typeof sessionStorage === 'undefined') return null
  const v = sessionStorage.getItem(E2E_ROLE_KEY)
  return v === 'admin' || v === 'matchmaker' ? v : null
}

function writeE2ERole(role: Role): void {
  if (typeof sessionStorage === 'undefined') return
  if (role) sessionStorage.setItem(E2E_ROLE_KEY, role)
  else sessionStorage.removeItem(E2E_ROLE_KEY)
}

// --- sign-in / sign-out -----------------------------------------------------

function requireClient(): NonNullable<typeof supabase> {
  if (!supabase) throw new Error('Supabase is not configured (missing env vars)')
  return supabase
}

/** Admin: send a magic link to `email`. */
export async function signInAdmin(email: string, emailRedirectTo?: string) {
  if (isE2E()) {
    writeE2ERole('admin')
    return { error: null }
  }
  return requireClient().auth.signInWithOtp({ email, options: { emailRedirectTo } })
}

/** Matchmaker: sign in with a username + password. */
export async function signInMatchmaker(username: string, password: string) {
  if (isE2E()) {
    writeE2ERole('matchmaker')
    return { error: null }
  }
  return requireClient().auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  })
}

export async function signOut(): Promise<void> {
  if (isE2E()) {
    writeE2ERole(null)
    return
  }
  await supabase?.auth.signOut()
}

/**
 * Resolve the signed-in user's role from the database. Admin is checked first
 * (the admins self-read policy returns only the caller's row); otherwise a
 * matchmaker is a player_profile flagged is_matchmaker. Returns null when not
 * signed in, when the user is a plain player, or when Supabase is unconfigured.
 */
export async function resolveRole(): Promise<Role> {
  if (isE2E()) return readE2ERole()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [adminRes, profileRes] = await Promise.all([
    supabase.from('admins').select('user_id').limit(1),
    supabase
      .from('player_profiles')
      .select('is_matchmaker')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return decideRole({
    isAdmin: (adminRes.data?.length ?? 0) > 0,
    isMatchmaker: profileRes.data?.is_matchmaker === true,
  })
}
