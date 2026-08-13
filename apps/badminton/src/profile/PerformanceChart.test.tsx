import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { PlayerMatch } from '../play/api'
import { PerformanceChart } from './PerformanceChart'

const match = (id: string, date: string, scoreFor: number, scoreAgainst: number): PlayerMatch => ({
  id,
  sessionId: `s-${id}`,
  round: 1,
  date,
  mode: 'open',
  partnerId: null,
  opponentIds: [null, null],
  scoreFor,
  scoreAgainst,
  won: scoreFor > scoreAgainst,
})

describe('PerformanceChart (TASK-43)', () => {
  it('charts the cumulative point difference and headlines the net', () => {
    // history is newest-first; replayed oldest→newest the running total is
    // +6 (21-15), then +6-3 = +3 (18-21), then +3+11 = +14 (21-10) → net +14.
    render(
      <PerformanceChart
        matches={[
          match('m3', '2026-07-05T18:00:00Z', 21, 10),
          match('m2', '2026-06-28T18:00:00Z', 18, 21),
          match('m1', '2026-06-21T18:00:00Z', 21, 15),
        ]}
      />,
    )
    expect(screen.getByTestId('performance-chart')).toBeInTheDocument()
    expect(screen.getByTestId('performance-chart')).toHaveTextContent('+14')
    expect(screen.getByTestId('performance-chart')).toHaveTextContent('net over 3 games')
  })

  it('shows an empty state with fewer than two matches', () => {
    render(<PerformanceChart matches={[match('m1', '2026-06-21T18:00:00Z', 21, 15)]} />)
    expect(screen.getByTestId('performance-empty')).toBeInTheDocument()
  })
})
