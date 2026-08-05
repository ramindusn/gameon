import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { AuthProvider } from './auth/useAuth'

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App', () => {
  it('shows the public home with login buttons when signed out', async () => {
    renderAt('/')
    expect(await screen.findByTestId('nav-admin-login')).toBeInTheDocument()
    expect(screen.getByTestId('nav-matchmaker-login')).toBeInTheDocument()
  })

  it('redirects a protected route to the home when signed out', async () => {
    renderAt('/dashboard')
    expect(await screen.findByTestId('nav-admin-login')).toBeInTheDocument()
  })

  it('sends the old /play/:id address to the game day page (TASK-71)', async () => {
    // Shared links and bookmarks from before the two pages merged must still land.
    renderAt('/play/abc-123')
    expect(await screen.findByTestId('play')).toBeInTheDocument()
  })
})
