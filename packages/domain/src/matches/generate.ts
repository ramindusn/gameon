// Balanced-doubles match generator (E03 / TASK-4.1). The `open` path is a typed
// port of BadmintonApp's src/lib/matchEngine.js (+ the shuffle/pairKey/matchKey
// helpers from its utils.js); the `mixed` path is the new mixed-doubles mode
// (male+female pairs) layered on top. Pure + deterministic (injectable RNG).

import type {
  GeneratedMatches,
  GenerateOptions,
  Match,
  MatchPlayer,
  Round,
  Team,
} from './types'

type Rng = () => number
type PairTally = Record<string, Record<string, number>>

interface EngineState {
  partnerCounts: PairTally
  opponentCounts: PairTally
  lastPartnerKeys: Record<string, boolean>
  matchHistory: Record<string, number>
  courtOffset: number
}

// ---- helpers (ported from BadmintonApp utils.js) --------------------------

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pairKey(a: MatchPlayer, b: MatchPlayer): string {
  return String(a.id) < String(b.id) ? `${a.id}-${b.id}` : `${b.id}-${a.id}`
}

function matchKey(t1: Team, t2: Team): string {
  let ta = [t1[0].id, t1[1].id].sort((a, b) => String(a).localeCompare(String(b)))
  let tb = [t2[0].id, t2[1].id].sort((a, b) => String(a).localeCompare(String(b)))
  if (String(ta[0]) > String(tb[0])) [ta, tb] = [tb, ta]
  return `${ta.join('-')}|${tb.join('-')}`
}

const getPC = (pc: PairTally, a: MatchPlayer, b: MatchPlayer): number =>
  (pc[a.id] && pc[a.id][b.id]) || 0
const getOC = (oc: PairTally, a: MatchPlayer, b: MatchPlayer): number =>
  (oc[a.id] && oc[a.id][b.id]) || 0
const getCC = (pc: PairTally, oc: PairTally, a: MatchPlayer, b: MatchPlayer): number =>
  getPC(pc, a, b) + getOC(oc, a, b)

function recordMatch(state: EngineState, t1: Team, t2: Team): void {
  const { partnerCounts, opponentCounts, matchHistory } = state
  const lp = (a: MatchPlayer, b: MatchPlayer) => {
    if (!partnerCounts[a.id]) partnerCounts[a.id] = {}
    if (!partnerCounts[b.id]) partnerCounts[b.id] = {}
    partnerCounts[a.id][b.id] = (partnerCounts[a.id][b.id] || 0) + 1
    partnerCounts[b.id][a.id] = (partnerCounts[b.id][a.id] || 0) + 1
  }
  const lo = (a: MatchPlayer, b: MatchPlayer) => {
    if (!opponentCounts[a.id]) opponentCounts[a.id] = {}
    if (!opponentCounts[b.id]) opponentCounts[b.id] = {}
    opponentCounts[a.id][b.id] = (opponentCounts[a.id][b.id] || 0) + 1
    opponentCounts[b.id][a.id] = (opponentCounts[b.id][a.id] || 0) + 1
  }
  lp(t1[0], t1[1])
  lp(t2[0], t2[1])
  lo(t1[0], t2[0])
  lo(t1[0], t2[1])
  lo(t1[1], t2[0])
  lo(t1[1], t2[1])
  matchHistory[matchKey(t1, t2)] = (matchHistory[matchKey(t1, t2)] || 0) + 1
}

// ---- open mode (port of matchEngine.js) -----------------------------------

function scoreMatch(
  state: EngineState,
  t1: Team,
  t2: Team,
  top2: Record<string, boolean>,
  bot2: Record<string, boolean>,
  relax: number,
): number {
  const { partnerCounts, opponentCounts, lastPartnerKeys, matchHistory } = state
  if (top2[t1[0].id] && top2[t1[1].id]) return Infinity
  if (top2[t2[0].id] && top2[t2[1].id]) return Infinity
  if (bot2[t1[0].id] && bot2[t1[1].id]) return Infinity
  if (bot2[t2[0].id] && bot2[t2[1].id]) return Infinity
  if (relax < 1) {
    if (lastPartnerKeys[pairKey(t1[0], t1[1])]) return Infinity
    if (lastPartnerKeys[pairKey(t2[0], t2[1])]) return Infinity
  }
  if (relax < 2) {
    if (getPC(partnerCounts, t1[0], t1[1]) >= 2) return Infinity
    if (getPC(partnerCounts, t2[0], t2[1]) >= 2) return Infinity
  }
  if (relax < 3) {
    if ((matchHistory[matchKey(t1, t2)] || 0) > 0) return Infinity
  }
  if (relax >= 4) {
    return Math.abs(t1[0].skill + t1[1].skill - (t2[0].skill + t2[1].skill))
  }
  const sd = Math.abs(t1[0].skill + t1[1].skill - (t2[0].skill + t2[1].skill))
  let contactScore = 0
  const all4 = [t1[0], t1[1], t2[0], t2[1]]
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const cc = getCC(partnerCounts, opponentCounts, all4[i], all4[j])
      contactScore += cc === 0 ? -15 : cc
    }
  }
  return (
    sd * 10 +
    (getPC(partnerCounts, t1[0], t1[1]) + getPC(partnerCounts, t2[0], t2[1])) * 8 +
    (getOC(opponentCounts, t1[0], t2[0]) +
      getOC(opponentCounts, t1[0], t2[1]) +
      getOC(opponentCounts, t1[1], t2[0]) +
      getOC(opponentCounts, t1[1], t2[1])) +
    contactScore +
    (matchHistory[matchKey(t1, t2)] || 0) * 20
  )
}

