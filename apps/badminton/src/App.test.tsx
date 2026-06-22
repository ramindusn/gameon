import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'
import { AuthProvider } from './auth/useAuth'

describe('App', () => {
  it('renders the app shell within the auth provider', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    )
    expect(screen.getByTestId('app-root')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    // Role region is present (resolves to signed-out without a session).
    expect(screen.getByTestId('auth-role')).toBeInTheDocument()
  })
})
