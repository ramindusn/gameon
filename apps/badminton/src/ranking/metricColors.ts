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

// Frame variants of the game-day blue, for containers that hold game-day
// content (e.g. the Home Game Day Podium card) so the whole card — not just its
// numbers — reads as "game day". Ranking/leaderboard surfaces keep the green
// brand accent, so a blue frame is an unambiguous "this is a game day" cue.

/** Card border + subtle fill for a game-day container. */
export const POINTS_FRAME = 'border-sky-400/40 bg-sky-400/5'
/** Hover border for a tappable game-day container. */
export const POINTS_FRAME_HOVER = 'hover:border-sky-400'
/** Focus ring for a tappable game-day container. */
export const POINTS_RING = 'focus:ring-sky-400'
/** Highlight for the winner's pedestal on a game-day podium. */
export const POINTS_HILITE = 'border-sky-400 bg-sky-400/15'
