import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from './Modal'

describe('Modal', () => {
  it('exposes dialog semantics labelled by its title', () => {
    render(
      <Modal open title="Remove player" onClose={() => {}}>
        <button>Confirm</button>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Remove player')
  })

  it('moves focus into the dialog on open', () => {
    render(
      <Modal open title="Confirm" onClose={() => {}}>
        <button>Confirm</button>
      </Modal>,
    )
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal open title="Confirm" onClose={onClose}>
        <button>Confirm</button>
      </Modal>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('locks body scroll while open and restores it on close', () => {
    const { rerender } = render(
      <Modal open title="Confirm" onClose={() => {}}>
        <button>Confirm</button>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <Modal open={false} title="Confirm" onClose={() => {}}>
        <button>Confirm</button>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('')
  })

  it('renders nothing when closed', () => {
    render(
      <Modal open={false} title="Confirm" onClose={() => {}}>
        <button>Confirm</button>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
