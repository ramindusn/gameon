import type { Role } from '@gameon/supabase'

/** Where each role lands after sign-in. */
export function roleHome(role: Role): string {
  switch (role) {
    case 'admin':
      return '/dashboard'
    case 'matchmaker':
      return '/matchmaker'
    default:
      return '/'
  }
}
