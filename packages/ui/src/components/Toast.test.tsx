import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider, useToast } from './Toast'

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
    function Bare() {
      useToast()
      return null
    }
    expect(() => render(<Bare />)).toThrow(/ToastProvider/)
  })
})
