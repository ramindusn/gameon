// @gameon/domain — pure logic (match generation, ranking, fund math) lives here.

export const APP_NAME = 'GameOn'

/** Trivial pure helper to prove the package is wired + testable. */
export function greet(name: string): string {
  return `Welcome to ${APP_NAME}, ${name}`
}

// Fund & inventory math + types (E06).
export * from './fund/types'
export * from './fund/calc'
export * from './fund/format'
export * from './fund/reducers'

// Match generator (E03).
export * from './matches/types'
export * from './matches/generate'
// Match scoring — point scores + derived winner (E09).
export * from './matches/score'
// Match line-up validation — live editing + custom matches (E09).
export * from './matches/lineup'

// Ranking — Glicko-2 individual + per-pair boards (E05).
export * from './ranking/glicko2'
export * from './ranking/types'
export * from './ranking/ranking'
