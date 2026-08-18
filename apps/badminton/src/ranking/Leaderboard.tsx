import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx, Skeleton } from '@gameon/ui'
import {
  PROVISIONAL_RD,
  type FormMap,
  type FormResult,
  type RatedPair,
  type RatedPlayer,
} from './api'
import { RANK_TEXT } from './metricColors'

// Leaderboard presentational components (E05 / TASK-6.4). Pure rendering — the
// caller supplies the boards, a player-id -> name resolver, and the form map.
//
// A rating with a high RD is still settling (few games played), so those entries
// are split off the main board into a collapsible "Needs more games" section
// (TASK-40) instead of bloating the ranking with one-off partnerships.

type NameOf = (id: string | null) => string

/** Established = enough games for a confident rating (low RD). */
const isEstablished = (rd: number) => rd < PROVISIONAL_RD

/**
 * A player name that links to their public profile. A persistent dotted
 * underline signals it's tappable (works on mobile, no hover needed); it turns
 * accent-green on hover/focus.
 */
function ProfileLink({ id, nameOf }: { id: string; nameOf: NameOf }) {
  return (
    <Link
      to={`/players/${id}`}
      className="rounded text-fg underline decoration-fg-subtle/50 decoration-dotted underline-offset-4 transition-colors hover:text-accent-strong hover:decoration-accent focus:text-accent-strong focus:outline-none focus:ring-1 focus:ring-accent"
    >
      {nameOf(id)}
    </Link>
  )
}

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

/** One W/L/D pill, drawn the same as the ones in the boards above. */
function FormPill({ r }: { r: FormResult }) {
  return (
    <span
      className={cx(
        'grid h-5 w-5 place-items-center rounded text-[10px] font-bold',
        r === 'W' && 'bg-accent/15 text-accent-strong',
        r === 'L' && 'bg-negative/15 text-negative',
        r === 'D' && 'bg-surface-muted text-fg-muted',
      )}
    >
      {r}
    </span>
  )
}

/**
 * Explains the ranking page's markers.
 *
 * Collapsed to a single line by default. It used to be a permanent block of
 * prose that took a quarter of a phone screen before any ranking appeared —
 * and the marks it explains sit right there in the table, so most visits do not
 * need the words at all. Expanded, the terms line up in a fixed column instead
 * of the description wrapping under its own label.
 */
