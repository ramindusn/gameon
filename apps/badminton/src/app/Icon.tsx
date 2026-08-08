import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CalendarDays,
  CircleDot,
  Flag,
  Home,
  LayoutDashboard,
  Medal,
  Package,
  Plus,
  Receipt,
  Shuffle,
  Swords,
  Target,
  Trophy,
  Users,
  Wallet,
  type LucideProps,
} from 'lucide-react'
import { cx } from '@gameon/ui'

// A badminton shuttlecock — lucide has no racket/shuttle, so this keeps the
// brand glyph on-theme (inherits currentColor like the lucide icons).
function Shuttle(props: LucideProps) {
  const { className, strokeWidth = 1.75, ...rest } = props
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      <circle cx="12" cy="17.5" r="2.5" />
      <path d="M12 15V4" />
      <path d="M9.7 15.3 6.5 5.5" />
      <path d="m14.3 15.3 3.2-9.8" />
      <path d="M7.5 8.5h9" />
    </svg>
  )
}

// A shuttle tube — the cylinder shuttles are sold and carried in. lucide's
// Package is a cube, which read as a parcel rather than a barrel of shuttles.
function Barrel(props: LucideProps) {
  const { className, strokeWidth = 1.75, ...rest } = props
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      {/* Lid, body, and the line under the lid that makes it read as a tube
          rather than a plain cylinder. */}
      <ellipse cx="12" cy="4.5" rx="5.5" ry="2.5" />
      <path d="M6.5 4.5v15c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-15" />
      <path d="M6.5 8.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5" />
    </svg>
  )
}

// Semantic icon names → glyph. Several names can share a glyph (players/pairs).
const ICONS = {
  dashboard: LayoutDashboard,
  stats: BarChart3,
  players: Users,
  pairs: Users,
  home: Home,
  generate: Shuffle,
  ranking: Medal,
  tournament: Trophy,
  trophy: Trophy,
  shuttle: Shuttle,
  matches: Swords,
  warning: AlertTriangle,
  calendar: Calendar,
  schedule: CalendarDays,
  finish: Flag,
  target: Target,
  add: Plus,
  inventory: Package,
  barrel: Barrel,
  money: Wallet,
  live: CircleDot,
  receipt: Receipt,
} as const

export type IconName = keyof typeof ICONS

/** Themed line icon. Inherits text colour (currentColor); defaults to 1.25rem. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  const Glyph = ICONS[name]
  return <Glyph aria-hidden strokeWidth={1.75} className={cx('h-5 w-5 shrink-0', className)} />
}
