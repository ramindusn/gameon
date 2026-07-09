// Ranking domain types (E05 / TASK-6.2) — see ADR 0011. A match is always
// doubles with point scores; ratings are computed over ordered rating periods
// (one per locked game day). Both an individual board and a per-pair board are
// derived from the same matches.

import type { Glicko2 } from './glicko2.ts'

/** One played doubles court: two teams of two, with final point scores. */
export interface MatchRecord {
  teamA: [string, string]
  teamB: [string, string]
  scoreA: number
  scoreB: number
}

/** A rating period = all matches from one locked game day, replayed as a batch. */
export interface RatingPeriod {
  matches: MatchRecord[]
  /**
   * Player ids who were on the roster but did NOT play this game day. After a
   * grace period of consecutive misses they take an absence decay on the
   * individual board (ADR 0011) — you must keep playing to hold your ranking.
   * Optional; omit/empty for no absentees.
   */
  absentees?: string[]
}

/** A player's individual rating plus how many games fed it (for provisional UI). */
export interface PlayerRating extends Glicko2 {
  id: string
  games: number
}

/** A partnership's rating. `key` is the stable, order-independent pair id. */
export interface PairRating extends Glicko2 {
  key: string
  players: [string, string]
  games: number
}

/** Both leaderboards, each sorted strongest-first. */
export interface RatingTables {
  players: PlayerRating[]
  pairs: PairRating[]
}

/** Stable, order-independent key for a partnership. */
export const pairKey = (a: string, b: string): string => [a, b].sort().join('|')