export function LeaderboardLegend() {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="mb-4 rounded-xl border border-line bg-surface px-3 py-2 text-xs"
      data-testid="leaderboard-legend"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="leaderboard-legend-toggle"
        className="flex w-full items-center gap-2 text-left text-fg-muted transition-colors hover:text-fg"
      >
        <span className="flex shrink-0 items-center gap-1">
          <FormPill r="W" />
          <FormPill r="L" />
          <FormPill r="D" />
        </span>
        <span className="min-w-0 flex-1 truncate">Recent form, newest first</span>
        <span aria-hidden className="shrink-0 text-fg-subtle">
          {open ? '\u25be' : '\u25b8'}
        </span>
      </button>

      {open && (
        <div
          className="mt-2.5 space-y-2 border-t border-line pt-2.5"
          data-testid="leaderboard-legend-detail"
        >
          {/* The three marks read as one line — they are the same alphabet, and
              a shared term column would strand them far from their meanings
              because "Needs more games" is so much wider. */}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <FormPill r="W" /> Won the day
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FormPill r="L" /> Lost the day
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FormPill r="D" /> Even
            </span>
          </p>
          <dl className="space-y-1 text-fg-muted">
            <div>
              <dt className="inline font-medium text-fg-subtle">Inactive</dt>{' '}
              <dd className="inline">
                no games in 5+ game days, so out of the ranking while the rating decays
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-fg-subtle">Needs more games</dt>{' '}
              <dd className="inline">rating still settling in</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
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
    <span
      className={cx(
        'w-[3.25rem] shrink-0 text-right font-display text-sm font-bold tabular-nums',
        RANK_TEXT,
      )}
    >
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
  muted,
}: {
  p: RatedPlayer
  rank: number | null
  nameOf: NameOf
  form: FormMap
  muted?: boolean
}) {
  return (
    <li
      className={cx('flex items-center gap-3 py-2.5', muted && 'opacity-70')}
      data-testid={`player-row-${p.playerId}`}
    >
      <Rank n={rank} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        <ProfileLink id={p.playerId} nameOf={nameOf} />
      </span>
      <FormStrip results={form[p.playerId]} />
      <Rating rating={p.rating} />
    </li>
  )
}

/**
 * A collapsible "Inactive" group for players who missed the last
 * ABSENCE_GRACE_PERIOD game days — pulled out of the ranking entirely (not
 * just tagged) while their rating decays (TASK-58).
 */
function InactiveGroup({
  count,
  defaultOpen,
  children,
}: {
  count: number
  defaultOpen: boolean
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
        data-testid="player-board-inactive-toggle"
        className="flex w-full items-center gap-1.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <span className="text-fg-subtle">{open ? '▾' : '▸'}</span>
        Inactive ({count})
      </button>
      {open && (
        <ul className="divide-y divide-line/60" data-testid="player-board-inactive">
          {children}
        </ul>
      )}
    </div>
  )
}

/**
 * Individual board: established players ranked, provisional ones collapsed
 * under "Needs more games", inactive ones (missed the last 5 game days) pulled
 * out entirely into their own "Inactive" section (TASK-58). A player who is
 * both provisional and inactive counts only as inactive.
 */
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
  const isInactive = (p: RatedPlayer) => inactive?.has(p.playerId) ?? false
  const ranked = players.filter((p) => !isInactive(p))
  const inactivePlayers = players.filter(isInactive)
  const established = ranked.filter((p) => isEstablished(p.rd))
  const provisional = ranked.filter((p) => !isEstablished(p.rd))
  return (
    <div>
      <ul className="divide-y divide-line" data-testid="player-board">
        {established.map((p, i) => (
          <PlayerRow key={p.playerId} p={p} rank={i + 1} nameOf={nameOf} form={form} />
        ))}
      </ul>
      <NeedsMoreGames
        count={provisional.length}
        testid="player-board-prov"
        defaultOpen={established.length === 0}
      >
        {provisional.map((p) => (
          <PlayerRow key={p.playerId} p={p} rank={null} nameOf={nameOf} form={form} muted />
        ))}
      </NeedsMoreGames>
      <InactiveGroup
        count={inactivePlayers.length}
        defaultOpen={established.length === 0 && provisional.length === 0}
      >
        {inactivePlayers.map((p) => (
          <PlayerRow key={p.playerId} p={p} rank={null} nameOf={nameOf} form={form} muted />
        ))}
      </InactiveGroup>
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
  // The whole row is the link, not a small arrow at the end of it. On a board
  // that ranks partnerships the row IS the pair, and a bare arrow was easy to
  // miss — people did not know the page was there. The trade: the two names no
  // longer link to their own profiles from here, because a link inside a link
  // is invalid. Individual profiles are one tap away on the Individual board,
  // and the pair page links both players at the top.
  return (
    <li data-testid={`${rowPrefix}-${p.player1Id}-${p.player2Id}`}>
      <Link
        to={`/pairs/${p.player1Id}/${p.player2Id}`}
        className={cx(
          'group flex items-center gap-3 rounded-lg py-2.5 transition-colors hover:bg-accent/10 focus:outline-none focus:ring-1 focus:ring-accent',
          muted && 'opacity-70',
        )}
        data-testid={`pair-link-${p.player1Id}-${p.player2Id}`}
      >
        <Rank n={rank} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
          {nameOf(p.player1Id)} <span className="text-fg-subtle">&amp;</span>{' '}
          {nameOf(p.player2Id)}
        </span>
        <Rating rating={p.rating} />
        <span
          aria-hidden
          className="shrink-0 text-fg-subtle transition-colors group-hover:text-accent-strong"
        >
          ›
        </span>
      </Link>
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
