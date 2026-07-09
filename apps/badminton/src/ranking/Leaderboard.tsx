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

type NameOf = (id: string | null) => string

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

function Rank({ n }: { n: number }) {
  return (
    <span className="w-6 shrink-0 text-right font-display text-sm font-bold text-fg-subtle tabular-nums">
      {n}
    </span>
  )
}

function Rating({ rating, rd }: { rating: number; rd: number }) {
  // Fixed-width, right-aligned column: the rating number always sits on the
  // same right edge across rows, and the PROV badge hangs to its left in the
  // reserved space — so present/absent badges never shift the column.
  return (
    <span className="flex w-[5.5rem] shrink-0 items-center justify-end gap-1.5">
      {rd > PROVISIONAL_RD && (
        <span
          className="rounded bg-warning/15 px-1 py-0.5 text-[10px] font-medium leading-none text-warning"
          title="Provisional — few games played"
        >
          PROV
        </span>
      )}
      <span className="font-display text-sm font-bold tabular-nums text-fg">
        {Math.round(rating)}
      </span>
    </span>
  )
}

/** Individual board: rank, name, rating (+provisional), recent form. */
export function PlayerBoardList({
  players,
  nameOf,
  form,
  inactive,
  limit,
}: {
  players: RatedPlayer[]
  nameOf: NameOf
  form: FormMap
  inactive?: Set<string>
  limit?: number
}) {
  const rows = limit ? players.slice(0, limit) : players
  return (
    <ul className="divide-y divide-line" data-testid="player-board">
      {rows.map((p, i) => (
        <li
          key={p.playerId}
          className="flex items-center gap-3 py-2.5"
          data-testid={`player-row-${p.playerId}`}
        >
          <Rank n={i + 1} />
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-sm font-medium text-fg">
              {nameOf(p.playerId)}
            </span>
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
          <Rating rating={p.rating} rd={p.rd} />
        </li>
      ))}
    </ul>
  )
}

/** Doubles board: rank, the partnership's two names, rating (+provisional). */
export function PairBoardList({
  pairs,
  nameOf,
  limit,
  testid = 'pair-board',
  rowPrefix = 'pair-row',
}: {
  pairs: RatedPair[]
  nameOf: NameOf
  limit?: number
  /** Board-level testid; distinct per board so the same pair can appear twice. */
  testid?: string
  /** Row testid prefix; pairs with `testid` to keep each board's rows unique. */
  rowPrefix?: string
}) {
  const rows = limit ? pairs.slice(0, limit) : pairs
  return (
    <ul className="divide-y divide-line" data-testid={testid}>
      {rows.map((p, i) => (
        <li
          key={`${p.player1Id}|${p.player2Id}`}
          className="flex items-center gap-3 py-2.5"
          data-testid={`${rowPrefix}-${p.player1Id}-${p.player2Id}`}
        >
          <Rank n={i + 1} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
            {nameOf(p.player1Id)} <span className="text-fg-subtle">&amp;</span>{' '}
            {nameOf(p.player2Id)}
          </span>
          <Rating rating={p.rating} rd={p.rd} />
        </li>
      ))}
    </ul>
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
