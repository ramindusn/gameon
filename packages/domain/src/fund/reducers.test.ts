import { describe, it, expect } from 'vitest'
import {
  addCash,
  addExpense,
  addMember,
  addProduct,
  deleteProduct,
  deleteTransaction,
  emptyFundState,
  recordUsage,
  updateBatchPrice,
  updateProduct,
} from './reducers'
import {
  productShuttleCount,
  remainingFund,
  totalCollected,
  totalExpenses,
  totalPurchases,
  totalShuttlesInStock,
} from './calc'

function seeded() {
  // One product: 1 barrel × 12 = 12 shuttles, bought at €24 (cost/shuttle = 2).
  return addProduct(emptyFundState(), {
    brand: 'Yonex',
    model: 'AS-30',
    shuttlesPerBarrel: 12,
    pricePerBarrel: 24,
    barrels: 1,
  })
}

describe('addProduct', () => {
  it('adds the product and an opening purchase batch', () => {
    const s = seeded()
    expect(s.products).toHaveLength(1)
    expect(s.purchases).toHaveLength(1)
    expect(totalShuttlesInStock(s)).toBe(12)
    expect(remainingFund(s)).toBe(-24) // fund drops by the purchase
  })

  it('trims brand/model and defaults the batch note', () => {
    const s = addProduct(emptyFundState(), {
      brand: '  Yonex  ',
      model: '  AS-30  ',
      shuttlesPerBarrel: 12,
      pricePerBarrel: 24,
      barrels: 1,
    })
    expect(s.products[0]).toMatchObject({ brand: 'Yonex', model: 'AS-30' })
    expect(s.purchases[0].note).toBe('New product stock')
  })

  it('records no opening batch when barrels is 0', () => {
    const s = addProduct(emptyFundState(), {
      brand: 'Victor',
      model: 'Master',
      shuttlesPerBarrel: 12,
      pricePerBarrel: 24,
      barrels: 0,
    })
    expect(s.products).toHaveLength(1)
    expect(s.purchases).toHaveLength(0)
    expect(remainingFund(s)).toBe(0)
  })

  it('does not mutate the input state', () => {
    const before = emptyFundState()
    addProduct(before, {
      brand: 'Yonex',
      model: 'AS-30',
      shuttlesPerBarrel: 12,
      pricePerBarrel: 24,
      barrels: 1,
    })
    expect(before.products).toHaveLength(0)
    expect(before.purchases).toHaveLength(0)
  })
})

describe('updateProduct', () => {
  it('corrects stock and description without touching the fund', () => {
    const s = seeded()
    const id = s.products[0].id
    const next = updateProduct(s, id, {
      brand: '  Li-Ning  ',
      model: '  A+90  ',
      shuttlesPerBarrel: 12,
      barrels: 3,
      looseShuttles: 4,
    })
    expect(next.products[0]).toMatchObject({ brand: 'Li-Ning', model: 'A+90' })
    expect(totalShuttlesInStock(next)).toBe(40) // 3*12 + 4
    expect(remainingFund(next)).toBe(remainingFund(s)) // fund unchanged
  })

  it('leaves other products untouched', () => {
    const s = seeded()
    const next = updateProduct(s, 'does-not-exist', {
      brand: 'X',
      model: 'Y',
      shuttlesPerBarrel: 12,
      barrels: 0,
      looseShuttles: 0,
    })
    expect(next.products).toEqual(s.products)
  })
})

describe('updateBatchPrice', () => {
  it('changes the fixed price of a batch and reprices the fund', () => {
    const s = seeded()
    const purchaseId = s.purchases[0].id
    const next = updateBatchPrice(s, purchaseId, 30)
    expect(next.purchases[0].pricePerBarrel).toBe(30)
    expect(remainingFund(next)).toBe(-30)
  })

  it('ignores a negative price (no-op)', () => {
    const s = seeded()
    expect(updateBatchPrice(s, s.purchases[0].id, -5)).toBe(s)
  })
})

