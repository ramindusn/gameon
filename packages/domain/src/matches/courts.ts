// Optional real court numbers for a game day (TASK-99).
//
// A court is identified positionally everywhere — the draw writes court 1..N,
// add-match fills the next free slot, and match_results is unique on
// (session, round, court). That slot number is also what gets displayed, so a
// club actually playing on courts 5, 6 and 9 still reads "Court 1/2/3".
//
// These helpers keep the slot as the identity and treat the real numbers as a
// label over it: the matchmaker can give a list once per game day, and every
// court label maps slot -> label. No list means the label IS the slot, which is
// exactly the behaviour before this existed.

/**
 * Parse a matchmaker-typed court list ("5, 6, 9") into court numbers.
 *
 * Deliberately forgiving — this is a free-text field on the draw screen, not a
 * form to fight with. Extra whitespace, trailing commas and junk entries are
 * dropped rather than rejected; duplicates keep their first occurrence so two
 * courts can never share a label. Returns an empty array for empty or entirely
 * unusable input, which the callers treat as "no list given".
 */
export function parseCourtNumbers(input: string): number[] {
  const seen = new Set<number>()
  const out: number[] = []
  for (const part of input.split(/[,\s]+/)) {
    if (part === '') continue
    const n = Number(part)
    // Court numbers are whole and positive; anything else is typing noise.
    if (!Number.isInteger(n) || n < 1) continue
    if (seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

/**
 * The number to display for a court, given the game day's optional list.
 *
 * `slot` is the stored 1-based court. Falls back to the slot itself when there
 * is no list, or when the list is shorter than the slot — a game day that later
 * grows a court keeps a sensible label instead of showing nothing.
 */
export function courtLabel(slot: number, courtNumbers?: readonly number[] | null): number {
  return courtNumbers?.[slot - 1] ?? slot
}
