import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRoster } from '../roster/useRoster'
import {
  loadInactivePlayers,
  loadGameDayBoards,
  loadGameDayRatingDeltas,
  loadMatchRatingDeltas,
  loadPairBoard,
  loadPlayerAttendance,
  loadPlayerBoard,
  loadRatingHistory,
  loadRecentForm,
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

/** Per-player recent attendance for the game-day setup picker (TASK-64). */
export function usePlayerAttendance() {
  return useQuery({ queryKey: ['ratings', 'attendance'], queryFn: loadPlayerAttendance })
}

/** Every scored casual game day's standings, newest first (TASK-33 / TASK-37). */
export function useGameDayBoards() {
  return useQuery({ queryKey: ['ratings', 'game-days'], queryFn: loadGameDayBoards })
}

/** Ranking points each player gained/lost on one game day (TASK-46). */
export function useGameDayRatingDeltas(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['ratings', 'game-day-deltas', sessionId],
    queryFn: () => loadGameDayRatingDeltas(sessionId as string),
    enabled: !!sessionId,
  })
}

/** What each scored match of a game day was worth, per player (TASK-87). */
export function useMatchRatingDeltas(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['ratings', 'match-deltas', sessionId],
    queryFn: () => loadMatchRatingDeltas(sessionId as string),
    enabled: !!sessionId,
  })
}

/** One player's rating-over-game-days trend + rank context (TASK-55). */
export function useRatingHistory(playerId: string | undefined) {
  return useQuery({
    queryKey: ['ratings', 'history', playerId],
    queryFn: () => loadRatingHistory(playerId as string),
    enabled: !!playerId,
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
