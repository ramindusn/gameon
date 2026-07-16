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
