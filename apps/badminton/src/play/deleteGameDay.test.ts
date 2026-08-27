// Deleting a game day that has results must not be a one-tap action, and every
// delete has to leave something behind to restore from (TASK-91).
//
// The guard itself lives in delete_game_day() in Postgres — these cover the
// client half: that the force flag is actually sent, and that the refusal is
// turned into a typed error carrying the scored-match count rather than a
// generic failure. Without the count the UI can only ask "are you sure?" a
// second time, which is the prompt that already failed to stop the accident.
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { rpc, invoke } = vi.hoisted(() => ({
  rpc: vi.fn(),
  invoke: vi.fn(),
}))

vi.mock('@gameon/supabase', () => ({
  supabase: { rpc, functions: { invoke } },
  isE2E: () => false,
}))

import { deleteSession, restoreSession, ScoredGameDayError } from './api'

beforeEach(() => {
  rpc.mockReset()
  invoke.mockClear()
})

describe('deleteSession', () => {
  it('does not force by default', async () => {
    rpc.mockResolvedValue({ data: 0, error: null })
    await deleteSession('s1', false)
    expect(rpc).toHaveBeenCalledWith('delete_game_day', {
      p_session_id: 's1',
      p_force: false,
    })
  })

  it('forces only when asked', async () => {
    rpc.mockResolvedValue({ data: 0, error: null })
    await deleteSession('s1', false, true)
    expect(rpc).toHaveBeenCalledWith('delete_game_day', {
      p_session_id: 's1',
      p_force: true,
    })
  })

  it('turns the guard refusal into a typed error carrying the count', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        code: 'PT409',
        message: 'This game day has 13 scored match(es). Deleting it will remove them.',
        details: '13',
        hint: null,
      },
    })
    await expect(deleteSession('s1', false)).rejects.toBeInstanceOf(ScoredGameDayError)
    await expect(deleteSession('s1', false)).rejects.toMatchObject({ scoredMatches: 13 })
  })

  it('leaves a real failure alone rather than dressing it as the guard', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied', details: null, hint: null },
    })
    await expect(deleteSession('s1', false)).rejects.not.toBeInstanceOf(
      ScoredGameDayError,
    )
  })

  it('replays ratings only when the day had already counted towards them', async () => {
    rpc.mockResolvedValue({ data: 0, error: null })
    await deleteSession('s1', false)
    expect(invoke).not.toHaveBeenCalled()
    await deleteSession('s1', true)
    expect(invoke).toHaveBeenCalledWith('recompute-ratings')
  })

  it('does not replay ratings when the delete was refused', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'PT409', message: 'has scored matches', details: '2', hint: null },
    })
    await expect(deleteSession('s1', true)).rejects.toBeInstanceOf(ScoredGameDayError)
    expect(invoke).not.toHaveBeenCalled()
  })
})

describe('restoreSession', () => {
  it('returns how many matches came back', async () => {
    rpc.mockResolvedValue({ data: 18, error: null })
    await expect(restoreSession('s1')).resolves.toBe(18)
    expect(rpc).toHaveBeenCalledWith('restore_game_day', { p_session_id: 's1' })
  })

  it('throws when the archive has no such day', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        code: 'PT404',
        message: 'No archived game day',
        details: null,
        hint: null,
      },
    })
    await expect(restoreSession('s1')).rejects.toMatchObject({ code: 'PT404' })
  })
})
