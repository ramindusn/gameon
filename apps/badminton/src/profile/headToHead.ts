import type { PlayerMatch } from '../play/api'

// Head-to-head insights for the player profile (TASK-65). Pure aggregation over
// a player's own match history — one row per partner and per opponent, with the
// player's record (games + their wins) alongside that person. No DB access, so
// it's cheap to compute in the component and easy to unit-test.

/** A partner/opponent and the player's record alongside/against them. */
export interface DuoStat {
  playerId: string
  /** Matches played with (partner) or against (opponent) this person. */
  games: number
  /** The profile player's wins in those matches. */
  wins: number
}

const winRate = (s: DuoStat): number => s.wins / s.games

/** Record with each partner, most-played first (ties: better record, then id). */
export function computePartnerStats(matches: PlayerMatch[]): DuoStat[] {
  const by = new Map<string, DuoStat>()
  for (const m of matches) {
    if (!m.partnerId) continue
    const s = by.get(m.partnerId) ?? { playerId: m.partnerId, games: 0, wins: 0 }
    s.games += 1
    if (m.won) s.wins += 1
    by.set(m.partnerId, s)
  }
  return [...by.values()].sort(
    (a, b) => b.games - a.games || winRate(b) - winRate(a) || a.playerId.localeCompare(b.playerId),
  )
}

/** Record against each opponent, most-faced first (a match has two opponents). */
export function computeOpponentStats(matches: PlayerMatch[]): DuoStat[] {
  const by = new Map<string, DuoStat>()
  for (const m of matches) {
    for (const oid of m.opponentIds) {
      if (!oid) continue
      const s = by.get(oid) ?? { playerId: oid, games: 0, wins: 0 }
      s.games += 1
      if (m.won) s.wins += 1
      by.set(oid, s)
    }
  }
  return [...by.values()].sort(
    (a, b) => b.games - a.games || winRate(b) - winRate(a) || a.playerId.localeCompare(b.playerId),
  )
}

/**
 * Opponents the player beats least often — lowest win-rate first — among those
 * faced at least `minGames` times, so a single fluke loss doesn't dominate.
 */
export function toughestOpponents(matches: PlayerMatch[], minGames = 2): DuoStat[] {
  return computeOpponentStats(matches)
    .filter((o) => o.games >= minGames)
    .sort(
      (a, b) => winRate(a) - winRate(b) || b.games - a.games || a.playerId.localeCompare(b.playerId),
    )
}
