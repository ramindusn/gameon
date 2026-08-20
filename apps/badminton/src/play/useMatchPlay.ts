import { useEffect } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useToast } from '@gameon/ui'
import { supabase } from '@gameon/supabase'
import type { GeneratedMatches } from '@gameon/domain'
import {
  addCustomMatch,
  createSessionFromPlan,
  createTournamentWithMatches,
  deleteMatch,
  deleteSession,
  getSession,
  listSessions,
  loadRecentResults,
  loadScheduledMatches,
  loadSessionPlayerCounts,
  setScore,
  setSessionHidden,
  setSessionStatus,
  updateMatchLineup,
  updateSessionPlayedAt,
  type Mode,
  type SessionStatus,
  loadTournamentTeams,
  substituteTeamPlayer,
  type TournamentFixture,
} from './api'

const SESSIONS_KEY = ['sessions'] as const
const sessionKey = (id: string) => ['session', id] as const

/**
 * Refetch everything a match change affects.
 *
 * Changing a score changes what the day is worth, and since TASK-87 those
 * figures are real rating calculations living under their own query keys — the
 * Standings column and the per-match numbers on the cards. Invalidating only
 * the session left them stale until a manual refresh, which is how the cards
 * appeared not to update at all.
 *
 * Scoped to this session's rating keys rather than all of ['ratings'], so a
 * score entry does not drag the leaderboard's queries along with it.
 */
function invalidateSession(qc: QueryClient, id: string) {
  void qc.invalidateQueries({ queryKey: sessionKey(id) })
  void qc.invalidateQueries({ queryKey: ['ratings', 'game-day-deltas', id] })
  void qc.invalidateQueries({ queryKey: ['ratings', 'match-deltas', id] })
}

/** All sessions, newest first (ADR 0006: TanStack Query). */
export function useSessions() {
  return useQuery({ queryKey: SESSIONS_KEY, queryFn: listSessions })
}

/** Distinct player counts per session, keyed by session id. */
export function useSessionPlayerCounts(sessionIds: string[]) {
  return useQuery({
    queryKey: ['session-player-counts', [...sessionIds].sort()] as const,
    queryFn: () => loadSessionPlayerCounts(sessionIds),
    enabled: sessionIds.length > 0,
  })
}

/** Unscored matches in live game days — the public home's "Scheduled Matches". */
export function useScheduledMatches(limit?: number) {
  return useQuery({
    queryKey: ['feed', 'scheduled', limit ?? null] as const,
    queryFn: () => loadScheduledMatches(limit),
  })
}

/** Recently played matches across game days — the home's "Recent Results". */
export function useRecentResults(limit?: number) {
  return useQuery({
    queryKey: ['feed', 'recent', limit ?? null] as const,
    queryFn: () => loadRecentResults(limit),
  })
}

/** One session + its results. Disabled until an id is provided. */
export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: sessionKey(id ?? ''),
    queryFn: () => getSession(id as string),
    enabled: Boolean(id),
  })
}

/**
 * Keep an open game day live for every viewer: subscribe to Postgres changes on
 * this session's rows and refetch when the matchmaker saves a score, edits a
 * line-up, or adds/removes a match — so players watching see scores + standings
 * update without refreshing. No-ops when Supabase is unconfigured (tests/E2E).
 */
export function useSessionRealtime(id: string | undefined) {
  const qc = useQueryClient()
  useEffect(() => {
    // Capture a non-null local so the cleanup closure keeps the narrowed type.
    const client = supabase
    if (!id || !client) return
    const invalidate = () => invalidateSession(qc, id)
    const channel = client
      .channel(`session:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_results', filter: `session_id=eq.${id}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_sessions', filter: `id=eq.${id}` },
        invalidate,
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [id, qc])
}

/** Create a live game day from a generated draw; refreshes the session list. */
export function useCreateSession() {
  const qc = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (v: {
      clubId: string
      plan: GeneratedMatches
      mode: Mode
      playedAt: string
    }) => createSessionFromPlan(v.clubId, v.plan, v.mode, v.playedAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY })
      success('Game day created')
    },
    onError: () => error('Could not create the game day'),
  })
}

/** Start a fixed-pairs tournament pre-filled with round-robin fixtures (E11). */
export function useCreateTournamentWithMatches() {
  const qc = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (v: { clubId: string; playedAt: string; fixtures: TournamentFixture[] }) =>
      createTournamentWithMatches(v.clubId, v.playedAt, v.fixtures),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY })
      success('Tournament created')
    },
    // This was the only mutation here with no onError, so a rejected insert
    // left the button going back to "Generate matches" and nothing else
    // happening — the failure was invisible.
    onError: () => error('Could not create the tournament'),
  })
}

