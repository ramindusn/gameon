// Pure fund & inventory math (E06 / TASK-7.1). No I/O — everything derives from
// a FundState snapshot so it is trivially unit-testable and reusable.

import type { FundState, MemberBalance, Product, UsageTotals } from './types'

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

/** Whether a product is running low on shuttles. */
export function isLowStock(product: Product, threshold = LOW_STOCK_THRESHOLD): boolean {
  return productShuttleCount(product) < threshold
}

/** Total shuttles in stock across all products. */
export function totalShuttlesInStock(state: FundState): number {
  return state.products.reduce((sum, p) => sum + productShuttleCount(p), 0)
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
