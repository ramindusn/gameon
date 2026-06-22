// @gameon/domain — pure logic (match generation, ranking, fund math) lives here.

export const APP_NAME = 'GameOn'

/** Trivial pure helper to prove the package is wired + testable. */
export function greet(name: string): string {
  return `Welcome to ${APP_NAME}, ${name}`
}

// Fund & inventory math + types (E06).
export * from './fund/types'
export * from './fund/calc'
