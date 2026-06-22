import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addPlayer,
  createMatchmaker,
  loadRoster,
  removePlayer,
  updatePlayer,
  type MatchmakerInput,
  type PlayerInput,
} from './api'

const ROSTER_KEY = ['roster'] as const

/** Roster list + the acting user's club id (ADR 0006: TanStack Query). */
export function useRoster() {
  return useQuery({ queryKey: ROSTER_KEY, queryFn: loadRoster })
}

/** Add/update/remove player mutations that refresh the roster on success. */
export function useRosterMutations(clubId: string | null | undefined) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ROSTER_KEY })
  const club = () => {
    if (!clubId) throw new Error('No club loaded')
    return clubId
  }

  return {
    add: useMutation({
      mutationFn: (p: PlayerInput) => addPlayer(club(), p),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (v: { id: string; input: PlayerInput }) => updatePlayer(v.id, v.input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => removePlayer(id),
      onSuccess: invalidate,
    }),
    createMatchmaker: useMutation({
      mutationFn: (input: MatchmakerInput) => createMatchmaker(input),
      onSuccess: invalidate,
    }),
  }
}
