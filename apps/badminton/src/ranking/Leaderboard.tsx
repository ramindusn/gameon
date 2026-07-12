import { useState, type ReactNode } from 'react'
import { cx, Skeleton } from '@gameon/ui'
import {
  PROVISIONAL_RD,
  type FormMap,
  type FormResult,
  type RatedPair,
  type RatedPlayer,
} from './api'

// Leaderboard presentational components (E05 / TASK-6.4). Pure rendering — the
// caller supplies the boards, a player-id -> name resolver, and the form map.
//
// A rating with a high RD is still settling (few games played), so those entries
// are split off the main board into a collapsible "Needs more games" section
// (TASK-40) instead of bloating the ranking with one-off partnerships.

type NameOf = (id: string | null) => string

/** Established = enough games for a confident rating (low RD). */
const isEstablished = (rd: number) => rd < PROVISIONAL_RD

/** Recent game-day form as compact W/L/D pills, newest first. */
export function FormStrip({ results }: { results?: FormResult[] }) {
  if (!results || results.length === 0) {
    return <span className="text-xs text-fg-subtle">—</span>
  }
  return (
    <span className="flex gap-1" data-testid="form-strip">
      {results.map((r, i) => (
        <span
          key={i}
          title={r === 'W' ? 'Win' : r === 'L' ? 'Loss' : 'Even'}
          className={cx(
            'grid h-5 w-5 place-items-center rounded text-[10px] font-bold',
            r === 'W' && 'bg-accent/15 text-accent-strong',
            r === 'L' && 'bg-negative/15 text-negative',
            r === 'D' && 'bg-surface-muted text-fg-muted',
          )}
        >
          {r}
        </span>
      ))}
    </span>
  )
}

function Rank({ n }: { n: number | null }) {
  return (
    <span className="w-6 shrink-0 text-right font-display text-sm font-bold text-fg-subtle tabular-nums">
      {n ?? '·'}
    </span>
  )
}

function Rating({ rating }: { rating: number }) {
  return (
    <span className="w-[3.25rem] shrink-0 text-right font-display text-sm font-bold tabular-nums text-fg">
      {Math.round(rating)}
    </span>
  )
}

/**
 * A collapsible "Needs more games" group holding the provisional (high-RD)
 * entries, hidden by default so the main board stays uncluttered.
 */
function NeedsMoreGames({
  count,
  testid,
  defaultOpen = false,
  children,
}: {
  count: number
  testid: string
  /** Open by default when there are no established rows to show above it. */
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (count === 0) return null
  return (
    <div className="mt-3 border-t border-line pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid={`${testid}-toggle`}
        className="flex w-full items-center gap-1.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <span className="text-fg-subtle">{open ? '▾' : '▸'}</span>
        Needs more games ({count})
      </button>
      {open && (
        <ul className="divide-y divide-line/60" data-testid={testid}>
          {children}
        </ul>
      )}
    </div>
  )
}

function PlayerRow({
  p,
  rank,
  nameOf,
  form,
  inactive,
  muted,
}: {
  p: RatedPlayer
  rank: number | null
  nameOf: NameOf
  form: FormMap
  inactive?: Set<string>
  muted?: boolean
}) {
  return (
    <li
      className={cx('flex items-center gap-3 py-2.5', muted && 'opacity-70')}
      data-testid={`player-row-${p.playerId}`}
    >
      <Rank n={rank} />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium text-fg">{nameOf(p.playerId)}</span>
        {inactive?.has(p.playerId) && (
          <span
            className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-fg-muted"
            title="Missed the last game day — rating is decaying"
            data-testid="inactive-tag"
          >
            inactive
          </span>
        )}
      </span>
      <FormStrip results={form[p.playerId]} />
      <Rating rating={p.rating} />
    </li>
  )
}

/** Individual board: established players ranked, provisional ones collapsed. */
export function PlayerBoardList({
  players,
  nameOf,
  form,
  inactive,
}: {
  players: RatedPlayer[]
  nameOf: NameOf
  form: FormMap
  inactive?: Set<string>
}) {
  const established = players.filter((p) => isEstablished(p.rd))
  const provisional = players.filter((p) => !isEstablished(p.rd))
  return (
    <div>
      <ul className="divide-y divide-line" data-testid="player-board">
        {established.map((p, i) => (
          <PlayerRow
            key={p.playerId}
            p={p}
            rank={i + 1}
            nameOf={nameOf}
            form={form}
            inactive={inactive}
          />
        ))}
      </ul>
      <NeedsMoreGames
        count={provisional.length}
        testid="player-board-prov"
        defaultOpen={established.length === 0}
      >
        {provisional.map((p) => (
          <PlayerRow
            key={p.playerId}
            p={p}
            rank={null}
            nameOf={nameOf}
            form={form}
            inactive={inactive}
            muted
          />
        ))}
      </NeedsMoreGames>
    </div>
  )
}

function PairRow({
  p,
  rank,
  nameOf,
  rowPrefix,
  muted,
}: {
  p: RatedPair
  rank: number | null
  nameOf: NameOf
  rowPrefix: string
  muted?: boolean
}) {
  return (
    <li
      className={cx('flex items-center gap-3 py-2.5', muted && 'opacity-70')}
      data-testid={`${rowPrefix}-${p.player1Id}-${p.player2Id}`}
    >
      <Rank n={rank} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
        {nameOf(p.player1Id)} <span className="text-fg-subtle">&amp;</span>{' '}
        {nameOf(p.player2Id)}
      </span>
      <Rating rating={p.rating} />
    </li>
  )
}

/** Doubles board: established partnerships ranked, provisional ones collapsed. */
export function PairBoardList({
  pairs,
  nameOf,
  testid = 'pair-board',
  rowPrefix = 'pair-row',
}: {
  pairs: RatedPair[]
  nameOf: NameOf
  /** Board-level testid; distinct per board so the same pair can appear twice. */
  testid?: string
  /** Row testid prefix; pairs with `testid` to keep each board's rows unique. */
  rowPrefix?: string
}) {
  const established = pairs.filter((p) => isEstablished(p.rd))
  const provisional = pairs.filter((p) => !isEstablished(p.rd))
  return (
    <div>
      <ul className="divide-y divide-line" data-testid={testid}>
        {established.map((p, i) => (
          <PairRow
            key={`${p.player1Id}|${p.player2Id}`}
            p={p}
            rank={i + 1}
            nameOf={nameOf}
            rowPrefix={rowPrefix}
          />
        ))}
      </ul>
      <NeedsMoreGames
        count={provisional.length}
        testid={`${testid}-prov`}
        defaultOpen={established.length === 0}
      >
        {provisional.map((p) => (
          <PairRow
            key={`${p.player1Id}|${p.player2Id}`}
            p={p}
            rank={null}
            nameOf={nameOf}
            rowPrefix={rowPrefix}
            muted
          />
        ))}
      </NeedsMoreGames>
    </div>
  )
}

/** Shared empty/loading/error copy so Home + the page read the same. */
export function BoardState({
  isLoading,
  isError,
  count,
  noun,
}: {
  isLoading: boolean
  isError: boolean
  count: number
  noun: string
}) {
  if (isLoading)
    return (
      <div className="space-y-2" role="status" aria-busy="true" aria-label={`Loading ${noun}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    )
  if (isError)
    return <p className="text-sm text-negative">Could not load the {noun}.</p>
  if (count === 0)
    return (
      <p className="text-sm text-fg-muted">
        The {noun} appears once game days are played.
      </p>
    )
  return null
}
