import { Link } from 'react-router-dom'
import { useMemo, useState, type ReactNode } from 'react'
import { Card, cx } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { Icon, type IconName } from '../app/Icon'
import {
  useGameDayBoards,
  useInactivePlayers,
  usePairBoard,
  usePlayerBoard,
  usePlayerNames,
} from '../ranking/useRanking'
import { BoardState } from '../ranking/Leaderboard'
import { PROVISIONAL_RD } from '../ranking/api'
import {
  POINTS_DOT,
  POINTS_FRAME,
  POINTS_FRAME_HOVER,
  POINTS_HILITE,
  POINTS_PILL,
  POINTS_RING,
  POINTS_TEXT,
  RANK_TEXT,
} from '../ranking/metricColors'
import { useSessions } from '../play/useMatchPlay'
import { formatPlayedAt } from '../play/datetime'

// Public home (TASK-9.1 / 9.2 / 9.5). Hero, then the latest game day's
// standings and the rankings. The
// Scheduled Matches / Recent Results feeds were removed to keep the public home
// focused (too much detail); the layout follows the GameOn mockup (TASK-9.5).
export function Home() {
  // The header, search, login buttons and footer come from AppShell now, so
  // every page carries the same navigation — this page is just its content.
  return (
    <AppShell>
      <div data-testid="home">
        <Hero />
        <LiveNow />
        <GameDayRank />
        <RankingPreview />
      </div>
    </AppShell>
  )
}

// ---- shared bits ----------------------------------------------------------

const PREVIEW_LIMIT = 5

/** A player name that links to their public profile (plain text when unknown). */
function PlayerLink({ id, nameOf }: { id: string | null; nameOf: NameOf }) {
  const name = nameOf(id)
  if (!id) return <span>{name}</span>
  return (
    <Link to={`/players/${id}`} className="hover:text-accent-strong hover:underline">
      {name}
    </Link>
  )
}

/**
 * "Name A & Name B", linking to the partnership rather than to two people.
 *
 * On a Doubles ranking the row is the pair, so that is what tapping it should
 * open (TASK-90) — the names used to go to the two individual profiles, which
 * left the pair page unreachable from the home page entirely. Both players are
 * linked at the top of the pair page, so nothing is lost, only reordered.
 */
function PairNames({ ids, nameOf }: { ids: [string | null, string | null]; nameOf: NameOf }) {
  // Always stack the two players on separate lines so every card is the same
  // height regardless of name length (consistent rows, no ragged wrapping).
  const names = (
    <>
      <span className="block">{nameOf(ids[0])}</span>
      <span className="block">{nameOf(ids[1])}</span>
    </>
  )
  if (!ids[0] || !ids[1]) return names
  return (
    <Link
      to={`/pairs/${ids[0]}/${ids[1]}`}
      className="group inline-flex items-center gap-1.5 rounded text-fg transition-colors hover:text-accent-strong focus:outline-none focus:ring-1 focus:ring-accent"
      data-testid={`home-pair-${ids[0]}-${ids[1]}`}
    >
      <span>{names}</span>
      <span aria-hidden className="text-fg-subtle transition-colors group-hover:text-accent-strong">
        ›
      </span>
    </Link>
  )
}

type NameOf = (id: string | null) => string

const fmtRating = (n: number) => Math.round(n).toLocaleString('en-US')

// ---- Live now (public access to the live game day) ------------------------

/**
 * When a casual game day is in progress, surface it so players (logged out) can
 * open the live schedule / points / scores at /game-days/:id — otherwise that is
 * only reachable by direct link. Hidden game days are excluded, matching the
 * rest of the public home.
 */
