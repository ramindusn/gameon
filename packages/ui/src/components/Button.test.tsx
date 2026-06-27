import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders its children as a button', () => {
    render(<Button>Generate draw</Button>)
    expect(screen.getByRole('button', { name: 'Generate draw' })).toBeInTheDocument()
  })

  it('applies the secondary variant classes', () => {
    render(<Button variant="secondary">Cancel</Button>)
    expect(screen.getByRole('button', { name: 'Cancel' }).className).toContain('bg-surface-muted')
  })

  it('disables and marks busy while loading', () => {
    render(<Button loading>Save</Button>)
    const btn = screen.getByRole('button', { name: 'Save' })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })
})