function scoreCourt(
  state: EngineState,
  group: MatchPlayer[],
  top2: Record<string, boolean>,
  bot2: Record<string, boolean>,
  relax: number,
): { pair: Match | null; score: number } {
  const combos: Match[] = [
    [
      [group[0], group[1]],
      [group[2], group[3]],
    ],
    [
      [group[0], group[2]],
      [group[1], group[3]],
    ],
    [
      [group[0], group[3]],
      [group[1], group[2]],
    ],
  ]
  let best: Match | null = null
  let bestSc = Infinity
  for (const combo of combos) {
    const sc = scoreMatch(state, combo[0], combo[1], top2, bot2, relax)
    if (sc < bestSc) {
      bestSc = sc
      best = combo
    }
  }
  return { pair: best, score: bestSc }
}

const avgSkill = (group: MatchPlayer[]): number =>
  group.reduce((s, p) => s + p.skill, 0) / group.length

function combinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = []
  const pick = (start: number, chosen: T[]) => {
    if (chosen.length === k) {
      result.push(chosen.slice())
      return
    }
    for (let i = start; i < arr.length; i++) {
      chosen.push(arr[i])
      pick(i + 1, chosen)
      chosen.pop()
    }
  }
  pick(0, [])
  return result
}

function searchCourts2(
  state: EngineState,
  pool: MatchPlayer[],
  top2: Record<string, boolean>,
  bot2: Record<string, boolean>,
  relax: number,
  highIds: Record<string, boolean> | null,
): Match[] | null {
  let bestTotal = Infinity
  let bestResult: Match[] | null = null
  for (const g1 of combinations(pool, 4)) {
    if (highIds && !g1.every((p) => highIds[p.id])) continue
    const g1map: Record<string, boolean> = {}
    g1.forEach((p) => (g1map[p.id] = true))
    const g2 = pool.filter((p) => !g1map[p.id])
    const r1 = scoreCourt(state, g1, top2, bot2, relax)
    const r2 = scoreCourt(state, g2, top2, bot2, relax)
    if (!r1.pair || !r2.pair || r1.score === Infinity || r2.score === Infinity) continue
    const tier = Math.max(0, avgSkill(g2) - avgSkill(g1)) * 5
    const tot = r1.score + r2.score + tier
    if (tot < bestTotal) {
      bestTotal = tot
      bestResult = [r1.pair, r2.pair]
    }
  }
  return bestResult
}

function searchCourts3(
  state: EngineState,
  pool: MatchPlayer[],
  top2: Record<string, boolean>,
  bot2: Record<string, boolean>,
  relax: number,
  highIds: Record<string, boolean> | null,
): Match[] | null {
  let bestTotal = Infinity
  let bestResult: Match[] | null = null
  for (const g1 of combinations(pool, 4)) {
    if (highIds && !g1.every((p) => highIds[p.id])) continue
    const g1map: Record<string, boolean> = {}
    g1.forEach((p) => (g1map[p.id] = true))
    const rest = pool.filter((p) => !g1map[p.id])
    for (const g2 of combinations(rest, 4)) {
      const g2map: Record<string, boolean> = {}
      g2.forEach((p) => (g2map[p.id] = true))
      const g3 = rest.filter((p) => !g2map[p.id])
      const r1 = scoreCourt(state, g1, top2, bot2, relax)
      const r2 = scoreCourt(state, g2, top2, bot2, relax)
      const r3 = scoreCourt(state, g3, top2, bot2, relax)
      if (
        !r1.pair ||
        !r2.pair ||
        !r3.pair ||
        r1.score === Infinity ||
        r2.score === Infinity ||
        r3.score === Infinity
      )
        continue
      const tier =
        Math.max(0, avgSkill(g2) - avgSkill(g1)) * 5 +
        Math.max(0, avgSkill(g3) - avgSkill(g2)) * 5
      const tot = r1.score + r2.score + r3.score + tier
      if (tot < bestTotal) {
        bestTotal = tot
        bestResult = [r1.pair, r2.pair, r3.pair]
      }
    }
  }
  return bestResult
}