function LiveNow() {
  const { data } = useSessions()
  const live = (data ?? []).filter(
    (s) => s.status === 'live' && s.kind === 'casual' && !s.hidden,
  )
  if (live.length === 0) return null
  return (
    <Section title="Live now" icon="live">
      <div className="space-y-3">
        {live.map((s) => (
          <Link
            key={s.id}
            to={`/game-days/${s.id}`}
            data-testid={`live-now-${s.id}`}
            className={cx(
              'flex items-center justify-between gap-3 rounded-2xl border p-5 shadow-sm transition-colors focus:outline-none focus:ring-2 sm:p-6',
              POINTS_FRAME,
              POINTS_FRAME_HOVER,
              POINTS_RING,
            )}
          >
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2">
                <span
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                    POINTS_PILL,
                  )}
                >
                  <span className={cx('h-1.5 w-1.5 rounded-full', POINTS_DOT)} />
                  Live
                </span>
                <span className="truncate font-display text-lg font-semibold text-fg">
                  {formatPlayedAt(s.playedAt)}
                </span>
              </span>
              <span className="mt-1 text-sm text-fg-muted">
                {s.mode === 'mixed' ? 'Mixed doubles' : 'Doubles'} · {s.rounds} rounds — see
                the schedule, points &amp; live scores
              </span>
            </span>
            <span className={cx('shrink-0 text-sm font-medium', POINTS_TEXT)}>View →</span>
          </Link>
        ))}
      </div>
    </Section>
  )
}

// ---- Game Day Podium ------------------------------------------------------

/** "+38" / "-12" / "0" — a signed net point differential. */
const fmtDiff = (n: number) => (n > 0 ? `+${n}` : String(n))

interface StandingRow {
  playerId: string
  name: string
  diff: number
}

/** One podium column: player + diff above a medal pedestal (1st is tallest). */
function PodiumSpot({ row, place }: { row: StandingRow; place: 1 | 2 | 3 }) {
  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉'
  const height = place === 1 ? 'h-20 sm:h-24' : place === 2 ? 'h-14 sm:h-16' : 'h-11 sm:h-12'
  return (
    <div
      className="flex w-full max-w-[9rem] flex-1 flex-col items-center"
      data-testid={`podium-${place}`}
    >
      <span className="mb-0.5 break-words text-center text-sm font-semibold leading-tight text-fg">
        {row.name}
      </span>
      <span className={cx('mb-2 font-display text-sm font-bold tabular-nums', POINTS_TEXT)}>
        {fmtDiff(row.diff)}
      </span>
      <div
        className={cx(
          'flex w-full items-start justify-center rounded-t-xl border pt-1.5',
          height,
          place === 1 ? POINTS_HILITE : 'border-line bg-surface-muted',
        )}
      >
        <span aria-hidden className="text-xl leading-none">
          {medal}
        </span>
        <span className="sr-only">Rank {place}</span>
      </div>
    </div>
  )
}

/** Top-3 podium (2nd · 1st · 3rd), gracefully handling fewer than three. */
function Podium({ rows }: { rows: StandingRow[] }) {
  const top = rows.slice(0, 3)
  // Left-to-right the podium reads 2nd, 1st, 3rd so the winner sits centre.
  const slots: { row?: StandingRow; place: 1 | 2 | 3 }[] = [
    { row: top[1], place: 2 },
    { row: top[0], place: 1 },
    { row: top[2], place: 3 },
  ]
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5">
      {slots.map((s, i) =>
        s.row ? (
          <PodiumSpot key={s.row.playerId} row={s.row} place={s.place} />
        ) : (
          <div key={`empty-${i}`} className="w-full max-w-[9rem] flex-1" />
        ),
      )}
    </div>
  )
}

/** A compact date label for the pager (no time): "Today" / "8 Jul". */
function shortDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(d) - startOf(new Date())) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === -1) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** One ‹ / › segment inside the pager pill. */
function PagerArrow({
  dir,
  disabled,
  onClick,
  testid,
}: {
  dir: 'prev' | 'next'
  disabled: boolean
  onClick: () => void
  testid: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      aria-label={dir === 'next' ? 'Older game day' : 'Newer game day'}
      className={cx(
        'grid h-7 w-7 place-items-center rounded-full text-lg font-bold leading-none transition-colors hover:bg-sky-400/20 disabled:text-fg-subtle disabled:opacity-40 disabled:hover:bg-transparent',
        POINTS_TEXT,
      )}
    >
      {dir === 'next' ? '›' : '‹'}
    </button>
  )
}

