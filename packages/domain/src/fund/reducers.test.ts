import { describe, it, expect } from 'vitest'
import { addProduct, deleteTransaction, recordUsage, emptyFundState } from './reducers'
import { productShuttleCount, remainingFund, totalShuttlesInStock } from './calc'

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
  it('usage: returns shuttles to stock and undoes the payment', () => {
    const s = seeded()
    const productId = s.products[0].id
    const used = recordUsage(s, '2026-01-02', [{ productId, shuttlesUsed: 6 }])
    const usageId = used.usage[0].id
    const reverted = deleteTransaction(used, { kind: 'usage', id: usageId })
    expect(totalShuttlesInStock(reverted)).toBe(12)
    expect(remainingFund(reverted)).toBe(remainingFund(s))
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
})
