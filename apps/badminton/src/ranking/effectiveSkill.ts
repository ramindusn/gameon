// Results-aware skill (TASK-44). The manual 1–10 skill on a player profile stays
// as the reference/seed; for matchmaking we blend it with a skill derived from
// the player's Glicko rating, weighted by how many games they've played. A new
// player leans on the manual seed; once they've played enough, results take over.

/** Rating that maps to the mid skill (5.5). */
export const RATING_BASELINE = 1500
/** Skill that the baseline rating maps to. */
export const SKILL_BASELINE = 5.5
/** Rating points per 1 skill point — the club's ratings are tightly clustered,
 *  so a smallish step keeps the 1–10 spread meaningful (tunable). */
export const RATING_PER_SKILL = 15
/** Games after which results fully take over from the manual seed. */
export const FULL_GAMES = 8
/** Manual skill assumed when a player has none set yet. */
export const DEFAULT_SKILL = 5.5

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** Map a Glicko rating onto the 1–10 skill scale. */
export function skillFromRating(rating: number): number {
  return clamp(SKILL_BASELINE + (rating - RATING_BASELINE) / RATING_PER_SKILL, 1, 10)
}

/** How much weight the results-based skill carries (0 = pure manual, 1 = pure results). */
export function resultsWeight(games: number): number {
  return clamp(games / FULL_GAMES, 0, 1)
}

/**
 * The skill the matchmaker should use: the manual seed blended toward the
 * results-based skill as the player accumulates games. Falls back to the manual
 * seed (or DEFAULT_SKILL) when there's no rating yet.
 */
export function effectiveSkill(
  manualSkill: number | null | undefined,
  rating: number | null | undefined,
  games: number,
): number {
  const manual = manualSkill ?? DEFAULT_SKILL
  if (rating == null || games <= 0) return manual
  const w = resultsWeight(games)
  return w * skillFromRating(rating) + (1 - w) * manual
}

/** Logistic scale (in team-average skill points) for the favoured-to-win odds.
 *  A ~1-point team-skill edge reads ~64%, ~2 points ~76% — enough lean to be
 *  visible without over-claiming certainty on a tightly-clustered club. */
export const ODDS_SCALE = 4

/** Win probability for team A from the two teams' average effective skills. */
export function winProbability(teamSkillA: number, teamSkillB: number): number {
  return 1 / (1 + Math.pow(10, (teamSkillB - teamSkillA) / ODDS_SCALE))
}

export interface MatchOdds {
  /** Team A win probability, 0–1 (teamB = 1 - probA). */
  probA: number
  /** Which side the odds favour, or null when it's an exact 50/50. */
  favoured: 'a' | 'b' | null
}

/**
 * Favoured-to-win odds for a doubles court from each team's average effective
 * skill. Uses an Elo-style logistic on the skill gap, so it lines up with how
 * the matchmaker balances teams (higher combined effective skill = favourite).
 * Any non-exact split names a favourite; only a true 50/50 is "even".
 */
export function matchOdds(teamSkillA: number, teamSkillB: number): MatchOdds {
  const probA = winProbability(teamSkillA, teamSkillB)
  // Tie "favoured" to the displayed percentage: when both sides round to 50%
  // it reads as an even match — no favourite is shown and, since it's a
  // toss-up, whoever wins gains equal points. (A skill gap that still rounds to
  // 51/49 keeps its favourite.)
  const pctA = Math.round(probA * 100)
  const favoured = pctA > 50 ? 'a' : pctA < 50 ? 'b' : null
  return { probA, favoured }
}

/** True when the two teams are close enough to read as a 50/50 toss-up. */
export function isEvenMatch(teamSkillA: number, teamSkillB: number): boolean {
  return matchOdds(teamSkillA, teamSkillB).favoured === null
}

/** Points swing scale for a single decided match (indicative, Elo-style). */
export const MATCH_POINTS_K = 16

/**
 * Indicative ranking-point swing from one decided match: the winning team gains
 * this many, the losing team drops the same. Because it scales with 1 − (the
 * winner's pre-match win probability), an underdog win is worth more than a
 * favourite simply holding serve — mirroring how the game-day rating rewards
 * beating expectations. This is a per-match estimate for feedback on the card;
 * the official leaderboard change settles when the whole game day is locked.
 */
export function matchPoints(teamSkillWinner: number, teamSkillLoser: number): number {
  const expectedWin = winProbability(teamSkillWinner, teamSkillLoser)
  return MATCH_POINTS_K * (1 - expectedWin)
}
