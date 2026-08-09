import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Saving a score changes what the game day is worth, and since TASK-87 those
// figures are real rating calculations under their own query keys. They used to
// be left stale — the cards only picked up a new score after a manual refresh.
vi.mock('./api', () => ({
  setScore: vi.fn(() => Promise.resolve()),
  deleteMatch: vi.fn(() => Promise.resolve()),
  updateMatchLineup: vi.fn(() => Promise.resolve()),
  addCustomMatch: vi.fn(() => Promise.resolve()),
  substituteTeamPlayer: vi.fn(() => Promise.resolve()),
  listSessions: vi.fn(() => Promise.resolve([])),
  getSession: vi.fn(() => Promise.resolve(null)),
  createSessionFromPlan: vi.fn(),
  setSessionStatus: vi.fn(() => Promise.resolve()),
  setSessionHidden: vi.fn(() => Promise.resolve()),
  setSessionPlayedAt: vi.fn(() => Promise.resolve()),
  loadSessionPlayerCounts: vi.fn(() => Promise.resolve({})),
  loadTournamentTeams: vi.fn(() => Promise.resolve([])),
}))
vi.mock('@gameon/ui', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('@gameon/supabase', () => ({ supabase: null }))

import { useSetScore, useDeleteMatch, useUpdateMatchLineup } from './useMatchPlay'

function harness() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const spy = vi.spyOn(qc, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { qc, spy, wrapper }
}

const keys = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown[] }).queryKey))

describe('a match change refetches the session AND its rating figures', () => {
  it('after saving a score', async () => {
    const { spy, wrapper } = harness()
    const { result } = renderHook(() => useSetScore('s1'), { wrapper })
    result.current.mutate({ resultId: 'r1', scoreA: 21, scoreB: 15 })
    await waitFor(() => expect(spy).toHaveBeenCalled())
    const k = keys(spy)
    expect(k).toContain(JSON.stringify(['session', 's1']))
    expect(k).toContain(JSON.stringify(['ratings', 'game-day-deltas', 's1']))
    expect(k).toContain(JSON.stringify(['ratings', 'match-deltas', 's1']))
    // Scoped to this game day: a score entry must not drag the leaderboard's
    // own queries along with it.
    expect(k).not.toContain(JSON.stringify(['ratings']))
  })

  it('after deleting a match', async () => {
    const { spy, wrapper } = harness()
    const { result } = renderHook(() => useDeleteMatch('s1'), { wrapper })
    result.current.mutate('r1')
    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(keys(spy)).toContain(JSON.stringify(['ratings', 'match-deltas', 's1']))
  })

  it('after changing a line-up', async () => {
    const { spy, wrapper } = harness()
    const { result } = renderHook(() => useUpdateMatchLineup('s1'), { wrapper })
    result.current.mutate({ resultId: 'r1', teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] })
    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(keys(spy)).toContain(JSON.stringify(['ratings', 'match-deltas', 's1']))
  })
})
