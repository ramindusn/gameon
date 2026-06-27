// Match-generator domain types (E03). Ported from BadmintonApp's matchEngine.js,
// typed and extended with an optional gender for mixed doubles. Matches are
// always doubles (2-a-side); the generator never produces singles.

export type Gender = 'male' | 'female' | 'other'

/** A player as the generator needs them: an id, a 1–10 skill, optional gender. */
export interface MatchPlayer {
  id: string
  skill: number
  gender?: Gender | null
  absent?: boolean
}

/** Two players on one side of a doubles court. */
export type Team = [MatchPlayer, MatchPlayer]
/** A single court: team A vs team B. */
export type Match = [Team, Team]

/** One round = the matches on each court plus the players sitting it out. */
export interface Round {
  sitting: MatchPlayer[]
  matches: Match[]
  courts: number
}

export interface GeneratedMatches {
  rounds: Round[]
  courts: number
  sittingCount: number
  totalPlayers: number
  /** Mixed mode: players that couldn't be placed in a male+female pair this draw. */
  unplaceable: MatchPlayer[]
}

export interface GenerateOptions {
  /** 'open' = skill-balanced doubles (default); 'mixed' = male+female pairs. */
  mode?: 'open' | 'mixed'
  /**
   * Cap the number of courts used per round. When omitted, the engine uses the
   * max the player count allows (its auto value). A value above that auto max is
   * ignored; surplus players sit out and rotate as usual. Clamped to >= 1.
   */
  courts?: number
  /** Injectable RNG (0..1) for deterministic tests. Defaults to Math.random. */
  rng?: () => number
}
