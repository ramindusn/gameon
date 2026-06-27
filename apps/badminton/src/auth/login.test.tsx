import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from '../App'
import { AuthProvider } from './useAuth'

// Drives the real login forms + routing through the VITE_E2E bypass. The login
// dropdowns live on the public home (there's no separate /login page), so we
// start there, open a dropdown, sign in and assert the role-based routing.
function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('login + routing (E2E bypass)', () => {
  beforeEach(() => vi.stubEnv('VITE_E2E', '1'))
  afterEach(() => {
    vi.unstubAllEnvs()
    sessionStorage.clear()
  })

  it('admin sign-in routes to the dashboard', async () => {
    renderApp()
    fireEvent.click(await screen.findByTestId('nav-admin-login'))
    fireEvent.change(screen.getByTestId('admin-email'), {
      target: { value: 'admin@badmintonduo.club' },
    })
    fireEvent.click(screen.getByTestId('admin-magic-link-submit'))

    expect(await screen.findByTestId('dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('auth-role')).toHaveTextContent('Role: admin')
  })

  it('matchmaker sign-in routes to the matchmaker home', async () => {
    renderApp()
    fireEvent.click(await screen.findByTestId('nav-matchmaker-login'))
    fireEvent.change(screen.getByTestId('mm-username'), { target: { value: 'rohan' } })
    fireEvent.change(screen.getByTestId('mm-password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByTestId('mm-login-submit'))

    expect(await screen.findByTestId('matchmaker-home')).toBeInTheDocument()
    expect(screen.getByTestId('auth-role')).toHaveTextContent('Role: matchmaker')
  })

  it('sign out returns to the public home', async () => {
    renderApp()
    fireEvent.click(await screen.findByTestId('nav-admin-login'))
    fireEvent.change(screen.getByTestId('admin-email'), {
      target: { value: 'admin@badmintonduo.club' },
    })
    fireEvent.click(screen.getByTestId('admin-magic-link-submit'))
    await screen.findByTestId('sign-out')

    fireEvent.click(screen.getByTestId('sign-out'))
    // Back on the public home with the login buttons available again. Re-query
    // inside waitFor so a re-render (Home's settling queries) can't leave us
    // asserting on a detached node.
    await waitFor(() =>
      expect(screen.getByTestId('nav-admin-login')).toBeInTheDocument(),
    )
  })
})
