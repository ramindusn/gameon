// Round-robin scheduling for fixed-pairs tournaments (E11). Given N teams, every
// team plays every other team exactly once. The circle method groups the
// fixtures into rounds in which no team appears twice, so matches in a round can
// run on parallel courts. Pure + deterministic.

/** Schedule a single round-robin over `n` teams (referenced by index 0..n-1).
 *  Returns rounds, each a list of `[teamA, teamB]` index matchups. */
export function roundRobin(n: number): Array<Array<[number, number]>> {
  if (n < 2) return []
  // Odd team count → add a bye marker so the circle method stays balanced.
  const teams: number[] = Array.from({ length: n }, (_, i) => i)
  const bye = -1
  if (teams.length % 2 === 1) teams.push(bye)

  const m = teams.length
  const rounds: Array<Array<[number, number]>> = []
  // Fix teams[0]; rotate the rest. m-1 rounds for m (even) teams.
  const arr = [...teams]
  for (let r = 0; r < m - 1; r++) {
    const round: Array<[number, number]> = []
    for (let i = 0; i < m / 2; i++) {
      const a = arr[i]
      const b = arr[m - 1 - i]
      if (a !== bye && b !== bye) round.push([a, b])
    }
    rounds.push(round)
    // Rotate: keep arr[0] fixed, move the last element into position 1.
    arr.splice(1, 0, arr.pop() as number)
  }
  return rounds
}
