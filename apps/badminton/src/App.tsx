import { Navigate, Route, Routes } from 'react-router-dom'
import { Home } from './routes/Home'
import { LoginPage } from './routes/LoginPage'
import { DashboardPage } from './routes/DashboardPage'
import { MatchmakerHome } from './routes/MatchmakerHome'
import { GeneratePage } from './routes/GeneratePage'
import { PlayPage } from './routes/PlayPage'
import { SessionsPage } from './routes/SessionsPage'
import { PlayersPage } from './routes/PlayersPage'
import { PlayerProfilePage } from './routes/PlayerProfilePage'
import { ProtectedRoute } from './auth/ProtectedRoute'

// E2E builds run with VITE_E2E=1; auth uses this to bypass real sign-in.
export const e2e = import.meta.env.VITE_E2E === '1'

export function App() {
  return (
    <div data-testid="app-root" data-e2e={e2e ? '1' : undefined}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/players/:id" element={<PlayerProfilePage />} />

        <Route element={<ProtectedRoute allow={['admin']} />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        <Route element={<ProtectedRoute allow={['matchmaker']} />}>
          <Route path="/matchmaker" element={<MatchmakerHome />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/play" element={<SessionsPage />} />
          <Route path="/play/:id" element={<PlayPage />} />
        </Route>

        <Route element={<ProtectedRoute allow={['admin', 'matchmaker']} />}>
          <Route path="/players" element={<PlayersPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