function assignCourts(
  state: EngineState,
  active: MatchPlayer[],
  courts: number,
  top2: Record<string, boolean>,
  bot2: Record<string, boolean>,
  allAvgSkill: number,
  forceHighCourt: boolean,
): Match[] {
  const sorted = active.slice().sort((a, b) => b.skill - a.skill)
  const maxOff = Math.max(courts * 2, 1)
  const off = state.courtOffset % maxOff
  state.courtOffset++
  let pool = sorted.slice(off).concat(sorted.slice(0, off))
  pool = pool.slice(0, courts * 4)

  let highIds: Record<string, boolean> | null = null
  if (forceHighCourt && courts >= 2) {
    const highPlayers = pool.filter((p) => p.skill > allAvgSkill)
    if (highPlayers.length >= 4) {
      highIds = {}
      highPlayers.slice(0, 4).forEach((p) => (highIds![p.id] = true))
    }
  }

  for (let relax = 0; relax <= 4; relax++) {
    let result: Match[] | null = null
    if (courts === 1) {
      const r = scoreCourt(state, pool, top2, bot2, relax)
      if (r.pair && r.score < Infinity) result = [r.pair]
    } else if (courts === 2) {
      if (highIds) result = searchCourts2(state, pool, top2, bot2, relax, highIds)
      if (!result) result = searchCourts2(state, pool, top2, bot2, relax, null)
    } else if (courts === 3) {
      if (highIds) result = searchCourts3(state, pool, top2, bot2, relax, highIds)
      if (!result) result = searchCourts3(state, pool, top2, bot2, relax, null)
    }
    if (result) return result
  }

  // Fallback: sequential grouping (also handles courts > 3).
  const fb: Match[] = []
  for (let c = 0; c < courts; c++) {
    const g = pool.slice(c * 4, c * 4 + 4)
    fb.push([
      [g[0], g[1]],
      [g[2], g[3]],
    ])
  }
  return fb
}

function freshState(): EngineState {
  return {
    partnerCounts: {},
    opponentCounts: {},
    lastPartnerKeys: {},
    matchHistory: {},
    courtOffset: 0,
  }
}

function generateOpen(
  pp: MatchPlayer[],
  numRounds: number,
  rng: Rng,
): GeneratedMatches | null {
  if (pp.length < 4) return null
  const courts = Math.floor(pp.length / 4)
  const sittingCount = pp.length - courts * 4
  const state = freshState()

  const ppSorted = pp.slice().sort((a, b) => b.skill - a.skill)
  const top2: Record<string, boolean> = {}
  const bot2: Record<string, boolean> = {}
  if (ppSorted.length >= 2) {
    top2[ppSorted[0].id] = true
    top2[ppSorted[1].id] = true
    bot2[ppSorted[ppSorted.length - 1].id] = true
    bot2[ppSorted[ppSorted.length - 2].id] = true
  }
  const allAvgSkill = pp.reduce((s, p) => s + p.skill, 0) / pp.length

  // Pre-build sitting rotation so the same people don't keep sitting out.
  const sitGroups: MatchPlayer[][] = []
  if (sittingCount > 0) {
    let remaining: MatchPlayer[] = []
    let lastGroupIds: string[] = []
    while (sitGroups.length < numRounds) {
      if (remaining.length < sittingCount) {
        const newCycle = shuffle(pp.slice(), rng)
        lastGroupIds.forEach((id) => {
          const idx = newCycle.findIndex((p) => p.id === id)
          if (idx > -1) newCycle.push(newCycle.splice(idx, 1)[0])
        })
        remaining = remaining.concat(newCycle)
      }
      const group = remaining.splice(0, sittingCount)
      for (let gi = 0; gi < group.length; gi++) {
        if (lastGroupIds.indexOf(group[gi].id) >= 0) {
          for (let ri = 0; ri < remaining.length; ri++) {
            if (lastGroupIds.indexOf(remaining[ri].id) < 0) {
              ;[group[gi], remaining[ri]] = [remaining[ri], group[gi]]
              break
            }
          }
        }
      }
      lastGroupIds = group.map((p) => p.id)
      sitGroups.push(group)
    }
  }

  const rounds: Round[] = []
  for (let r = 0; r < numRounds; r++) {
    const sitting = sittingCount > 0 ? sitGroups[r] : []
    const sittingIds = sitting.map((p) => p.id)
    const active = pp.filter((p) => !sittingIds.includes(p.id))
    const forceHighCourt = r % 2 === 1
    const matches = assignCourts(
      state,
      active,
      courts,
      top2,
      bot2,
      allAvgSkill,
      forceHighCourt,
    )

    const thisRoundKeys: Record<string, boolean> = {}
    matches.forEach((pair) => {
      recordMatch(state, pair[0], pair[1])
      thisRoundKeys[pairKey(pair[0][0], pair[0][1])] = true
      thisRoundKeys[pairKey(pair[1][0], pair[1][1])] = true
    })
    state.lastPartnerKeys = thisRoundKeys

    rounds.push({ sitting, matches, courts })
  }

  return { rounds, courts, sittingCount, totalPlayers: pp.length, unplaceable: [] }
}

