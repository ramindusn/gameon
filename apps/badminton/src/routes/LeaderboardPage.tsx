import { Link } from 'react-router-dom'
import { Card } from '@gameon/ui'
import { Icon } from '../app/Icon'
import {
  useInactivePlayers,
  usePairBoard,
  usePlayerBoard,
  usePlayerNames,
  useRecentForm,
  useTournamentPairBoard,
} from '../ranking/useRanking'
import { BoardState, PairBoardList, PlayerBoardList } from '../ranking/Leaderboard'

// Public leaderboard (E05 / TASK-6.4) — full individual + doubles boards. Like
// the player profile it is public (no AppShell): the boards are RLS public-read,
// so logged-out visitors can browse the rankings.
export function LeaderboardPage() {
  const players = usePlayerBoard()
  const pairs = usePairBoard()
  const tournament = useTournamentPairBoard()
  const form = useRecentForm()
  const inactive = useInactivePlayers()
  const nameOf = usePlayerNames()

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg" data-testid="leaderboard">
      <header className="border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-lg font-bold text-accent-strong">
            BadmintonDuo
          </Link>
          <Link to="/" className="text-sm text-fg-muted hover:text-fg">
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold">Leaderboards</h1>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Individual Ranking" icon={<Icon name="ranking" />}>
            <BoardState
              isLoading={players.isLoading}
              isError={players.isError}
              count={players.data?.length ?? 0}
              noun="individual leaderboard"
            />
            {(players.data?.length ?? 0) > 0 && (
              <PlayerBoardList
                players={players.data!}
                nameOf={nameOf}
                form={form.data ?? {}}
                inactive={inactive.data}
              />
            )}
          </Card>

          <Card title="Doubles Ranking" icon={<Icon name="pairs" />}>
            <BoardState
              isLoading={pairs.isLoading}
              isError={pairs.isError}
              count={pairs.data?.length ?? 0}
              noun="doubles leaderboard"
            />
            {(pairs.data?.length ?? 0) > 0 && (
              <PairBoardList pairs={pairs.data!} nameOf={nameOf} />
            )}
          </Card>

          <Card title="Fixed Pairs (Tournament)" icon={<Icon name="tournament" />}>
            <BoardState
              isLoading={tournament.isLoading}
              isError={tournament.isError}
              count={tournament.data?.length ?? 0}
              noun="fixed pairs leaderboard"
            />
            {(tournament.data?.length ?? 0) > 0 && (
              <PairBoardList
                pairs={tournament.data!}
                nameOf={nameOf}
                testid="tournament-pair-board"
                rowPrefix="tournament-pair-row"
              />
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
