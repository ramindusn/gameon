import { describe, expect, it } from 'vitest'
import type { Product, StockHolder } from '@gameon/domain'
import { buildStockChange } from './api'

// A stock change writes two rows: the matchmaker's updated holding and an
// append-only audit entry recording who changed what (TASK-69).

const product: Product = {
  id: 'p1',
  brand: 'RSL',
  model: 'Classic Academy',
  shuttlesPerBarrel: 12,
  barrels: 0,
  looseShuttles: 0,
}
const holder: StockHolder = { id: 'h2', name: 'Kasun' }

const base = {
  clubId: 'club1',
  actorUserId: 'admin-1',
  holder,
  product,
  prevBarrels: 4,
  prevLooseShuttles: 2,
  action: 'adjust' as const,
}

describe('buildStockChange', () => {
  it('upserts the holding with the new absolute counts', () => {
    const { holding } = buildStockChange({ ...base, barrels: 6, looseShuttles: 5 })
    expect(holding).toMatchObject({
      club_id: 'club1',
      product_id: 'p1',
      holder_id: 'h2',
      barrels: 6,
      loose_shuttles: 5,
    })
  })

  it('records the delta and the resulting counts in the log', () => {
    const { log } = buildStockChange({ ...base, barrels: 6, looseShuttles: 5 })
    expect(log).toMatchObject({
      barrels_delta: 2, // 6 - 4
      loose_delta: 3, // 5 - 2
      barrels_after: 6,
      loose_after: 5,
      action: 'adjust',
    })
  })

  it('records a negative delta when stock is taken away', () => {
    const { log } = buildStockChange({ ...base, barrels: 1, looseShuttles: 0 })
    expect(log.barrels_delta).toBe(-3)
    expect(log.loose_delta).toBe(-2)
  })

  it('stamps the acting admin so the change is attributable', () => {
    const { log } = buildStockChange({ ...base, barrels: 4, looseShuttles: 2 })
    expect(log.actor_user_id).toBe('admin-1')
  })

  it('falls back to null actor when there is no session user', () => {
    const { log } = buildStockChange({
      ...base,
      actorUserId: undefined,
      barrels: 4,
      looseShuttles: 2,
    })
    expect(log.actor_user_id).toBeNull()
  })

  it('denormalises holder and product names so history survives deletion', () => {
    const { log } = buildStockChange({ ...base, barrels: 4, looseShuttles: 2 })
    expect(log.holder_name).toBe('Kasun')
    expect(log.product_label).toBe('RSL Classic Academy')
  })

  it('carries the action and an optional note', () => {
    const { log } = buildStockChange({
      ...base,
      action: 'allocate',
      barrels: 10,
      looseShuttles: 2,
      note: 'Handed 6 barrels over before the trip',
    })
    expect(log.action).toBe('allocate')
    expect(log.note).toBe('Handed 6 barrels over before the trip')
  })

  it('uses a null note when none is given', () => {
    expect(buildStockChange({ ...base, barrels: 4, looseShuttles: 2 }).log.note).toBeNull()
  })

  it('logs a zero delta when counts are unchanged (a no-op correction)', () => {
    const { log } = buildStockChange({ ...base, barrels: 4, looseShuttles: 2 })
    expect([log.barrels_delta, log.loose_delta]).toEqual([0, 0])
  })
})