// ---- mixed mode (new) -----------------------------------------------------

/** Score a mixed court's two pairings; pick the male+female split that best
 *  balances skill while spreading partners. Returns the chosen Match. */
function bestMixedPair(state: EngineState, m: Team, f: Team): Match {
  // Two ways to make male+female teams from {m0,m1,f0,f1}.
  const options: Match[] = [
    [
      [m[0], f[0]],
      [m[1], f[1]],
    ],
    [
      [m[0], f[1]],
      [m[1], f[0]],
    ],
  ]
  const score = (t1: Team, t2: Team): number => {
    const sd = Math.abs(t1[0].skill + t1[1].skill - (t2[0].skill + t2[1].skill))
    const pr =
      getPC(state.partnerCounts, t1[0], t1[1]) + getPC(state.partnerCounts, t2[0], t2[1])
    const op =
      getOC(state.opponentCounts, t1[0], t2[0]) +
      getOC(state.opponentCounts, t1[1], t2[1])
    const rematch = (state.matchHistory[matchKey(t1, t2)] || 0) * 20
    return sd * 10 + pr * 8 + op + rematch
  }
  return options[0] &&
    score(options[0][0], options[0][1]) <= score(options[1][0], options[1][1])
    ? options[0]
    : options[1]
}

function generateMixed(
  present: MatchPlayer[],
  numRounds: number,
  rng: Rng,
): GeneratedMatches | null {
  const males = present.filter((p) => p.gender === 'male')
  const females = present.filter((p) => p.gender === 'female')
  // Players with no usable gender can never be in a mixed pair.
  const unplaceable = present.filter((p) => p.gender !== 'male' && p.gender !== 'female')

  const courts = Math.floor(Math.min(males.length, females.length) / 2)
  if (courts < 1) return null

  const state = freshState()
  const sittingCount =
    males.length - courts * 2 + (females.length - courts * 2) + unplaceable.length

  // Rotate playing males/females each round so different people sit out.
  let mPool = shuffle(males, rng)
  let fPool = shuffle(females, rng)
  const rotate = <T>(a: T[], by: number) =>
    a.slice(by % a.length).concat(a.slice(0, by % a.length))

  const rounds: Round[] = []
  for (let r = 0; r < numRounds; r++) {
    const mRound = rotate(mPool, r * 2).slice(0, courts * 2)
    const fRound = rotate(fPool, r * 2).slice(0, courts * 2)
    const playingIds = new Set([...mRound, ...fRound].map((p) => p.id))
    const sitting = present.filter((p) => !playingIds.has(p.id))

    // Tier by skill: strongest males/females share the top court.
    const mSorted = mRound.slice().sort((a, b) => b.skill - a.skill)
    const fSorted = fRound.slice().sort((a, b) => b.skill - a.skill)

    const matches: Match[] = []
    for (let c = 0; c < courts; c++) {
      const m: Team = [mSorted[c * 2], mSorted[c * 2 + 1]]
      const f: Team = [fSorted[c * 2], fSorted[c * 2 + 1]]
      const match = bestMixedPair(state, m, f)
      recordMatch(state, match[0], match[1])
      matches.push(match)
    }
    rounds.push({ sitting, matches, courts })
    // re-shuffle pools occasionally to vary partners further
    if (r % 4 === 3) {
      mPool = shuffle(mPool, rng)
      fPool = shuffle(fPool, rng)
    }
  }

  return { rounds, courts, sittingCount, totalPlayers: present.length, unplaceable }
}

/**
 * Generate `numRounds` rounds of balanced doubles from `players`. Absent players
 * are excluded. `open` (default) balances by skill; `mixed` forms male+female
 * pairs. Returns null if no valid round can be formed.
 */
export function generateRounds(
  players: MatchPlayer[],
  numRounds: number,
  opts: GenerateOptions = {},
): GeneratedMatches | null {
  const rng = opts.rng ?? Math.random
  const present = players.filter((p) => !p.absent)
  return opts.mode === 'mixed'
    ? generateMixed(present, numRounds, rng)
    : generateOpen(present, numRounds, rng)
}
