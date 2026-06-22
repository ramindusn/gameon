// Pure match-scoring helpers (E09 / TASK-10.3). A doubles match is scored by two
// non-negative point totals; the winner is the higher score. No I/O — used by
// both the play UI (to derive/validate a result) and, conceptually, the ranking
// recompute (which consumes score_a/score_b as a point margin — ADR 0011).

export type Side = 'a' | 'b'

export interface ScoreValidation {
  ok: boolean
  /** Present when ok is false: a human-readable reason. */
  error?: string
}

/**
 * Validate a pair of match scores. Both must be present, integer, and >= 0, and
 * they may not be equal (a doubles match has a winner — no ties).
 */
export function validateScores(
  scoreA: number | null | undefined,
  scoreB: number | null | undefined,
): ScoreValidation {
  if (scoreA == null || scoreB == null) {
    return { ok: false, error: 'Enter both scores.' }
  }
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) {
    return { ok: false, error: 'Scores must be whole numbers.' }
  }
  if (scoreA < 0 || scoreB < 0) {
    return { ok: false, error: 'Scores cannot be negative.' }
  }
  if (scoreA === scoreB) {
    return { ok: false, error: 'Scores cannot be tied — a match has a winner.' }
  }
  return { ok: true }
}

/**
 * Derive the winning side from two scores, or null if the scores are invalid
 * (missing/negative/non-integer/tied). 'a' wins when scoreA > scoreB.
 */
export function deriveWinner(
  scoreA: number | null | undefined,
  scoreB: number | null | undefined,
): Side | null {
  if (!validateScores(scoreA, scoreB).ok) return null
  return (scoreA as number) > (scoreB as number) ? 'a' : 'b'
}