/** The date pager: ‹ 8 Jul › as one cohesive control. */
function GameDayPager({
  label,
  canNewer,
  canOlder,
  onNewer,
  onOlder,
}: {
  label: string
  canNewer: boolean
  canOlder: boolean
  onNewer: () => void
  onOlder: () => void
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface-muted p-1">
      <PagerArrow dir="prev" disabled={!canNewer} onClick={onNewer} testid="game-day-newer" />
      <span
        className="min-w-[3.5rem] whitespace-nowrap px-1 text-center text-xs font-semibold tabular-nums text-fg"
        data-testid="game-day-date"
      >
        {label}
      </span>
      <PagerArrow dir="next" disabled={!canOlder} onClick={onOlder} testid="game-day-older" />
    </div>
  )
}

/**
 * Game Day Podium (TASK-33 / TASK-37): the standings for one casual game day,
 * ranked by net point differential. The latest day shows first; the ›/‹ arrows
 * page back through older days and forward toward the latest. The card links to
 * that game day's detail page (rank + full score history). Hidden until the
 * first game day has been scored.
 */
function GameDayRank() {
  const { data, isLoading } = useGameDayBoards()
  const nameOf = usePlayerNames()
  const [index, setIndex] = useState(0)

  const boards = data ?? []
  const board = boards[index]
  const rows = useMemo(() => {
    return (board?.standings ?? [])
      .map((s) => ({ ...s, name: nameOf(s.playerId) }))
      .sort((a, b) => b.diff - a.diff || a.name.localeCompare(b.name))
  }, [board, nameOf])

  if (isLoading || boards.length === 0 || !board) return null

  const canNewer = index > 0 // ‹ toward the latest
  const canOlder = index < boards.length - 1 // › back in time

  return (
    <Section
      title="Game Day Podium"
      icon="trophy"
      action={
        <GameDayPager
          label={shortDay(board.playedAt)}
          canNewer={canNewer}
          canOlder={canOlder}
          onNewer={() => setIndex((i) => Math.max(0, i - 1))}
          onOlder={() => setIndex((i) => Math.min(boards.length - 1, i + 1))}
        />
      }
    >
      <Link
        to={`/game-days/${board.sessionId}`}
        className={cx(
          'block rounded-2xl border p-5 shadow-sm transition-colors focus:outline-none focus:ring-2 sm:p-6',
          POINTS_FRAME,
          POINTS_FRAME_HOVER,
          POINTS_RING,
        )}
        data-testid="game-day-card"
      >
        <div data-testid="game-day-board">
          <Podium rows={rows} />
          {rows.length > 3 && (
            <ul className="mt-5 divide-y divide-line/70 border-t border-line/70">
              {rows.slice(3).map((r, i) => (
                <li
                  key={r.playerId}
                  data-testid={`game-day-row-${r.playerId}`}
                  className="flex items-center gap-3 py-2 text-sm"
                >
                  <span className="w-6 shrink-0 text-center text-xs font-medium text-fg-subtle">
                    {i + 4}
                  </span>
                  <span className="flex-1 font-medium text-fg">{r.name}</span>
                  <span className={cx('font-display font-bold tabular-nums', POINTS_TEXT)}>
                    {fmtDiff(r.diff)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cx('mt-4 text-right text-sm font-medium', POINTS_TEXT)}>
          View game day scores →
        </div>
      </Link>
    </Section>
  )
}

// ---- Rankings -------------------------------------------------------------

function RankingPreview() {
  const players = usePlayerBoard()
  const pairs = usePairBoard()
  const inactive = useInactivePlayers()
  const nameOf = usePlayerNames()

  // The home preview shows only established leaders (low RD) — provisional
  // entries with few games live in the full leaderboard's "Needs more games"
  // section, not the headline top 5 (TASK-40). Inactive players are likewise
  // excluded, matching the full leaderboard's "Inactive" section (TASK-58).
  const topPlayers = (players.data ?? []).filter(
    (p) => p.rd < PROVISIONAL_RD && !inactive.data?.has(p.playerId),
  )
  const topPairs = (pairs.data ?? []).filter((p) => p.rd < PROVISIONAL_RD)

  return (
    <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Individual Ranking" icon={<Icon name="ranking" />} action={<ViewAll />}>
        <BoardState
          isLoading={players.isLoading}
          isError={players.isError}
          count={topPlayers.length}
          noun="individual leaderboard"
        />
        {topPlayers.length > 0 && (
          <RankTable
            head="Player Name"
            testid="individual-ranking"
            rows={topPlayers.slice(0, PREVIEW_LIMIT).map((p, i) => ({
              key: p.playerId,
              rank: i + 1,
              rating: p.rating,
              name: <PlayerLink id={p.playerId} nameOf={nameOf} />,
            }))}
          />
        )}
      </Card>
      <Card title="Doubles Ranking" icon={<Icon name="pairs" />} action={<ViewAll />}>
        <BoardState
          isLoading={pairs.isLoading}
          isError={pairs.isError}
          count={topPairs.length}
          noun="doubles leaderboard"
        />
        {topPairs.length > 0 && (
          <RankTable
            head="Pair Names"
            testid="doubles-ranking"
            rows={topPairs.slice(0, PREVIEW_LIMIT).map((p, i) => ({
              key: `${p.player1Id}|${p.player2Id}`,
              rank: i + 1,
              rating: p.rating,
              name: <PairNames ids={[p.player1Id, p.player2Id]} nameOf={nameOf} />,
            }))}
          />
        )}
      </Card>
    </div>
  )
}

function RankBadge({ n }: { n: number }) {
  return (
    <span
      className={cx(
        'grid h-7 w-7 place-items-center rounded-full font-display text-sm',
        n === 1
          ? 'bg-accent/15 font-bold text-accent-strong'
          : 'font-medium text-fg-subtle',
      )}
    >
      {n}
    </span>
  )
}

function RankTable({
  head,
  testid,
  rows,
}: {
  head: string
  testid: string
  rows: { key: string; rank: number; rating: number; name: ReactNode }[]
}) {
  return (
    <table className="w-full text-sm" data-testid={testid}>
      <thead>
        <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
          <th className="w-14 py-2 font-medium">Rank</th>
          <th className="py-2 font-medium">{head}</th>
          <th className={cx('py-2 text-right font-medium', RANK_TEXT)}>Rating</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((r) => (
          <tr key={r.key}>
            <td className="py-3">
              <RankBadge n={r.rank} />
            </td>
            <td className="py-3 font-medium text-fg">{r.name}</td>
            <td className={cx('py-3 text-right font-display font-bold tabular-nums', RANK_TEXT)}>
              {fmtRating(r.rating)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ViewAll() {
  return (
    <Link
      to="/leaderboard"
      className="text-sm font-medium text-accent-strong hover:underline"
      data-testid="view-all-leaderboard"
    >
      View all
    </Link>
  )
}

function Hero() {
  return (
    <section className="py-16 text-center sm:py-24">
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
        Elevate Your <span className="text-accent-strong">Game</span>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-fg-muted sm:text-lg">
        The ultimate arena for badminton enthusiasts. Track scores, climb leaderboards,
        and find your next championship match.
      </p>
    </section>
  )
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string
  icon: IconName
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between gap-3">
        {/* Both sections on the public home are game-day content (Live now +
            Game Day Podium), so the section icon uses the game-day blue. */}
        <h2 className="flex min-w-0 items-center gap-2 font-display text-xl font-bold">
          <Icon name={icon} className={POINTS_TEXT} />
          <span className="truncate">{title}</span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
