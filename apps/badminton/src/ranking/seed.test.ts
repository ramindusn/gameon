import { describe, it, expect, vi, beforeEach } from 'vitest'

// The seed is only safe when the stored boards account for every finished
// match. The recompute that writes them runs best-effort on finish and logs
// rather than throws, so a failed one leaves them behind — and rating a day on
// top of a stale board starts from the wrong place, silently (TASK-88).
const { state } = vi.hoisted(() => ({
  state: {
    players: [] as { player_id: string; rating: number; rd: number; volatility: number; games: number }[],
    pairs: [] as unknown[],
    matchCount: 0,
  },
}))

vi.mock('@gameon/supabase', () => ({
  isE2E: () => false,
  supabase: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      const self = () => chain
      for (const k of ['select', 'eq', 'not', 'order']) chain[k] = self
      // Terminal: awaiting the builder resolves to the table's payload.
      chain.then = (resolve: (v: unknown) => void) => {
        if (table === 'player_ratings') return resolve({ data: state.players })
        if (table === 'pair_ratings') return resolve({ data: state.pairs })
        return resolve({ count: state.matchCount })
      }
      return chain
    },
  },
}))

import { loadRatingSeed } from './api'

const player = (id: string, games: number) => ({
  player_id: id, rating: 1500, rd: 60, volatility: 0.06, games,
})

beforeEach(() => {
  state.players = [player('a', 4), player('b', 4), player('c', 4), player('d', 4)]
  state.pairs = []
  state.matchCount = 4 // 4 matches x 4 player-games = 16 = sum(games)
})

describe('loadRatingSeed', () => {
  it('returns a seed when the stored games account for every scored match', async () => {
    const seed = await loadRatingSeed()
    expect(seed?.players.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(seed?.players[0].vol).toBe(0.06)
  })

  it('refuses when a day was finished but the recompute did not land', async () => {
    state.matchCount = 6 // six matches on the board, ratings only know four
    expect(await loadRatingSeed()).toBeNull()
  })

  it('refuses when there are no stored ratings at all', async () => {
    state.players = []
    expect(await loadRatingSeed()).toBeNull()
  })
})
