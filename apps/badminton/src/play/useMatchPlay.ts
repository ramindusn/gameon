import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GeneratedMatches } from '@gameon/domain'
import {
  addCustomMatch,
  createSessionFromPlan,
  deleteMatch,
  deleteSession,
  getSession,
  listSessions,
  loadRecentResults,
  loadScheduledMatches,
  loadSessionPlayerCounts,
  setScore,
  setSessionStatus,
  updateMatchLineup,
  updateSessionPlayedAt,
  type Mode,
  type SessionStatus,
} from './api'

const SESSIONS_KEY = ['sessions'] as const
const sessionKey = (id: string) => ['session', id] as const

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

/** Create a live game day from a generated draw; refreshes the session list. */
export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      clubId: string
      plan: GeneratedMatches
      mode: Mode
      playedAt: string
    }) => createSessionFromPlan(v.clubId, v.plan, v.mode, v.playedAt),
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  })
}

/** Record a court's point scores (winner derived); refreshes the owning session. */
export function useSetScore(sessionId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { resultId: string; scoreA: number; scoreB: number }) =>
      setScore(v.resultId, v.scoreA, v.scoreB),
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: sessionKey(sessionId) })
    },
  })
}

/** Replace a live match's four players; refreshes the owning session. */
export function useUpdateMatchLineup(sessionId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      resultId: string
      teamA: [string, string]
      teamB: [string, string]
    }) => updateMatchLineup(v.resultId, v.teamA, v.teamB),
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: sessionKey(sessionId) })
    },
  })
}

/** Add an ad-hoc match to a live game day; refreshes the owning session. */
export function useAddCustomMatch(sessionId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      clubId: string
      round: number
      court: number
      players: [string, string, string, string]
    }) => addCustomMatch(v.clubId, sessionId as string, v.round, v.court, v.players),
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: sessionKey(sessionId) })
    },
  })
}

/** Delete a single match; refreshes the owning session. */
export function useDeleteMatch(sessionId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (resultId: string) => deleteMatch(resultId),
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: sessionKey(sessionId) })
    },
  })
}

/** Flip a session between live/finished; refreshes the session + list. */export function useSetSessionStatus(sessionId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: SessionStatus) =>
      setSessionStatus(sessionId as string, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY })
      if (sessionId) qc.invalidateQueries({ queryKey: sessionKey(sessionId) })
    },
  })
}

/** Edit a game day's date/time; refreshes the game day + list. */
export function useUpdateSessionPlayedAt(sessionId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (playedAt: string) =>
      updateSessionPlayedAt(sessionId as string, playedAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY })
      if (sessionId) qc.invalidateQueries({ queryKey: sessionKey(sessionId) })
    },
  })
}

/** Delete a game day; refreshes the list. */
export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; wasFinished: boolean }) =>
      deleteSession(v.id, v.wasFinished),
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  })
}
