import { Card } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { Icon } from '../app/Icon'
import {
  useInactivePlayers,
  usePairBoard,
  usePlayerBoard,
  usePlayerNames,
  useRecentForm,
} from '../ranking/useRanking'
import {
  BoardState,
  LeaderboardLegend,
  PairBoardList,
  PlayerBoardList,
} from '../ranking/Leaderboard'

// Public leaderboard (E05 / TASK-6.4) — full individual + doubles boards. The
// boards are RLS public-read, so logged-out visitors can browse the rankings;
// the shell adapts to that rather than the page dropping its navigation
// (TASK-76.1), which mattered doubly here since "Leaderboards" is itself one of
// the public nav destinations.
export function LeaderboardPage() {
  const players = usePlayerBoard()
  const pairs = usePairBoard()
  const form = useRecentForm()
  const inactive = useInactivePlayers()
  const nameOf = usePlayerNames()

  return (
    <AppShell title="Leaderboards">
      <div className="mx-auto w-full max-w-5xl" data-testid="leaderboard">
        <LeaderboardLegend />
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
        </div>
      </div>
    </AppShell>
  )
}
