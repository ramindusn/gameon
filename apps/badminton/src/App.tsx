import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider, ConfirmProvider } from '@gameon/ui'
import { Home } from './routes/Home'
import { DashboardPage } from './routes/DashboardPage'
import { MatchmakerHome } from './routes/MatchmakerHome'
import { GeneratePage } from './routes/GeneratePage'
import { PlayPage } from './routes/PlayPage'
import { PlayersPage } from './routes/PlayersPage'
import { PlayerProfilePage } from './routes/PlayerProfilePage'
import { GameDayPage } from './routes/GameDayPage'
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
            <Route path="/game-days/:id" element={<GameDayPage />} />

            <Route element={<ProtectedRoute allow={['admin']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute allow={['matchmaker']} />}>
              <Route path="/matchmaker" element={<MatchmakerHome />} />
              <Route path="/generate" element={<GeneratePage />} />
              <Route path="/play/:id" element={<PlayPage />} />
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
