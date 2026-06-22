import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'
import { AuthProvider } from './auth/useAuth'

describe('App', () => {
  it('renders the app shell within the auth provider', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    )
    expect(screen.getByTestId('app-root')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    // Signed out: the login chooser appears once the role resolves.
    expect(await screen.findByTestId('tab-admin')).toBeInTheDocument()
  })
})
