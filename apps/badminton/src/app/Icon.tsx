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

// A shuttle tube with shuttles stacked inside it — an empty cylinder read as a
// tin or a battery, and lucide's Package (used before) read as a parcel. The
// corks inside are what say "shuttles", so the glyph means a barrel OF
// shuttles rather than a container of anything.
function Barrel(props: LucideProps) {
  const { className, strokeWidth = 1.6, ...rest } = props
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
      {/* Tube: lid, body, and the seam under the lid. */}
      <ellipse cx="12" cy="4.2" rx="5.2" ry="2.2" />
      <path d="M6.8 4.2v15.6c0 1.2 2.3 2.2 5.2 2.2s5.2-1 5.2-2.2V4.2" />
      <path d="M6.8 7.6c0 1.2 2.3 2.2 5.2 2.2s5.2-1 5.2-2.2" />
      {/* Two shuttles nested inside, drawn the way they pack in a tube: skirt
          flaring up, cork below. Plain dots read as "some contents"; the skirt
          is what makes them shuttles. */}
      <path d="M9.6 10.6 12 13.7l2.4-3.1" />
      <circle cx="12" cy="14.5" r="1.15" fill="currentColor" stroke="none" />
      <path d="M9.6 16 12 19.1l2.4-3.1" />
      <circle cx="12" cy="19.9" r="1.15" fill="currentColor" stroke="none" />
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
