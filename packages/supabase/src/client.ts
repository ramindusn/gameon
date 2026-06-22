// @gameon/supabase — shared Supabase client.
//
// The publishable key ships in the client bundle (that's expected); Row-Level
// Security is the real guard. Privileged ops use the secret key inside Edge
// Functions, never here. `supabase` is null when env vars are absent (e.g. tests
// or a build without secrets) so importing this module never throws.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url as string, publishableKey as string)
  : null
