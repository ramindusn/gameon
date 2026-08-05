// Pure fund & inventory math (E06 / TASK-7.1). No I/O — everything derives from
// a FundState snapshot so it is trivially unit-testable and reusable.

import type {
  FundState,
  Holding,
  HolderStock,
  MemberBalance,
  Product,
  ProductStock,
  StockHolder,
  StockLevel,
  UsageTotals,
} from './types'

/** Format a number as euros. */
export function euro(n: number): string {
  return `${n.toFixed(2)} €`
}

/** Total cash collected from all members. */
export function totalCollected(state: FundState): number {
  return state.members.reduce(
    (sum, m) => sum + m.contributions.reduce((s, c) => s + c.amount, 0),
    0,
  )
}

/** Total spent on barrel purchases. */
export function totalPurchases(state: FundState): number {
  return state.purchases.reduce((sum, p) => sum + p.barrels * p.pricePerBarrel, 0)
}

/** Total spent on other expenses. */
export function totalExpenses(state: FundState): number {
  return state.expenses.reduce((sum, e) => sum + e.amount, 0)
}

/** Total money spent (purchases + expenses). */
export function totalSpent(state: FundState): number {
  return totalPurchases(state) + totalExpenses(state)
}

/**
 * Money paid back into the fund by members for shuttles they have used,
 * valued at each product's average batch cost-per-shuttle.
 */
export function totalUsageIncome(state: FundState): number {
  const byId = new Map(state.products.map((p) => [p.id, p]))
  let sum = 0
  for (const entry of state.usage) {
    for (const item of entry.items) {
      const product = byId.get(item.productId)
      if (product) sum += item.shuttlesUsed * costPerShuttle(state, product)
    }
  }
  return sum
}

/**
 * Remaining fund balance.
 * = cash collected + payments for used shuttles − stock purchases − expenses.
 */
export function remainingFund(state: FundState): number {
  return totalCollected(state) + totalUsageIncome(state) - totalSpent(state)
}

/**
 * Weighted-average price per barrel for a product, blended across every purchase
 * batch (each batch keeps its own fixed price).
 */
export function avgBarrelPrice(state: FundState, productId: string): number {
  const batches = state.purchases.filter((p) => p.productId === productId)
  const totalBarrels = batches.reduce((s, b) => s + b.barrels, 0)
  if (totalBarrels <= 0) return 0
  const totalCost = batches.reduce((s, b) => s + b.barrels * b.pricePerBarrel, 0)
  return totalCost / totalBarrels
}

/** Average cost of a single shuttle for a product (from its batch prices). */
export function costPerShuttle(state: FundState, product: Product): number {
  if (product.shuttlesPerBarrel <= 0) return 0
  return avgBarrelPrice(state, product.id) / product.shuttlesPerBarrel
}

/** Total shuttles in stock for a product (barrels * perBarrel + loose). */
export function productShuttleCount(product: Product): number {
  return product.barrels * product.shuttlesPerBarrel + product.looseShuttles
}

/** Default threshold (in shuttles) below which a product is "low stock". */
export const LOW_STOCK_THRESHOLD = 24

/** Whether a product is running low on shuttles (legacy club-wide pool only). */
export function isLowStock(product: Product, threshold = LOW_STOCK_THRESHOLD): boolean {
  return productShuttleCount(product) < threshold
}

/**
 * Whether a product is running low club-wide, counting every holder's stock.
 * Low stock is a club-level concern: barrels split across three matchmakers are
 * not "low" just because no single one of them has many.
 */
export function isProductLowStock(
  state: FundState,
  product: Product,
  threshold = LOW_STOCK_THRESHOLD,
): boolean {
  return productStock(state, product).shuttles < threshold
}

// ---------------------------------------------------------------------------
// Per-matchmaker stock. Barrels are handed to the matchmakers who run game
// days, so stock is summed from holdings rather than a single club-wide pool.
//
// Each helper falls back to the legacy Product.barrels/looseShuttles when a
// state carries no holdings at all — that is exactly a pre-allocation state, and
// the fallback keeps older callers and fixtures correct until every read path
// has moved over.
// ---------------------------------------------------------------------------

