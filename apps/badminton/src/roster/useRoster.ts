import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@gameon/ui'
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
  const { success, error } = useToast()
  const invalidate = () => qc.invalidateQueries({ queryKey: ROSTER_KEY })
  const club = () => {
    if (!clubId) throw new Error('No club loaded')
    return clubId
  }

  return {
    add: useMutation({
      mutationFn: (p: PlayerInput) => addPlayer(club(), p),
      onSuccess: () => {
        invalidate()
        success('Player added')
      },
      onError: () => error('Could not add the player'),
    }),
    update: useMutation({
      mutationFn: (v: { id: string; input: PlayerInput }) => updatePlayer(v.id, v.input),
      onSuccess: () => {
        invalidate()
        success('Player updated')
      },
      onError: () => error('Could not update the player'),
    }),
    remove: useMutation({
      mutationFn: (id: string) => removePlayer(id),
      onSuccess: () => {
        invalidate()
        success('Player removed')
      },
      onError: () => error('Could not remove the player'),
    }),
    createMatchmaker: useMutation({
      mutationFn: (input: MatchmakerInput) => createMatchmaker(input),
      onSuccess: () => {
        invalidate()
        success('Matchmaker account created')
      },
      onError: () => error('Could not create the matchmaker account'),
    }),
  }
}
