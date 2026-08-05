import type { FundState, Holding, Member, Product, Purchase, StockHolder } from './types'

/** Build a Product with sensible defaults for tests. */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    brand: 'Yonex',
    model: 'AS-30',
    shuttlesPerBarrel: 12,
    barrels: 10,
    looseShuttles: 0,
    ...overrides,
  }
}

/** Build a Purchase batch with sensible defaults for tests. */
export function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 'pu1',
    productId: 'p1',
    barrels: 10,
    pricePerBarrel: 24,
    date: '2026-01-01T10:00',
    ...overrides,
  }
}

/** Build a Member with sensible defaults for tests. */
export function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm1',
    name: 'Alice',
    contributions: [{ id: 'c1', amount: 200, date: '2026-01-01' }],
    ...overrides,
  }
}

/** Build a StockHolder (a matchmaker) with sensible defaults for tests. */
export function makeHolder(overrides: Partial<StockHolder> = {}): StockHolder {
  return { id: 'h1', name: 'Ramboo', ...overrides }
}

/** Build a Holding with sensible defaults for tests. */
export function makeHolding(overrides: Partial<Holding> = {}): Holding {
  return { productId: 'p1', holderId: 'h1', barrels: 0, looseShuttles: 0, ...overrides }
}

/** Build a full FundState, overriding only the slices a test cares about. */
export function makeState(overrides: Partial<FundState> = {}): FundState {
  return {
    members: [],
    products: [],
    purchases: [],
    usage: [],
    expenses: [],
    holders: [],
    holdings: [],
    ...overrides,
  }
}
