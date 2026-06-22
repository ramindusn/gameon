import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from '../App'
import { AuthProvider } from './useAuth'

// Drives the real login forms through the VITE_E2E bypass: sign-in records a
// role in sessionStorage and the app resolves it — no Supabase round-trip.
function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  )
}

describe('login flows (E2E bypass)', () => {
  beforeEach(() => vi.stubEnv('VITE_E2E', '1'))
  afterEach(() => {
    vi.unstubAllEnvs()
    sessionStorage.clear()
  })

  it('admin can request a magic link and lands signed in as admin', async () => {
    renderApp()
    fireEvent.change(await screen.findByTestId('admin-email'), {
      target: { value: 'admin@badmintonduo.club' },
    })
    fireEvent.click(screen.getByTestId('admin-magic-link-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('auth-role')).toHaveTextContent('Role: admin'),
    )
  })

  it('matchmaker can log in with username + password', async () => {
    renderApp()
    fireEvent.click(await screen.findByTestId('tab-matchmaker'))
    fireEvent.change(screen.getByTestId('mm-username'), { target: { value: 'rohan' } })
    fireEvent.change(screen.getByTestId('mm-password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByTestId('mm-login-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('auth-role')).toHaveTextContent('Role: matchmaker'),
    )
  })

  it('sign out returns to the login chooser', async () => {
    renderApp()
    fireEvent.change(await screen.findByTestId('admin-email'), {
      target: { value: 'admin@badmintonduo.club' },
    })
    fireEvent.click(screen.getByTestId('admin-magic-link-submit'))
    await waitFor(() => expect(screen.getByTestId('sign-out')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('sign-out'))
    await waitFor(() => expect(screen.getByTestId('tab-admin')).toBeInTheDocument())
  })
})
