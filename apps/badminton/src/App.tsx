import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { ToastProvider, ConfirmProvider } from '@gameon/ui'
import { Home } from './routes/Home'
import { DashboardPage } from './routes/DashboardPage'
import { MatchmakerHome } from './routes/MatchmakerHome'
import { GeneratePage } from './routes/GeneratePage'
import { PlayPage } from './routes/PlayPage'
import { PlayersPage } from './routes/PlayersPage'
import { PlayerProfilePage } from './routes/PlayerProfilePage'
import { PairProfilePage } from './routes/PairProfilePage'
import { AllGameDaysPage } from './routes/AllGameDaysPage'
import { LeaderboardPage } from './routes/LeaderboardPage'
import { ProtectedRoute } from './auth/ProtectedRoute'

// E2E builds run with VITE_E2E=1; auth uses this to bypass real sign-in.
export const e2e = import.meta.env.VITE_E2E === '1'

export function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <div data-testid="app-root" data-e2e={e2e ? '1' : undefined}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/players/:id" element={<PlayerProfilePage />} />
            {/* Both ids in the path; pairKey sorts them, so /pairs/a/b and
                /pairs/b/a are the same partnership (TASK-90). */}
            <Route path="/pairs/:a/:b" element={<PairProfilePage />} />
            {/* One page per game day (TASK-71). Public + read-only for players;
                editing controls are gated to matchmakers inside it (TASK-50). */}
            <Route path="/game-days/:id" element={<PlayPage />} />
            {/* The old matchmaker URL — kept so shared links and bookmarks and
                any open tabs still land on the game day. */}
            <Route path="/play/:id" element={<PlayRedirect />} />

            <Route element={<ProtectedRoute allow={['admin']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute allow={['matchmaker']} />}>
              <Route path="/matchmaker" element={<MatchmakerHome />} />
              <Route path="/generate" element={<GeneratePage />} />
            </Route>

            <Route element={<ProtectedRoute allow={['admin', 'matchmaker']} />}>
              <Route path="/players" element={<PlayersPage />} />
              <Route path="/game-days" element={<AllGameDaysPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}

/** /play/:id was the game day's old address — send it to the surviving one. */
function PlayRedirect() {
  const { id = '' } = useParams()
  return <Navigate to={`/game-days/${id}`} replace />
}