describe('deleteProduct', () => {
  it('removes the product, its batches and its usage items', () => {
    let s = seeded()
    const id = s.products[0].id
    s = recordUsage(s, '2026-01-02', [{ productId: id, shuttlesUsed: 6 }])
    const next = deleteProduct(s, id)
    expect(next.products).toHaveLength(0)
    expect(next.purchases).toHaveLength(0)
    expect(next.usage).toHaveLength(0) // usage day had only this product, so it drops
    expect(remainingFund(next)).toBe(0)
  })

  it('keeps usage days that still have other products', () => {
    let s = seeded()
    const keep = s.products[0].id
    // add a second product + usage spanning both
    s = addProduct(s, {
      brand: 'Victor',
      model: 'Master',
      shuttlesPerBarrel: 12,
      pricePerBarrel: 24,
      barrels: 1,
    })
    const drop = s.products[1].id
    s = recordUsage(s, '2026-01-02', [
      { productId: keep, shuttlesUsed: 2 },
      { productId: drop, shuttlesUsed: 3 },
    ])
    const next = deleteProduct(s, drop)
    expect(next.products).toHaveLength(1)
    expect(next.usage).toHaveLength(1)
    expect(next.usage[0].items).toEqual([{ productId: keep, shuttlesUsed: 2 }])
  })
})

describe('addMember', () => {
  it('adds a member with an opening contribution', () => {
    const next = addMember(emptyFundState(), '  Bob  ', 150, '2026-01-01')
    expect(next.members).toHaveLength(1)
    expect(next.members[0].name).toBe('Bob')
    expect(totalCollected(next)).toBe(150)
  })

  it('adds a member with no contribution when initial cash is 0', () => {
    const next = addMember(emptyFundState(), 'Bob', 0)
    expect(next.members[0].contributions).toHaveLength(0)
    expect(totalCollected(next)).toBe(0)
  })
})

describe('addCash', () => {
  it('appends a contribution to an existing member', () => {
    let s = addMember(emptyFundState(), 'Bob', 100, '2026-01-01')
    const id = s.members[0].id
    s = addCash(s, id, 50, '2026-01-05')
    expect(s.members[0].contributions).toHaveLength(2)
    expect(totalCollected(s)).toBe(150)
  })

  it('ignores non-positive amounts (no-op)', () => {
    const s = addMember(emptyFundState(), 'Bob', 100)
    expect(addCash(s, s.members[0].id, 0)).toBe(s)
    expect(addCash(s, s.members[0].id, -10)).toBe(s)
  })
})

describe('addExpense', () => {
  it('adds an expense and lowers the fund', () => {
    const next = addExpense(emptyFundState(), '  nets  ', 20, '2026-01-01')
    expect(next.expenses[0].description).toBe('nets')
    expect(totalExpenses(next)).toBe(20)
    expect(remainingFund(next)).toBe(-20)
  })

  it('ignores non-positive amounts (no-op)', () => {
    const s = emptyFundState()
    expect(addExpense(s, 'x', 0)).toBe(s)
    expect(addExpense(s, 'x', -1)).toBe(s)
  })
})

describe('recordUsage', () => {
  it('is a no-op when no shuttles are actually used', () => {
    const s = seeded()
    const id = s.products[0].id
    expect(recordUsage(s, '2026-01-02', [{ productId: id, shuttlesUsed: 0 }])).toBe(s)
  })

  it('keeps only the positive items it logs', () => {
    const s = seeded()
    const id = s.products[0].id
    const next = recordUsage(s, '2026-01-02', [
      { productId: id, shuttlesUsed: 4 },
      { productId: id, shuttlesUsed: 0 },
    ])
    expect(next.usage[0].items).toEqual([{ productId: id, shuttlesUsed: 4 }])
  })
})

describe('recordUsage', () => {
  it('deducts shuttles from stock and credits usage income', () => {
    const s = seeded()
    const productId = s.products[0].id
    const next = recordUsage(s, '2026-01-02', [{ productId, shuttlesUsed: 6 }])
    expect(totalShuttlesInStock(next)).toBe(6)
    // usage income 6 × 2 = 12, so fund recovers from -24 to -12
    expect(remainingFund(next)).toBe(-12)
  })
})

