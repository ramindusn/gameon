import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GeneratedMatches } from '@gameon/domain'
import {
  createSessionFromPlan,
  deleteSession,
  getSession,
  listSessions,
  setResult,
  setSessionStatus,
  updateSessionPlayedAt,
  type Mode,
  type SessionStatus,
  type Side,
} from './api'

const SESSIONS_KEY = ['sessions'] as const
const sessionKey = (id: string) => ['session', id] as const

/** All sessions, newest first (ADR 0006: TanStack Query). */
export function useSessions() {
  return useQuery({ queryKey: SESSIONS_KEY, queryFn: listSessions })
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

/** Record a court's winner; refreshes the owning session. */
export function useSetResult(sessionId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { resultId: string; winner: Side | null }) =>
      setResult(v.resultId, v.winner),
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: sessionKey(sessionId) })
    },
  })
}

/** Flip a session between live/finished; refreshes the session + list. */
export function useSetSessionStatus(sessionId: string | undefined) {
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
