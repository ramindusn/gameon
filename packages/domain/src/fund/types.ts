// Fund & inventory domain types (E06). Mirrors the club-ops model: members put
// cash into a shared fund; shuttles are bought in barrel batches (fixed price per
// batch) and consumed on game days, which credits usage income back to the fund.

/** A single cash contribution a member made into the fund. */
export interface Contribution {
  id: string
  amount: number
  date: string // ISO date
  loggedBy?: string // who recorded this entry
}

/** A club member who puts cash into the shared fund. */
export interface Member {
  id: string
  name: string
  contributions: Contribution[]
  email?: string // login email, when this member is also an admin/matchmaker
}

/** A shuttle product (brand + model). Price is tracked per purchase batch. */
export interface Product {
  id: string
  brand: string
  model: string
  shuttlesPerBarrel: number
  /**
   * @deprecated Legacy club-wide pool, superseded by per-matchmaker `Holding`s.
   * Still populated so states loaded before per-holder stock existed keep working;
   * read stock through the holdings helpers in calc.ts instead.
   */
  barrels: number
  /** @deprecated See `barrels` — use per-matchmaker holdings. */
  looseShuttles: number
}

/** A purchase of barrels for a product = one batch with a fixed unit price. */
export interface Purchase {
  id: string
  productId: string
  barrels: number
  pricePerBarrel: number
  date: string
  note?: string
  loggedBy?: string
}

/** A single day's shuttle usage across products. */
export interface UsageEntry {
  id: string
  date: string
  items: { productId: string; shuttlesUsed: number }[]
  loggedBy?: string
}

/** Any other expense (e.g. storage boxes). */
export interface Expense {
  id: string
  description: string
  amount: number
  date: string
  loggedBy?: string
}

/**
 * A matchmaker who physically keeps club barrels. Barrels are handed to the
 * people who run game days, so every barrel belongs to one of them. `id` is
 * their player_profiles row; `userId` is their login, which is what lets them
 * see the stock in their own hands.
 */
export interface StockHolder {
  id: string
  name: string
  userId?: string
}

/** Stock of one product held by one matchmaker. */
export interface Holding {
  productId: string
  holderId: string
  barrels: number // full unopened barrels in this matchmaker's hands
  looseShuttles: number // leftover individual shuttles (created by usage)
}

/** The full fund/inventory state the calculations operate on. */
export interface FundState {
  members: Member[]
  products: Product[]
  purchases: Purchase[]
  usage: UsageEntry[]
  expenses: Expense[]
  holders: StockHolder[]
  holdings: Holding[]
}

/** Stock counted as barrels + loose, with the derived shuttle total. */
export interface StockLevel {
  barrels: number
  looseShuttles: number
  /** barrels * shuttlesPerBarrel + looseShuttles */
  shuttles: number
}

/** One product's stock, either club-wide or in one matchmaker's hands. */
export interface ProductStock extends StockLevel {
  product: Product
}

/** What one matchmaker is holding, per product. */
export interface HolderStock {
  holder: StockHolder
  items: ProductStock[]
  totalShuttles: number
}

export interface MemberBalance {
  id: string
  name: string
  starting: number
  spent: number
  left: number
}

export interface UsageTotals {
  perProduct: { product: Product; shuttlesUsed: number; cost: number }[]
  totalCost: number
}
