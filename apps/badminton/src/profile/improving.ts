import type { RatingHistoryPoint } from '../ranking/api'

// "Improving" badge logic (TASK-55, reworked): a player is improving when their
// rating has climbed over recent game days — the genuine improvement signal,
// since beating stronger opponents lifts the rating even on a losing day
// (unlike a raw win/loss tally). Pure + testable.

/** Compare the current rating to this many game days back. */
export const IMPROVING_WINDOW = 5
/** Game days of rating history needed before judging a trend. */
export const IMPROVING_MIN_GAMES = 3

export interface ImprovingResult {
  improving: boolean
  /** Rating points gained across the window (rounded, for the tooltip). */
  gain: number
}

/**
 * `points` is the rating after each game day the player played, oldest→newest.
 * Improving when the latest rating is above where it was ~IMPROVING_WINDOW game
 * days ago (or their first game day, if they have fewer). Needs at least
 * IMPROVING_MIN_GAMES game days so a single result can't flip it.
 */
export function computeImproving(points: RatingHistoryPoint[]): ImprovingResult {
  if (points.length < IMPROVING_MIN_GAMES) return { improving: false, gain: 0 }
  const now = Math.round(points[points.length - 1].rating)
  const past = Math.round(points[Math.max(0, points.length - 1 - IMPROVING_WINDOW)].rating)
  return { improving: now > past, gain: now - past }
}
