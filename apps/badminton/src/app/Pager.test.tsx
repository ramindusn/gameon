import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Pager, usePager } from './Pager'

// Three cards page long lists — game day history, the admin's game days and its
// stock log. The behaviour lives here so they cannot drift apart.
function Harness({ count, size }: { count: number; size: number }) {
  const items = Array.from({ length: count }, (_, i) => `item ${i + 1}`)
  const p = usePager(items, size)
  return (
    <>
      <ul data-testid="items">
        {p.slice.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <Pager
        page={p.page}
        pageCount={p.pageCount}
        start={p.start}
        shown={p.slice.length}
        total={p.total}
        onPage={p.setPage}
        testId="pager"
      />
    </>
  )
}

const shown = () => screen.getByTestId('items').querySelectorAll('li').length

describe('Pager', () => {
  it('shows one page at a time and steps through', () => {
    render(<Harness count={23} size={10} />)
    expect(shown()).toBe(10)
    expect(screen.getByTestId('pager')).toHaveTextContent('1–10 of 23')
    expect(screen.getByTestId('pager-prev')).toBeDisabled()

    fireEvent.click(screen.getByTestId('pager-next'))
    expect(screen.getByTestId('pager')).toHaveTextContent('11–20 of 23')

    // The last page is short, and there is nowhere further to go.
    fireEvent.click(screen.getByTestId('pager-next'))
    expect(shown()).toBe(3)
    expect(screen.getByTestId('pager')).toHaveTextContent('21–23 of 23')
    expect(screen.getByTestId('pager-next')).toBeDisabled()
  })

  it('renders nothing when it all fits on one page', () => {
    render(<Harness count={4} size={10} />)
    expect(shown()).toBe(4)
    // Dead controls on a short list read as though something is missing.
    expect(screen.queryByTestId('pager')).toBeNull()
  })

  // A game day finishing, or a stock change landing, while you sit on the last
  // page would otherwise re-slice the list and leave you looking at nothing.
  it('clamps to the last real page when the list shrinks under it', () => {
    const { rerender } = render(<Harness count={23} size={10} />)
    fireEvent.click(screen.getByTestId('pager-next'))
    fireEvent.click(screen.getByTestId('pager-next'))
    expect(screen.getByTestId('pager')).toHaveTextContent('21–23 of 23')

    rerender(<Harness count={12} size={10} />)
    expect(screen.getByTestId('pager')).toHaveTextContent('11–12 of 12')
    expect(shown()).toBe(2)
  })
})
