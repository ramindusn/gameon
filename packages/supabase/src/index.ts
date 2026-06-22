// @gameon/supabase — shared client, generated DB types, and auth/role helpers.

export { supabase, isSupabaseConfigured } from './client'
export type { Database } from './database.types'
export {
  type Role,
  MATCHMAKER_EMAIL_DOMAIN,
  usernameToEmail,
  decideRole,
  isE2E,
  signInAdmin,
  signInMatchmaker,
  signOut,
  resolveRole,
} from './auth'