/** Record a court's point scores (winner derived); refreshes the owning session. */
export function useTournamentTeams(sessionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['tournament-teams', sessionId],
    queryFn: () => loadTournamentTeams(sessionId as string),
    enabled: !!sessionId && enabled,
  })
}

/** Swap one member of a pair; the team keeps its record (TASK-80). */
export function useSubstituteTeamPlayer(sessionId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: Parameters<typeof substituteTeamPlayer>[0]) => substituteTeamPlayer(v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournament-teams', sessionId] })
      if (sessionId) invalidateSession(qc, sessionId)
    },
  })
}

export function useSetScore(sessionId: string | undefined) {
  const qc = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (v: { resultId: string; scoreA: number; scoreB: number }) =>
      setScore(v.resultId, v.scoreA, v.scoreB),
    onSuccess: () => {
      if (sessionId) invalidateSession(qc, sessionId)
      success('Score saved')
    },
    onError: () => error('Could not save the score'),
  })
}

/** Replace a live match's four players; refreshes the owning session. */
export function useUpdateMatchLineup(sessionId: string | undefined) {
  const qc = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (v: {
      resultId: string
      teamA: [string, string]
      teamB: [string, string]
    }) => updateMatchLineup(v.resultId, v.teamA, v.teamB),
    onSuccess: () => {
      if (sessionId) invalidateSession(qc, sessionId)
      success('Line-up updated')
    },
    onError: () => error('Could not update the line-up'),
  })
}

/** Add an ad-hoc match to a live game day; refreshes the owning session. */
export function useAddCustomMatch(sessionId: string | undefined) {
  const qc = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (v: {
      clubId: string
      round: number
      court: number
      players: [string, string, string, string]
    }) => addCustomMatch(v.clubId, sessionId as string, v.round, v.court, v.players),
    onSuccess: () => {
      if (sessionId) invalidateSession(qc, sessionId)
      success('Match added')
    },
    onError: (err: unknown) => {
      // 23505 = the (session, round, court) unique index — another match took
      // that slot first. Refetching corrects the next computed court.
      const code = (err as { code?: string } | null)?.code
      if (sessionId) invalidateSession(qc, sessionId)
      error(
        code === '23505'
          ? 'That court was just taken — try adding the match again.'
          : 'Could not add the match',
      )
    },
  })
}

/** Delete a single match; refreshes the owning session. */
export function useDeleteMatch(sessionId: string | undefined) {
  const qc = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (resultId: string) => deleteMatch(resultId),
    onSuccess: () => {
      if (sessionId) invalidateSession(qc, sessionId)
      success('Match removed')
    },
    onError: () => error('Could not remove the match'),
  })
}

/** Flip a session between live/finished; refreshes the session + list. */
export function useSetSessionStatus(sessionId: string | undefined) {
  const qc = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (status: SessionStatus) =>
      setSessionStatus(sessionId as string, status),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY })
      if (sessionId) invalidateSession(qc, sessionId)
      // Finishing recomputes the boards — refresh the leaderboard queries too.
      qc.invalidateQueries({ queryKey: ['ratings'] })
      success(status === 'finished' ? 'Game day finished' : 'Game day reopened')
    },
    onError: () => error('Could not update the game day'),
  })
}

/** Edit a game day's date/time; refreshes the game day + list. */
export function useUpdateSessionPlayedAt(sessionId: string | undefined) {
  const qc = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (playedAt: string) =>
      updateSessionPlayedAt(sessionId as string, playedAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY })
      if (sessionId) invalidateSession(qc, sessionId)
      success('Date updated')
    },
    onError: () => error('Could not update the date'),
  })
}

/** Show/hide a game day on the public home; refreshes the game day + boards. */
export function useSetSessionHidden(sessionId: string | undefined) {
  const qc = useQueryClient()
  const { error } = useToast()
  return useMutation({
    mutationFn: (hidden: boolean) => setSessionHidden(sessionId as string, hidden),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY })
      if (sessionId) invalidateSession(qc, sessionId)
      qc.invalidateQueries({ queryKey: ['ratings', 'game-days'] })
    },
    onError: () => error('Could not update home visibility'),
  })
}

/** Delete a game day; refreshes the list. */
export function useDeleteSession() {
  const qc = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (v: { id: string; wasFinished: boolean }) =>
      deleteSession(v.id, v.wasFinished),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY })
      success('Game day deleted')
    },
    onError: () => error('Could not delete the game day'),
  })
}