/** Shuttle count for a barrels + loose pair of a given product. */
function shuttlesOf(product: Product, barrels: number, loose: number): number {
  return barrels * product.shuttlesPerBarrel + loose
}

function levelOf(product: Product, barrels: number, loose: number): StockLevel {
  return { barrels, looseShuttles: loose, shuttles: shuttlesOf(product, barrels, loose) }
}

/** Holdings for one product, across every holder. */
function holdingsFor(state: FundState, productId: string): Holding[] {
  return state.holdings.filter((h) => h.productId === productId)
}

/** Stock of one product across every matchmaker holding it. */
export function productStock(state: FundState, product: Product): StockLevel {
  const held = holdingsFor(state, product.id)
  if (state.holdings.length === 0) {
    return levelOf(product, product.barrels, product.looseShuttles)
  }
  return levelOf(
    product,
    held.reduce((s, h) => s + h.barrels, 0),
    held.reduce((s, h) => s + h.looseShuttles, 0),
  )
}

/**
 * Club-wide summary: every product with its total barrels + loose shuttles
 * summed across every holder. The "how much do we have as a club" view,
 * regardless of who is keeping it.
 */
export function stockOverview(state: FundState): ProductStock[] {
  return state.products.map((product) => ({
    product,
    ...productStock(state, product),
  }))
}

/** What one matchmaker is holding, per product (zero rows omitted). */
export function holderStock(state: FundState, holderId: string): HolderStock {
  const holder = state.holders.find((h) => h.id === holderId) ?? {
    id: holderId,
    name: 'Unknown',
  }
  const items: ProductStock[] = []
  for (const product of state.products) {
    const h = state.holdings.find(
      (x) => x.productId === product.id && x.holderId === holderId,
    )
    if (!h || (h.barrels === 0 && h.looseShuttles === 0)) continue
    items.push({ product, ...levelOf(product, h.barrels, h.looseShuttles) })
  }
  return {
    holder,
    items,
    totalShuttles: items.reduce((s, i) => s + i.shuttles, 0),
  }
}

/** Every matchmaker's stock, for the per-holder breakdown. */
export function stockByHolder(state: FundState): HolderStock[] {
  return state.holders.map((h) => holderStock(state, h.id))
}

/** Find the matchmaker a signed-in user holds stock as, if any. */
export function holderForUser(
  state: FundState,
  userId: string | undefined,
): StockHolder | undefined {
  if (!userId) return undefined
  return state.holders.find((h) => h.userId === userId)
}

/**
 * Apply shuttles used to one holder's stock. Shuttles come out of the running
 * total and the remainder is re-split, so using 4 from a single 12-shuttle
 * barrel leaves 0 barrels and 8 loose — the barrel is opened, not lost.
 *
 * Returns null when the holder does not have that many: usage can never take
 * stock below zero, and the caller should say so rather than clamp silently.
 */
export function deductUsage(
  product: Product,
  held: { barrels: number; looseShuttles: number },
  shuttlesUsed: number,
): { barrels: number; looseShuttles: number } | null {
  if (shuttlesUsed < 0 || product.shuttlesPerBarrel <= 0) return null
  const total = held.barrels * product.shuttlesPerBarrel + held.looseShuttles
  const remaining = total - shuttlesUsed
  if (remaining < 0) return null
  return {
    barrels: Math.floor(remaining / product.shuttlesPerBarrel),
    looseShuttles: remaining % product.shuttlesPerBarrel,
  }
}

/**
 * Who a game day's usage should come out of by default: the signed-in
 * matchmaker, but only if they actually hold that product. Returns undefined
 * otherwise so the caller asks instead of silently picking someone else.
 */
export function defaultUsageHolder(
  state: FundState,
  product: Product,
  myHolderId: string | undefined,
): StockHolder | undefined {
  if (!myHolderId) return undefined
  const held = state.holdings.find(
    (h) => h.productId === product.id && h.holderId === myHolderId,
  )
  if (!held || (held.barrels === 0 && held.looseShuttles === 0)) return undefined
  return state.holders.find((h) => h.id === myHolderId)
}

