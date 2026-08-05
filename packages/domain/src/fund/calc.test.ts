import { describe, it, expect } from 'vitest'
import {
  avgBarrelPrice,
  costPerGameDay,
  costPerShuttle,
  gameDaysRecorded,
  euro,
  isLowStock,
  memberBalances,
  productShuttleCount,
  remainingFund,
  totalCollected,
  totalExpenses,
  totalPurchases,
  shuttlesPerGameDay,
  totalShuttlesInStock,
  totalShuttlesUsed,
  totalSpent,
  totalUsageIncome,
  usageForDate,
  usageHistory,
} from './calc'
import { makeMember, makeProduct, makePurchase, makeState } from './fixtures'

describe('euro', () => {
  it('formats a number with two decimals and a euro sign', () => {
    expect(euro(12)).toBe('12.00 €')
    expect(euro(3.5)).toBe('3.50 €')
  })
})

describe('totalCollected', () => {
  it('sums every member contribution', () => {
    const state = makeState({
      members: [
        makeMember({
          id: 'm1',
          contributions: [{ id: 'c1', amount: 200, date: '2026-01-01' }],
        }),
        makeMember({
          id: 'm2',
          contributions: [
            { id: 'c2', amount: 100, date: '2026-01-01' },
            { id: 'c3', amount: 50, date: '2026-01-02' },
          ],
        }),
      ],
    })
    expect(totalCollected(state)).toBe(350)
  })
})

describe('totalPurchases / totalExpenses', () => {
  it('values purchases as barrels times price per barrel', () => {
    const state = makeState({
      purchases: [
        makePurchase({ barrels: 10, pricePerBarrel: 24 }),
        makePurchase({ id: 'pu2', barrels: 2, pricePerBarrel: 30 }),
      ],
    })
    expect(totalPurchases(state)).toBe(300)
  })

  it('sums other expenses', () => {
    const state = makeState({
      expenses: [
        { id: 'e1', description: 'boxes', amount: 16.5, date: '2026-01-01' },
        { id: 'e2', description: 'net', amount: 3.5, date: '2026-01-02' },
      ],
    })
    expect(totalExpenses(state)).toBe(20)
  })
})

describe('totalSpent', () => {
  it('adds purchases and expenses together', () => {
    const state = makeState({
      purchases: [makePurchase({ barrels: 10, pricePerBarrel: 24 })], // 240
      expenses: [{ id: 'e1', description: 'boxes', amount: 10, date: '2026-01-01' }],
    })
    expect(totalSpent(state)).toBe(250)
  })
})

describe('avgBarrelPrice', () => {
  it('blends batch prices weighted by barrels', () => {
    const state = makeState({
      purchases: [
        makePurchase({ id: 'a', barrels: 10, pricePerBarrel: 20 }),
        makePurchase({ id: 'b', barrels: 10, pricePerBarrel: 30 }),
      ],
    })
    expect(avgBarrelPrice(state, 'p1')).toBe(25)
  })

  it('returns 0 when the product has no barrels', () => {
    expect(avgBarrelPrice(makeState(), 'p1')).toBe(0)
  })
})

describe('costPerShuttle', () => {
  it('divides the average barrel price by shuttles per barrel', () => {
    const product = makeProduct({ shuttlesPerBarrel: 12 })
    const state = makeState({
      products: [product],
      purchases: [makePurchase({ barrels: 1, pricePerBarrel: 24 })],
    })
    expect(costPerShuttle(state, product)).toBe(2)
  })

  it('returns 0 when shuttles per barrel is 0', () => {
    const product = makeProduct({ shuttlesPerBarrel: 0 })
    expect(costPerShuttle(makeState({ products: [product] }), product)).toBe(0)
  })
})

describe('productShuttleCount', () => {
  it('counts full barrels plus loose shuttles', () => {
    expect(
      productShuttleCount(
        makeProduct({ barrels: 3, shuttlesPerBarrel: 12, looseShuttles: 5 }),
      ),
    ).toBe(41)
  })
})

