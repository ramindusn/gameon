import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GeneratedMatches } from '@gameon/domain'
import {
  createSessionFromPlan,
  getSession,
  listSessions,
  setResult,
  setSessionStatus,
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

/** Create a live session from a generated draw; refreshes the session list. */
export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { clubId: string; plan: GeneratedMatches; mode: Mode }) =>
      createSessionFromPlan(v.clubId, v.plan, v.mode),
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