describe('deleteTransaction', () => {
  it('contribution: removes the member cash and lowers the fund', () => {
    let s = addMember(emptyFundState(), 'Bob', 100, '2026-01-01')
    const memberId = s.members[0].id
    s = addCash(s, memberId, 50, '2026-01-05')
    const contributionId = s.members[0].contributions[1].id
    const reverted = deleteTransaction(s, {
      kind: 'contribution',
      memberId,
      id: contributionId,
    })
    expect(reverted.members[0].contributions).toHaveLength(1)
    expect(totalCollected(reverted)).toBe(100)
  })

  it('expense: removes the expense and restores the fund', () => {
    const s = addExpense(emptyFundState(), 'nets', 20, '2026-01-01')
    const id = s.expenses[0].id
    const reverted = deleteTransaction(s, { kind: 'expense', id })
    expect(reverted.expenses).toHaveLength(0)
    expect(totalExpenses(reverted)).toBe(0)
    expect(remainingFund(reverted)).toBe(0)
  })

  it('usage: returns shuttles to stock and undoes the payment', () => {
    const s = seeded()
    const productId = s.products[0].id
    const used = recordUsage(s, '2026-01-02', [{ productId, shuttlesUsed: 6 }])
    const usageId = used.usage[0].id
    const reverted = deleteTransaction(used, { kind: 'usage', id: usageId })
    expect(totalShuttlesInStock(reverted)).toBe(12)
    expect(remainingFund(reverted)).toBe(remainingFund(s))
  })

  // With per-matchmaker holdings the deduction was written against the holder's
  // row, so crediting the deprecated club-wide pool here put the shuttles where
  // no total reads them — the holder stayed short and the two figures drifted
  // apart (TASK-77). The API layer gives them back to the holder instead.
  it('usage: leaves the deprecated pool alone once holdings exist', () => {
    const s = seeded()
    const productId = s.products[0].id
    const used = recordUsage(s, '2026-01-02', [{ productId, shuttlesUsed: 6 }])
    const withHoldings = {
      ...used,
      holders: [{ id: 'h1', name: 'Ramboo' }],
      holdings: [{ productId, holderId: 'h1', barrels: 0, looseShuttles: 6 }],
    }
    const reverted = deleteTransaction(withHoldings, {
      kind: 'usage',
      id: used.usage[0].id,
    })
    expect(reverted.usage).toHaveLength(0)
    // products untouched — the holder's row is restored in the API layer.
    expect(reverted.products[0].barrels).toBe(used.products[0].barrels)
    expect(reverted.products[0].looseShuttles).toBe(used.products[0].looseShuttles)
  })

  it('purchase: last batch removed drops the product entirely', () => {
    const s = seeded()
    const purchaseId = s.purchases[0].id
    const reverted = deleteTransaction(s, { kind: 'purchase', id: purchaseId })
    expect(reverted.products).toHaveLength(0)
    expect(reverted.purchases).toHaveLength(0)
    expect(remainingFund(reverted)).toBe(0)
  })

  it('purchase: with other batches remaining, only removes that batch’s barrels', () => {
    let s = seeded()
    const productId = s.products[0].id
    // add a second batch to the same product via a manual purchase
    s = {
      ...s,
      purchases: [
        ...s.purchases,
        { id: 'b2', productId, barrels: 1, pricePerBarrel: 24, date: '2026-01-03' },
      ],
      products: s.products.map((p) => (p.id === productId ? { ...p, barrels: 2 } : p)),
    }
    const reverted = deleteTransaction(s, { kind: 'purchase', id: 'b2' })
    expect(reverted.products).toHaveLength(1)
    expect(productShuttleCount(reverted.products[0])).toBe(12) // back to 1 barrel
  })

  it('is a no-op for an unknown purchase id', () => {
    const s = seeded()
    const reverted = deleteTransaction(s, { kind: 'purchase', id: 'nope' })
    expect(reverted.products).toEqual(s.products)
    expect(reverted.purchases).toEqual(s.purchases)
  })

  it('does not mutate the input state', () => {
    const s = seeded()
    const before = totalPurchases(s)
    deleteTransaction(s, { kind: 'purchase', id: s.purchases[0].id })
    expect(s.purchases).toHaveLength(1)
    expect(totalPurchases(s)).toBe(before)
  })
})

describe('emptyFundState', () => {
  it('returns an empty, fresh snapshot each call', () => {
    const a = emptyFundState()
    const b = emptyFundState()
    expect(a).toEqual({
      members: [],
      products: [],
      purchases: [],
      usage: [],
      expenses: [],
      holders: [],
      holdings: [],
    })
    expect(a).not.toBe(b)
    expect(remainingFund(a)).toBe(0)
  })
})
