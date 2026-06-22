import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRoster } from '../roster/useRoster'
import { loadPairBoard, loadPlayerBoard, loadRecentForm } from './api'

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

/** Resolve a player id to their nickname via the (public) roster. */
export function usePlayerNames() {
  const { data: roster } = useRoster()
  return useMemo(() => {
    const byId = new Map((roster?.players ?? []).map((p) => [p.id, p.nickname]))
    return (id: string | null): string => (id ? (byId.get(id) ?? '—') : '—')
  }, [roster])
}
