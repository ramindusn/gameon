import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MATCHMAKER_EMAIL_DOMAIN,
  decideRole,
  usernameToEmail,
  isE2E,
  resolveRole,
  signInAdmin,
  signInMatchmaker,
  signOut,
} from './auth'

describe('usernameToEmail', () => {
  it('builds the synthetic email, trimmed + lowercased', () => {
    expect(usernameToEmail('Rohan')).toBe(`rohan@${MATCHMAKER_EMAIL_DOMAIN}`)
    expect(usernameToEmail('  MM_01 ')).toBe(`mm_01@${MATCHMAKER_EMAIL_DOMAIN}`)
  })
})

describe('decideRole', () => {
  it('prefers admin, then matchmaker, else null', () => {
    expect(decideRole({ isAdmin: true, isMatchmaker: true })).toBe('admin')
    expect(decideRole({ isAdmin: false, isMatchmaker: true })).toBe('matchmaker')
    expect(decideRole({ isAdmin: false, isMatchmaker: false })).toBe(null)
  })
})

// Vitest runs under Vite, so import.meta.env is available to stub.
describe('E2E bypass', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    sessionStorage.clear()
  })

  it('is off by default', () => {
    expect(isE2E()).toBe(false)
  })

  it('admin sign-in resolves to admin, sign-out clears it', async () => {
    vi.stubEnv('VITE_E2E', '1')
    expect(await resolveRole()).toBe(null)

    await signInAdmin('admin@example.com')
    expect(await resolveRole()).toBe('admin')

    await signOut()
    expect(await resolveRole()).toBe(null)
  })

  it('matchmaker sign-in resolves to matchmaker', async () => {
    vi.stubEnv('VITE_E2E', '1')
    await signInMatchmaker('rohan', 'pw')
    expect(await resolveRole()).toBe('matchmaker')
  })
})
