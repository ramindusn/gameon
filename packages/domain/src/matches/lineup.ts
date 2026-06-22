// Pure match line-up validation (E09 / TASK-10.4). A doubles match needs four
// distinct players (two per team). The matchmaker may swap partners (AB vs CD ->
// AC vs BD) or substitute a different player on a live game day; either way the
// four chosen players must all be present and no one may appear twice. No I/O —
// shared by the live-editing UI and the add-custom-match form.

export interface LineupValidation {
  ok: boolean
  /** Present when ok is false: a human-readable reason. */
  error?: string
}

/**
 * Validate a four-player line-up (teamA[0], teamA[1], teamB[0], teamB[1]). All
 * four slots must be filled and every player must be distinct.
 */
export function validateLineup(ids: (string | null | undefined)[]): LineupValidation {
  if (ids.length !== 4 || ids.some((id) => id == null || id === '')) {
    return { ok: false, error: 'Pick four players (two per team).' }
  }
  const unique = new Set(ids)
  if (unique.size !== 4) {
    return { ok: false, error: 'A player cannot appear twice in the same match.' }
  }
  return { ok: true }
}
