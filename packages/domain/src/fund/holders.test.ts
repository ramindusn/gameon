import { describe, expect, it } from 'vitest'
import {
  deductUsage,
  defaultUsageHolder,
  holderForUser,
  holdersOfProduct,
  holderStock,
  isProductLowStock,
  productStock,
  stockByHolder,
  stockOverview,
  totalShuttlesInStock,
} from './calc'
import { makeHolder, makeHolding, makeProduct, makeState } from './fixtures'

// Barrels are handed to the matchmakers who run game days (TASK-69): the club
// summary sums every holder's barrels + loose per brand, while a matchmaker can
// see just what is in their own hands.

const rsl = makeProduct({ id: 'p1', brand: 'RSL', shuttlesPerBarrel: 12 })
const victor = makeProduct({ id: 'p2', brand: 'Victor', shuttlesPerBarrel: 12 })
const ram = makeHolder({ id: 'h1', name: 'Ramboo', userId: 'u1' })
const kasun = makeHolder({ id: 'h2', name: 'Kasun', userId: 'u2' })

/** RSL split 10+2 barrels across two matchmakers; Victor held only by Kasun. */
const split = makeState({
  products: [rsl, victor],
  holders: [ram, kasun],
  holdings: [
    makeHolding({ productId: 'p1', holderId: 'h1', barrels: 10, looseShuttles: 5 }),
    makeHolding({ productId: 'p1', holderId: 'h2', barrels: 2, looseShuttles: 3 }),
    makeHolding({ productId: 'p2', holderId: 'h2', barrels: 4, looseShuttles: 0 }),
  ],
})

describe('productStock', () => {
  it('sums barrels and loose across every matchmaker holding the product', () => {
    expect(productStock(split, rsl)).toEqual({
      barrels: 12, // 10 + 2
      looseShuttles: 8, // 5 + 3
      shuttles: 152, // 12*12 + 8
    })
  })

  it('reports zero for a product nobody holds', () => {
    const state = makeState({ products: [rsl], holders: [ram], holdings: [] })
    // Nobody is holding it, so there is none — not a fallback to some other
    // figure, which is what used to hide stock in the wrong place (TASK-83).
    expect(productStock(state, makeProduct({ id: 'p9' })))
      .toEqual({ barrels: 0, looseShuttles: 0, shuttles: 0 })
  })
})

describe('stockOverview', () => {
  it('gives the club-wide total per brand regardless of who holds it', () => {
    const rows = stockOverview(split)
    expect(rows.map((r) => [r.product.brand, r.barrels, r.looseShuttles, r.shuttles])).toEqual([
      ['RSL', 12, 8, 152],
      ['Victor', 4, 0, 48],
    ])
  })

  it('is empty when the club has no products', () => {
    expect(stockOverview(makeState())).toEqual([])
  })
})

describe('holderStock', () => {
  it("returns only the stock in that matchmaker's hands", () => {
    const mine = holderStock(split, 'h1')
    expect(mine.holder.name).toBe('Ramboo')
    expect(mine.items.map((i) => [i.product.brand, i.barrels, i.looseShuttles])).toEqual([
      ['RSL', 10, 5],
    ])
    expect(mine.totalShuttles).toBe(125) // 10*12 + 5
  })

  it('covers a matchmaker holding several brands', () => {
    const theirs = holderStock(split, 'h2')
    expect(theirs.items.map((i) => i.product.brand)).toEqual(['RSL', 'Victor'])
    expect(theirs.totalShuttles).toBe(27 + 48) // (2*12+3) + (4*12)
  })

  it('omits products the matchmaker holds none of', () => {
    // Ramboo has no Victor holding at all.
    expect(holderStock(split, 'h1').items.map((i) => i.product.brand)).not.toContain(
      'Victor',
    )
  })

  it('returns an empty holding list for an unknown matchmaker', () => {
    const none = holderStock(split, 'nope')
    expect(none.items).toEqual([])
    expect(none.totalShuttles).toBe(0)
  })
})

describe('stockByHolder', () => {
  it('breaks the club stock down per holder', () => {
    expect(stockByHolder(split).map((h) => [h.holder.name, h.totalShuttles])).toEqual([
      ['Ramboo', 125],
      ['Kasun', 75],
    ])
  })
})

