import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './auth/useAuth'

describe('App', () => {
  it('shows the login chooser when signed out', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('tab-admin')).toBeInTheDocument()
    expect(screen.getByTestId('tab-matchmaker')).toBeInTheDocument()
  })
})
