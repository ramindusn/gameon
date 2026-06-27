import { Component, type ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider, useToast } from './Toast'

// Catches a render error so it's *handled* (no unhandled error leaks to the
// test runner and gets misattributed to a concurrent test).
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    return this.state.error ? <p>caught: {this.state.error.message}</p> : this.props.children
  }
}

function Trigger() {
  const { success } = useToast()
  return <button onClick={() => success('Score saved')}>fire</button>
}

describe('Toast', () => {
  it('shows a toast when triggered and dismisses it on click', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    expect(screen.queryByText('Score saved')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'fire' }))
    expect(screen.getByText('Score saved')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('Score saved')).toBeNull()
  })

  it('auto-dismisses after the timeout', () => {
    vi.useFakeTimers()
    try {
      render(
        <ToastProvider>
          <Trigger />
        </ToastProvider>,
      )
      fireEvent.click(screen.getByRole('button', { name: 'fire' }))
      expect(screen.getByText('Score saved')).toBeInTheDocument()
      act(() => {
        vi.advanceTimersByTime(4000)
      })
      expect(screen.queryByText('Score saved')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('throws if used outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Bare() {
      useToast()
      return null
    }
    render(
      <ErrorBoundary>
        <Bare />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/ToastProvider/)).toBeInTheDocument()
    spy.mockRestore()
  })
})
