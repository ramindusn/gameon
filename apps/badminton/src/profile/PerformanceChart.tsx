import { useMemo, useRef, useState } from 'react'
import { cx } from '@gameon/ui'
import type { PlayerMatch } from '../play/api'

// Player performance trend (TASK-43). A single-series area+line of the player's
// cumulative point difference (points won − lost) across their matches, oldest →
// newest — so the shape reads as momentum/form. One series → accent green, no
// legend (the title names it); the match-history list below is the table view.
// Follows the dataviz method: zero baseline, thin marks, rounded end, hover
// crosshair + tooltip.

const W = 720
const H = 220
const PAD = { top: 16, right: 16, bottom: 24, left: 40 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

interface Point {
  i: number
  cum: number
  date: string
  won: boolean
  scoreFor: number
  scoreAgainst: number
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function PerformanceChart({ matches }: { matches: PlayerMatch[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const points = useMemo<Point[]>(() => {
    // history arrives newest-first; replay oldest → newest.
    const chrono = [...matches].reverse()
    let cum = 0
    return chrono.map((m, i) => {
      cum += m.scoreFor - m.scoreAgainst
      return {
        i,
        cum,
        date: m.date,
        won: m.won,
        scoreFor: m.scoreFor,
        scoreAgainst: m.scoreAgainst,
      }
    })
  }, [matches])

  if (points.length < 2) {
    return (
      <p className="text-sm text-fg-muted" data-testid="performance-empty">
        Not enough matches yet to chart a trend.
      </p>
    )
  }

  const n = points.length
  const values = points.map((p) => p.cum)
  const rawMin = Math.min(0, ...values)
  const rawMax = Math.max(0, ...values)
  const pad = Math.max(2, Math.round((rawMax - rawMin) * 0.08))
  const yMin = rawMin - pad
  const yMax = rawMax + pad

  const x = (i: number) => PAD.left + (n === 1 ? INNER_W / 2 : (i / (n - 1)) * INNER_W)
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * INNER_H
  const y0 = y(0)

  const linePath = points.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i)},${y(p.cum)}`).join(' ')
  const areaPath = `${linePath} L${x(points[n - 1].i)},${y0} L${x(points[0].i)},${y0} Z`

  const last = points[n - 1]
  const net = last.cum
  const hp = hover != null ? points[hover] : null

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const rel = (e.clientX - rect.left) / rect.width // 0..1 across the svg
    const px = rel * W
    const frac = (px - PAD.left) / INNER_W
    const idx = Math.round(frac * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, idx)))
  }

  return (
    <div data-testid="performance-chart">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-xs text-fg-muted">
          Cumulative points won − lost · oldest → newest
        </p>
        <p className="text-sm">
          <span className={cx('font-display font-bold', net >= 0 ? 'text-accent-strong' : 'text-negative')}>
            {net >= 0 ? '+' : ''}
            {net}
          </span>{' '}
          <span className="text-fg-muted">net over {n} games</span>
        </p>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          role="img"
          aria-label={`Performance trend: cumulative point difference across ${n} matches, currently ${net >= 0 ? '+' : ''}${net}.`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {/* zero baseline */}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y0}
            y2={y0}
            className="text-fg-subtle"
            stroke="currentColor"
            strokeOpacity={0.4}
            strokeDasharray="4 4"
          />
          {/* area under the line */}
          <path d={areaPath} className="text-accent" fill="currentColor" fillOpacity={0.14} />
          {/* the trend line */}
          <path
            d={linePath}
            className="text-accent-strong"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* end marker (2px surface ring so it reads on the fill) */}
          <circle cx={x(last.i)} cy={y(last.cum)} r={6} className="text-surface" fill="currentColor" />
          <circle cx={x(last.i)} cy={y(last.cum)} r={4} className="text-accent-strong" fill="currentColor" />

          {/* y range labels */}
          <text x={PAD.left - 6} y={y(yMax) + 4} textAnchor="end" className="fill-fg-subtle text-[11px]">
            {Math.round(rawMax)}
          </text>
          <text x={PAD.left - 6} y={y(yMin) + 4} textAnchor="end" className="fill-fg-subtle text-[11px]">
            {Math.round(rawMin)}
          </text>
          {/* first / last date */}
          <text x={PAD.left} y={H - 6} textAnchor="start" className="fill-fg-subtle text-[11px]">
            {shortDate(points[0].date)}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-fg-subtle text-[11px]">
            {shortDate(last.date)}
          </text>

          {/* hover crosshair + point */}
          {hp && (
            <g className="pointer-events-none">
              <line
                x1={x(hp.i)}
                x2={x(hp.i)}
                y1={PAD.top}
                y2={PAD.top + INNER_H}
                className="text-fg-subtle"
                stroke="currentColor"
                strokeOpacity={0.5}
              />
              <circle cx={x(hp.i)} cy={y(hp.cum)} r={6} className="text-surface" fill="currentColor" />
              <circle cx={x(hp.i)} cy={y(hp.cum)} r={4} className="text-accent-strong" fill="currentColor" />
            </g>
          )}
        </svg>

        {/* tooltip */}
        {hp && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${(x(hp.i) / W) * 100}%`, top: `${(y(hp.cum) / H) * 100}%` }}
            data-testid="performance-tooltip"
          >
            <div className="font-medium text-fg">
              {hp.won ? 'Won' : 'Lost'} {hp.scoreFor}–{hp.scoreAgainst}
            </div>
            <div className="text-fg-muted">
              {shortDate(hp.date)} · {hp.cum >= 0 ? '+' : ''}
              {hp.cum} total
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