describe('isLowStock', () => {
  it('flags a product below the threshold', () => {
    expect(
      isLowStock(makeProduct({ barrels: 1, shuttlesPerBarrel: 12, looseShuttles: 0 })),
    ).toBe(true)
  })

  it('does not flag a well-stocked product', () => {
    expect(isLowStock(makeProduct({ barrels: 5, shuttlesPerBarrel: 12 }))).toBe(false)
  })

  it('honours a custom threshold', () => {
    const product = makeProduct({ barrels: 5, shuttlesPerBarrel: 12 }) // 60 shuttles
    expect(isLowStock(product, 100)).toBe(true)
    expect(isLowStock(product, 50)).toBe(false)
  })
})

describe('totalShuttlesUsed', () => {
  it('sums shuttles across every game day', () => {
    const state = makeState({
      usage: [
        {
          id: 'u1',
          date: '2026-01-02',
          items: [
            { productId: 'p1', shuttlesUsed: 4 },
            { productId: 'p2', shuttlesUsed: 2 },
          ],
        },
        { id: 'u2', date: '2026-01-03', items: [{ productId: 'p1', shuttlesUsed: 3 }] },
      ],
    })
    expect(totalShuttlesUsed(state)).toBe(9)
  })
})

describe('per game day (TASK-76.4)', () => {
  // 24 € a barrel over 12 shuttles is 2 € a shuttle; 9 shuttles over 2 game
  // days is 4.5 a day, so 9 € a day.
  const state = makeState({
    products: [makeProduct({ id: 'p1', shuttlesPerBarrel: 12 })],
    purchases: [makePurchase({ productId: 'p1', barrels: 10, pricePerBarrel: 24 })],
    usage: [
      { id: 'u1', date: '2026-01-02', items: [{ productId: 'p1', shuttlesUsed: 6 }] },
      { id: 'u2', date: '2026-01-03', items: [{ productId: 'p1', shuttlesUsed: 3 }] },
    ],
  })

  it('counts a game day per usage entry', () => {
    expect(gameDaysRecorded(state)).toBe(2)
  })

  it('averages shuttles and cost over the game days recorded', () => {
    expect(shuttlesPerGameDay(state)).toBe(4.5)
    expect(costPerGameDay(state)).toBe(9)
  })

  it('values a day on the same basis as usage income, so the two agree', () => {
    expect(costPerGameDay(state) * gameDaysRecorded(state)).toBeCloseTo(
      totalUsageIncome(state),
    )
  })

  it('reads zero with nothing recorded rather than dividing by zero', () => {
    const empty = makeState({ usage: [] })
    expect(shuttlesPerGameDay(empty)).toBe(0)
    expect(costPerGameDay(empty)).toBe(0)
  })
})

describe('totalShuttlesInStock', () => {
  it('sums shuttles across products', () => {
    const state = makeState({
      products: [
        makeProduct({ id: 'p1', barrels: 1, shuttlesPerBarrel: 12, looseShuttles: 0 }),
        makeProduct({ id: 'p2', barrels: 0, shuttlesPerBarrel: 12, looseShuttles: 3 }),
      ],
    })
    expect(totalShuttlesInStock(state)).toBe(15)
  })
})

describe('totalUsageIncome & remainingFund', () => {
  it('values usage at cost per shuttle and balances the fund', () => {
    const product = makeProduct({ id: 'p1', shuttlesPerBarrel: 12, barrels: 10 })
    const state = makeState({
      members: [
        makeMember({ contributions: [{ id: 'c1', amount: 200, date: '2026-01-01' }] }),
      ],
      products: [product],
      purchases: [makePurchase({ productId: 'p1', barrels: 10, pricePerBarrel: 24 })],
      expenses: [{ id: 'e1', description: 'boxes', amount: 10, date: '2026-01-01' }],
      usage: [
        { id: 'u1', date: '2026-01-02', items: [{ productId: 'p1', shuttlesUsed: 6 }] },
      ],
    })
    // cost per shuttle = 24/12 = 2; usage income = 6 * 2 = 12
    expect(totalUsageIncome(state)).toBe(12)
    // 200 collected + 12 usage - (240 purchases + 10 expenses) = -38
    expect(remainingFund(state)).toBe(-38)
  })
})

