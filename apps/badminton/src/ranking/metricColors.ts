// Shared colour language for the two point metrics so they read as different
// things everywhere they appear (Standings, the public Game Day page, etc.):
//
//   • Points  = rally points from a single game day  → blue/sky
//   • Ranking = points counted toward the leaderboard → green (the brand accent)
//
// Keeping these in one place means every table/badge stays in sync.

/** Text colour for a game-day Points value/label. */
export const POINTS_TEXT = 'text-sky-400'
/** Text colour for a leaderboard Ranking value/label (positive). */
export const RANK_TEXT = 'text-accent-strong'
