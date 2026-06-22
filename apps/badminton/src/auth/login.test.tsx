import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../App'
import { AuthProvider } from './useAuth'

// Drives the real login forms + routing through the VITE_E2E bypass: sign-in
// records a role in sessionStorage, the app resolves it and routes accordingly.
function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
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
    fireEvent.change(await screen.findByTestId('admin-email'), {
      target: { value: 'admin@badmintonduo.club' },
    })
    fireEvent.click(screen.getByTestId('admin-magic-link-submit'))

    expect(await screen.findByTestId('dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('auth-role')).toHaveTextContent('Role: admin')
  })

  it('matchmaker sign-in routes to the matchmaker home', async () => {
    renderApp()
    fireEvent.click(await screen.findByTestId('tab-matchmaker'))
    fireEvent.change(screen.getByTestId('mm-username'), { target: { value: 'rohan' } })
    fireEvent.change(screen.getByTestId('mm-password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByTestId('mm-login-submit'))

    expect(await screen.findByTestId('matchmaker-home')).toBeInTheDocument()
    expect(screen.getByTestId('auth-role')).toHaveTextContent('Role: matchmaker')
  })

  it('sign out returns to the login chooser', async () => {
    renderApp()
    fireEvent.change(await screen.findByTestId('admin-email'), {
      target: { value: 'admin@badmintonduo.club' },
    })
    fireEvent.click(screen.getByTestId('admin-magic-link-submit'))
    await screen.findByTestId('sign-out')

    fireEvent.click(screen.getByTestId('sign-out'))
    expect(await screen.findByTestId('tab-admin')).toBeInTheDocument()
  })
})