describe('memberBalances', () => {
  it('splits spending equally across members', () => {
    const state = makeState({
      members: [
        makeMember({
          id: 'm1',
          name: 'A',
          contributions: [{ id: 'c1', amount: 200, date: '2026-01-01' }],
        }),
        makeMember({
          id: 'm2',
          name: 'B',
          contributions: [{ id: 'c2', amount: 100, date: '2026-01-01' }],
        }),
      ],
      expenses: [{ id: 'e1', description: 'x', amount: 50, date: '2026-01-01' }],
    })
    const balances = memberBalances(state)
    expect(balances[0]).toMatchObject({ name: 'A', starting: 200, spent: 25, left: 175 })
    expect(balances[1]).toMatchObject({ name: 'B', starting: 100, spent: 25, left: 75 })
  })

  it('credits game-day usage income against the split and reconciles with the fund', () => {
    const product = makeProduct({ id: 'p1', shuttlesPerBarrel: 12 })
    const state = makeState({
      members: [
        makeMember({
          id: 'm1',
          name: 'A',
          contributions: [{ id: 'c1', amount: 200, date: '2026-01-01' }],
        }),
        makeMember({
          id: 'm2',
          name: 'B',
          contributions: [{ id: 'c2', amount: 200, date: '2026-01-01' }],
        }),
      ],
      products: [product],
      purchases: [makePurchase({ productId: 'p1', barrels: 1, pricePerBarrel: 24 })], // spent 24
      usage: [
        { id: 'u1', date: '2026-01-02', items: [{ productId: 'p1', shuttlesUsed: 6 }] },
      ], // income 12
    })
    // net spent = 24 − 12 = 12; split across 2 = 6 each
    const balances = memberBalances(state)
    expect(balances[0]).toMatchObject({ starting: 200, spent: 6, left: 194 })
    // member balances always sum to the remaining fund
    const sumLeft = balances.reduce((s, b) => s + b.left, 0)
    expect(sumLeft).toBeCloseTo(remainingFund(state))
  })
})

describe('usageForDate', () => {
  it('aggregates a single day of usage with cost', () => {
    const product = makeProduct({ id: 'p1', shuttlesPerBarrel: 12 })
    const state = makeState({
      products: [product],
      purchases: [makePurchase({ productId: 'p1', barrels: 1, pricePerBarrel: 24 })],
      usage: [
        { id: 'u1', date: '2026-01-02', items: [{ productId: 'p1', shuttlesUsed: 4 }] },
        { id: 'u2', date: '2026-01-03', items: [{ productId: 'p1', shuttlesUsed: 2 }] },
      ],
    })
    const totals = usageForDate(state, '2026-01-02')
    expect(totals.totalCost).toBe(8) // 4 shuttles * 2
    expect(totals.perProduct[0].shuttlesUsed).toBe(4)
  })

  it('aggregates every day when no date is given', () => {
    const product = makeProduct({ id: 'p1', shuttlesPerBarrel: 12 })
    const state = makeState({
      products: [product],
      purchases: [makePurchase({ productId: 'p1', barrels: 1, pricePerBarrel: 24 })],
      usage: [
        { id: 'u1', date: '2026-01-02', items: [{ productId: 'p1', shuttlesUsed: 4 }] },
        { id: 'u2', date: '2026-01-03', items: [{ productId: 'p1', shuttlesUsed: 2 }] },
      ],
    })
    const totals = usageForDate(state)
    expect(totals.perProduct[0].shuttlesUsed).toBe(6)
    expect(totals.totalCost).toBe(12) // 6 * 2
  })
})

describe('usageHistory', () => {
  it('lists game days newest-first with per-day cost and parts', () => {
    const product = makeProduct({ id: 'p1', brand: 'Yonex', model: 'AS-30', shuttlesPerBarrel: 12 })
    const state = makeState({
      products: [product],
      purchases: [makePurchase({ productId: 'p1', barrels: 1, pricePerBarrel: 24 })],
      usage: [
        { id: 'u1', date: '2026-01-02', items: [{ productId: 'p1', shuttlesUsed: 4 }] },
        { id: 'u2', date: '2026-01-05', items: [{ productId: 'p1', shuttlesUsed: 2 }] },
      ],
    })
    const history = usageHistory(state)
    expect(history.map((d) => d.id)).toEqual(['u2', 'u1']) // newest first
    expect(history[0]).toMatchObject({ totalShuttles: 2, totalCost: 4 })
    expect(history[1].parts).toEqual([{ name: 'Yonex AS-30', shuttlesUsed: 4 }])
  })
})
