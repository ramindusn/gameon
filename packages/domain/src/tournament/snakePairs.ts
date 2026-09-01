// Auto-pairing for fixed-pairs tournament setup (TASK-97). The matchmaker can
// tap-pick every pair by hand, but for a quick balanced starting point we rank
// players by current skill and cross-pair strongest with weakest — the same
// "snake" seeding used to balance brackets — so every pair ends up close in
// combined strength. The matchmaker still reviews the result and can swap
// players between pairs or unlock/re-pick by hand.

export interface SnakePairsResult<T> {
  /** Strongest+weakest, 2nd-strongest+2nd-weakest, ... */
  pairs: Array<[T, T]>
  /** The one player left over when the pool is odd-sized (the median by skill). */
  leftover: T[]
}

/**
 * Pair players by cross-seeding on skill: sort strongest to weakest, then pair
 * position i with position n-1-i. Each pair's combined skill stays close to
 * every other pair's, unlike pairing neighbours (which produces a strong pair
 * and a weak pair). An odd-sized pool leaves the middle-ranked player unpaired.
 *
 * The sort is stable, so equal-skill players keep their input order — callers
 * get deterministic output for a given input order.
 */
export function snakePairs<T extends { skill: number }>(players: T[]): SnakePairsResult<T> {
  const sorted = [...players].sort((a, b) => b.skill - a.skill)
  const n = sorted.length
  const pairs: Array<[T, T]> = []
  for (let i = 0; i < Math.floor(n / 2); i++) {
    pairs.push([sorted[i], sorted[n - 1 - i]])
  }
  const leftover = n % 2 === 1 ? [sorted[Math.floor(n / 2)]] : []
  return { pairs, leftover }
}
