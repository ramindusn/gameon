import { useMemo, useRef, useState } from 'react'
import { cx } from '@gameon/ui'
import { DEFAULT_RATING } from '@gameon/domain'
import type { PlayerMatch } from '../play/api'
import type { RatingHistoryPoint } from '../ranking/api'
import { POINTS_TEXT, RANK_TEXT } from '../ranking/metricColors'

// Player performance trend (TASK-43, extended in TASK-55). One chart, two
// views, matching the app's metric colour language:
//   • Points (blue)  — cumulative points won − lost across matches
//   • Rating (green) — leaderboard rating after each game day
// Single series → no legend (the toggle names it); the match-history list below
// is the table view. Zero/1500 baseline, thin marks, hover crosshair + tooltip.

const W = 720
const H = 220
const PAD = { top: 16, right: 16, bottom: 24, left: 40 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

type Mode = 'points' | 'rating'

interface Point {
  i: number
  v: number
  date: string
  /** Tooltip headline ("Won 21–15" / "Rating 1509"). */
  head: string
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function PerformanceChart({
  matches,
  ratingHistory,
}: {
  matches: PlayerMatch[]
  /** Rating after each game day; enables the Rating view when ≥ 2 points. */
  ratingHistory?: RatingHistoryPoint[]
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  // Default to the Rating view; falls back to Points when there isn't enough
  // rating history to chart it (canToggle below).
  const [mode, setMode] = useState<Mode>('rating')

  const pointsSeries = useMemo<Point[]>(() => {
    // history arrives newest-first; replay oldest → newest.
    const chrono = [...matches].reverse()
    let cum = 0
    return chrono.map((m, i) => {
      cum += m.scoreFor - m.scoreAgainst
      return {
        i,
        v: cum,
        date: m.date,
        head: `${m.won ? 'Won' : 'Lost'} ${m.scoreFor}–${m.scoreAgainst}`,
      }
    })
  }, [matches])

  const ratingSeries = useMemo<Point[]>(
    () =>
      (ratingHistory ?? []).map((r, i) => ({
        i,
        v: Math.round(r.rating),
        date: r.playedAt,
        head: `Rating ${Math.round(r.rating)}`,
      })),
    [ratingHistory],
  )

  const canToggle = ratingSeries.length >= 2
  const active = mode === 'rating' && canToggle ? ratingSeries : pointsSeries
  const rating = mode === 'rating' && canToggle

  if (pointsSeries.length < 2) {
    return (
      <p className="text-sm text-fg-muted" data-testid="performance-empty">
        Not enough matches yet to chart a trend.
      </p>
    )
  }

  const n = active.length
  const values = active.map((p) => p.v)
  // Points anchors on 0 (net-zero); rating anchors on the 1500 starting line.
  const baseline = rating ? DEFAULT_RATING : 0
  const rawMin = Math.min(baseline, ...values)
  const rawMax = Math.max(baseline, ...values)
  const pad = Math.max(2, Math.round((rawMax - rawMin) * 0.08))
  const yMin = rawMin - pad
  const yMax = rawMax + pad

  const x = (i: number) => PAD.left + (n === 1 ? INNER_W / 2 : (i / (n - 1)) * INNER_W)
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * INNER_H
  const y0 = y(baseline)

  const linePath = active.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i)},${y(p.v)}`).join(' ')
  const areaPath = `${linePath} L${x(active[n - 1].i)},${y0} L${x(active[0].i)},${y0} Z`

  const last = active[n - 1]
  const hp = hover != null && hover < n ? active[hover] : null

  const lineCls = rating ? 'text-accent-strong' : 'text-sky-400'
  const fillCls = rating ? 'text-accent' : 'text-sky-400'
  const headline = rating
    ? `${Math.round(last.v)}`
    : `${last.v >= 0 ? '+' : ''}${last.v}`
  const headlineCls = rating ? RANK_TEXT : POINTS_TEXT

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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {canToggle ? (
          <div className="inline-flex rounded-lg border border-line bg-surface-muted p-0.5 text-xs">
            {(
              [
                ['rating', 'Rating', RANK_TEXT],
                ['points', 'Points', POINTS_TEXT],
              ] as const
            ).map(([id, label, cls]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id)
                  setHover(null)
                }}
                data-testid={`chart-mode-${id}`}
                className={cx(
                  'rounded-md px-2.5 py-1 font-semibold transition-colors',
                  mode === id ? cx('bg-surface', cls) : 'text-fg-muted hover:text-fg',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-fg-muted">Cumulative points won − lost · oldest → newest</p>
        )}
        <p className="text-sm">
          <span className={cx('font-display font-bold', headlineCls)}>{headline}</span>{' '}
          <span className="text-fg-muted">
            {rating ? `after ${n} game days` : `net over ${n} games`}
          </span>
        </p>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          role="img"
          aria-label={
            rating
              ? `Rating trend across ${n} game days, currently ${Math.round(last.v)}.`
              : `Performance trend: cumulative point difference across ${n} matches, currently ${last.v >= 0 ? '+' : ''}${last.v}.`
          }
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {/* baseline (0 for points, 1500 for rating) */}
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
          <path d={areaPath} className={fillCls} fill="currentColor" fillOpacity={0.14} />
          {/* the trend line */}
          <path
            d={linePath}
            className={lineCls}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* end marker (2px surface ring so it reads on the fill) */}
          <circle cx={x(last.i)} cy={y(last.v)} r={6} className="text-surface" fill="currentColor" />
          <circle cx={x(last.i)} cy={y(last.v)} r={4} className={lineCls} fill="currentColor" />

          {/* y range labels */}
          <text x={PAD.left - 6} y={y(yMax) + 4} textAnchor="end" className="fill-fg-subtle text-[11px]">
            {Math.round(rawMax)}
          </text>
          <text x={PAD.left - 6} y={y(yMin) + 4} textAnchor="end" className="fill-fg-subtle text-[11px]">
            {Math.round(rawMin)}
          </text>
          {/* first / last date */}
          <text x={PAD.left} y={H - 6} textAnchor="start" className="fill-fg-subtle text-[11px]">
            {shortDate(active[0].date)}
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
              <circle cx={x(hp.i)} cy={y(hp.v)} r={6} className="text-surface" fill="currentColor" />
              <circle cx={x(hp.i)} cy={y(hp.v)} r={4} className={lineCls} fill="currentColor" />
            </g>
          )}
        </svg>

        {/* tooltip */}
        {hp && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${(x(hp.i) / W) * 100}%`, top: `${(y(hp.v) / H) * 100}%` }}
            data-testid="performance-tooltip"
          >
            <div className="font-medium text-fg">{hp.head}</div>
            <div className="text-fg-muted">
              {shortDate(hp.date)}
              {!rating && (
                <>
                  {' '}
                  · {hp.v >= 0 ? '+' : ''}
                  {hp.v} total
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
