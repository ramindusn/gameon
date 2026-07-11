import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRoster } from '../roster/useRoster'
import {
  loadInactivePlayers,
  loadGameDayBoards,
  loadPairBoard,
  loadPlayerBoard,
  loadRecentForm,
  loadTournamentPairBoard,
} from './api'

// Leaderboard read hooks (E05 / TASK-6.4, ADR 0006: TanStack Query). The boards
// are public, so these work for logged-out visitors on the Home/leaderboard.

/** The individual board, strongest first. */
export function usePlayerBoard() {
  return useQuery({ queryKey: ['ratings', 'players'], queryFn: loadPlayerBoard })
}

/** The doubles (per-pair) board, strongest first. */
export function usePairBoard() {
  return useQuery({ queryKey: ['ratings', 'pairs'], queryFn: loadPairBoard })
}

/** Recent game-day form per player. */
export function useRecentForm() {
  return useQuery({ queryKey: ['ratings', 'form'], queryFn: loadRecentForm })
}

/** Player ids flagged inactive (absent from the latest game day), as a Set. */
export function useInactivePlayers() {
  return useQuery({
    queryKey: ['ratings', 'inactive'],
    queryFn: loadInactivePlayers,
    select: (ids) => new Set(ids),
  })
}

/** Every scored casual game day's standings, newest first (TASK-33 / TASK-37). */
export function useGameDayBoards() {
  return useQuery({ queryKey: ['ratings', 'game-days'], queryFn: loadGameDayBoards })
}

/** The isolated Fixed Pairs tournament board (Glicko-rated, like doubles) (E11). */
export function useTournamentPairBoard() {
  return useQuery({
    queryKey: ['ratings', 'tournament-pairs'],
    queryFn: loadTournamentPairBoard,
  })
}

/** Resolve a player id to their nickname via the (public) roster. */
export function usePlayerNames() {
  const { data: roster } = useRoster()
  return useMemo(() => {
    const byId = new Map((roster?.players ?? []).map((p) => [p.id, p.nickname]))
    return (id: string | null): string => (id ? (byId.get(id) ?? '—') : '—')
  }, [roster])
}