/** Everyone holding some of this product — the candidates usage can come from. */
export function holdersOfProduct(state: FundState, product: Product): StockHolder[] {
  return state.holders.filter((h) => {
    const held = state.holdings.find(
      (x) => x.productId === product.id && x.holderId === h.id,
    )
    return !!held && (held.barrels > 0 || held.looseShuttles > 0)
  })
}

/** Total shuttles in stock across all products (summed across holders). */
export function totalShuttlesInStock(state: FundState): number {
  return state.products.reduce((sum, p) => sum + productStock(state, p).shuttles, 0)
}

/** Total shuttles consumed across every logged game day. */
export function totalShuttlesUsed(state: FundState): number {
  return state.usage.reduce(
    (sum, u) => sum + u.items.reduce((s, i) => s + i.shuttlesUsed, 0),
    0,
  )
}

/** Game days with usage recorded — one usage entry is one game day. */
export function gameDaysRecorded(state: FundState): number {
  return state.usage.length
}

/**
 * What a game day costs and consumes on average.
 *
 * Running totals ("shuttles used, all time") only ever grow, so they answer
 * nothing you can act on. These are the per-day figures you can compare against
 * what members pay in. Cost is valued at each product's average batch
 * cost-per-shuttle, the same basis as totalUsageIncome, so the two agree.
 *
 * Zero recorded game days gives zero rather than a division by zero — the UI
 * shows the empty state instead.
 */
export function shuttlesPerGameDay(state: FundState): number {
  const days = gameDaysRecorded(state)
  return days === 0 ? 0 : totalShuttlesUsed(state) / days
}

export function costPerGameDay(state: FundState): number {
  const days = gameDaysRecorded(state)
  return days === 0 ? 0 : totalUsageIncome(state) / days
}

/**
 * Per-member balances. **Net** spending — stock + expenses minus game-day usage
 * income — is split equally across all current members. Crediting usage income
 * keeps the balances summing to the remaining fund.
 */
export function memberBalances(state: FundState): MemberBalance[] {
  const netSpent = totalSpent(state) - totalUsageIncome(state)
  const count = state.members.length || 1
  const share = netSpent / count
  return state.members.map((m) => {
    const starting = m.contributions.reduce((s, c) => s + c.amount, 0)
    return { id: m.id, name: m.name, starting, spent: share, left: starting - share }
  })
}

/** Aggregate usage for a specific date (defaults to all usage). */
export function usageForDate(state: FundState, date?: string): UsageTotals {
  // Compare on the YYYY-MM-DD prefix so date-only and date-time entries both match.
  const key = date ? date.slice(0, 10) : undefined
  const entries = key
    ? state.usage.filter((u) => u.date.slice(0, 10) === key)
    : state.usage
  const map = new Map<string, number>()
  for (const entry of entries) {
    for (const item of entry.items) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.shuttlesUsed)
    }
  }
  const perProduct = state.products.map((product) => {
    const shuttlesUsed = map.get(product.id) ?? 0
    return { product, shuttlesUsed, cost: shuttlesUsed * costPerShuttle(state, product) }
  })
  return { perProduct, totalCost: perProduct.reduce((s, p) => s + p.cost, 0) }
}

export interface UsageDay {
  id: string
  date: string
  totalShuttles: number
  totalCost: number
  parts: { name: string; shuttlesUsed: number }[]
  loggedBy?: string
}

/**
 * Game-day usage history, newest first, with per-day cost computed from the
 * current product prices.
 */
export function usageHistory(state: FundState): UsageDay[] {
  const productById = new Map(state.products.map((p) => [p.id, p]))
  return state.usage
    .map((entry) => {
      let totalShuttles = 0
      let totalCost = 0
      const parts: { name: string; shuttlesUsed: number }[] = []
      for (const item of entry.items) {
        const product = productById.get(item.productId)
        totalShuttles += item.shuttlesUsed
        if (product) {
          totalCost += item.shuttlesUsed * costPerShuttle(state, product)
          parts.push({
            name: `${product.brand} ${product.model}`,
            shuttlesUsed: item.shuttlesUsed,
          })
        }
      }
      return {
        id: entry.id,
        date: entry.date,
        totalShuttles,
        totalCost,
        parts,
        loggedBy: entry.loggedBy,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}