describe('holderForUser', () => {
  it('finds the matchmaker a signed-in user holds stock as', () => {
    expect(holderForUser(split, 'u2')?.name).toBe('Kasun')
  })

  it('returns undefined for a user who holds nothing and for no user', () => {
    expect(holderForUser(split, 'u404')).toBeUndefined()
    expect(holderForUser(split, undefined)).toBeUndefined()
  })
})

describe('club totals derive from holdings', () => {
  it('totalShuttlesInStock sums every custodian', () => {
    expect(totalShuttlesInStock(split)).toBe(152 + 48)
  })

  // The legacy-pool equivalence check retired with the pool itself (TASK-83):
  // there is no second figure left to agree with. What matters now is that the
  // total is the sum of what people are holding, and nothing else.
  it('counts only what is held — a product nobody holds contributes nothing', () => {
    const withUnheld = makeState({
      products: [makeProduct({ id: 'p1' }), makeProduct({ id: 'p-unheld' })],
      holders: [ram],
      holdings: [
        makeHolding({ productId: 'p1', holderId: 'h1', barrels: 19, looseShuttles: 8 }),
      ],
    })
    expect(totalShuttlesInStock(withUnheld)).toBe(236) // 19*12 + 8, and no more
  })

  it('low stock is judged club-wide, not per holder', () => {
    // 2 barrels split 1+1 = 24 shuttles: not low, even though each holder has 12.
    const thin = makeState({
      products: [rsl],
      holders: [ram, kasun],
      holdings: [
        makeHolding({ productId: 'p1', holderId: 'h1', barrels: 1 }),
        makeHolding({ productId: 'p1', holderId: 'h2', barrels: 1 }),
      ],
    })
    expect(isProductLowStock(thin, rsl)).toBe(false) // 24 >= threshold 24
    expect(isProductLowStock(thin, rsl, 30)).toBe(true)
  })
})

// Game-day usage comes out of one matchmaker's stock (TASK-69.8): by default
// the person recording it, but only if they actually hold that brand.
describe('deductUsage', () => {
  const twelve = makeProduct({ id: 'p1', shuttlesPerBarrel: 12 })

  it('opens a barrel into loose shuttles', () => {
    expect(deductUsage(twelve, { barrels: 1, looseShuttles: 0 }, 4)).toEqual({
      barrels: 0,
      looseShuttles: 8,
    })
  })

  it('takes from loose before opening the next barrel', () => {
    expect(deductUsage(twelve, { barrels: 2, looseShuttles: 5 }, 3)).toEqual({
      barrels: 2,
      looseShuttles: 2,
    })
  })

  it('spans several barrels when a lot is used', () => {
    // 3 barrels + 2 loose = 38; using 20 leaves 18 = 1 barrel + 6 loose.
    expect(deductUsage(twelve, { barrels: 3, looseShuttles: 2 }, 20)).toEqual({
      barrels: 1,
      looseShuttles: 6,
    })
  })

  it('can empty the holder exactly', () => {
    expect(deductUsage(twelve, { barrels: 1, looseShuttles: 0 }, 12)).toEqual({
      barrels: 0,
      looseShuttles: 0,
    })
  })

  it('refuses to take more than the holder has', () => {
    expect(deductUsage(twelve, { barrels: 1, looseShuttles: 0 }, 13)).toBeNull()
  })

  it('rejects a negative count', () => {
    expect(deductUsage(twelve, { barrels: 1, looseShuttles: 0 }, -1)).toBeNull()
  })
})

describe('defaultUsageHolder / holdersOfProduct', () => {
  const rslProduct = makeProduct({ id: 'p1', brand: 'RSL', shuttlesPerBarrel: 12 })

  it('defaults to the signed-in matchmaker when they hold the product', () => {
    expect(defaultUsageHolder(split, rslProduct, 'h1')?.name).toBe('Ramboo')
  })

  it('gives no default when they hold none of it — the caller must ask', () => {
    const victorProduct = makeProduct({ id: 'p2', brand: 'Victor' })
    // Ramboo (h1) holds no Victor in the split fixture.
    expect(defaultUsageHolder(split, victorProduct, 'h1')).toBeUndefined()
  })

  it('gives no default when nobody is signed in as a holder', () => {
    expect(defaultUsageHolder(split, rslProduct, undefined)).toBeUndefined()
  })

  it('lists every holder of the product as an override candidate', () => {
    expect(holdersOfProduct(split, rslProduct).map((h) => h.name)).toEqual([
      'Ramboo',
      'Kasun',
    ])
  })
})
