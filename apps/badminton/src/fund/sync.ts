// Persist a FundState change by diffing each table and applying the minimal set
// of upserts/deletes (ported from the prototype). The pure reducers in
// @gameon/domain remain the source of truth for logic; this mirrors the result
// to Supabase. Upserts run parents-first, deletes children-first (FKs cascade).

import type { FundState } from '@gameon/domain'
import { supabase } from '@gameon/supabase'

type Row = Record<string, unknown>

const toDb = (appDate: string) => appDate

function rowsFromState(state: FundState, clubId: string) {
  const members = state.members.map((m) => ({
    id: m.id,
    club_id: clubId,
    name: m.name,
    email: m.email ?? null,
  }))
  const contributions = state.members.flatMap((m) =>
    m.contributions.map((c) => ({
      id: c.id,
      club_id: clubId,
      member_id: m.id,
      amount: c.amount,
      occurred_at: toDb(c.date),
      logged_by: c.loggedBy ?? null,
    })),
  )
  const products = state.products.map((p) => ({
    id: p.id,
    club_id: clubId,
    brand: p.brand,
    model: p.model,
    shuttles_per_barrel: p.shuttlesPerBarrel,
    barrels: p.barrels,
    loose_shuttles: p.looseShuttles,
  }))
  const purchases = state.purchases.map((p) => ({
    id: p.id,
    club_id: clubId,
    product_id: p.productId,
    barrels: p.barrels,
    price_per_barrel: p.pricePerBarrel,
    occurred_at: toDb(p.date),
    note: p.note ?? null,
    logged_by: p.loggedBy ?? null,
  }))
  const usageEntries = state.usage.map((u) => ({
    id: u.id,
    club_id: clubId,
    occurred_at: toDb(u.date),
    logged_by: u.loggedBy ?? null,
  }))
  const usageItems = state.usage.flatMap((u) =>
    u.items.map((i) => ({
      club_id: clubId,
      usage_id: u.id,
      product_id: i.productId,
      shuttles_used: i.shuttlesUsed,
    })),
  )
  const expenses = state.expenses.map((e) => ({
    id: e.id,
    club_id: clubId,
    description: e.description,
    amount: e.amount,
    occurred_at: toDb(e.date),
    logged_by: e.loggedBy ?? null,
  }))
  return {
    members,
    contributions,
    products,
    purchases,
    usageEntries,
    usageItems,
    expenses,
  }
}

// Dynamic table names defeat the typed client's literal inference; this data
// layer is the one place we intentionally treat rows generically.
type Table =
  | 'members'
  | 'contributions'
  | 'products'
  | 'purchases'
  | 'usage_entries'
  | 'expenses'
function db() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (t: string) => db().from(t as any) as any

async function upsert(table: Table, prev: Row[], next: Row[]) {
  const prevById = new Map(prev.map((r) => [r.id as string, JSON.stringify(r)]))
  const changed = next.filter((r) => prevById.get(r.id as string) !== JSON.stringify(r))
  if (changed.length === 0) return
  const { error } = await from(table).upsert(changed)
  if (error) throw new Error(`${table} upsert: ${error.message}`)
}

async function remove(table: Table, prev: Row[], next: Row[]) {
  const nextIds = new Set(next.map((r) => r.id as string))
  const removed = prev
    .filter((r) => !nextIds.has(r.id as string))
    .map((r) => r.id as string)
  if (removed.length === 0) return
  const { error } = await from(table).delete().in('id', removed)
  if (error) throw new Error(`${table} delete: ${error.message}`)
}

const itemKey = (r: Row) => `${r.usage_id as string}:${r.product_id as string}`

async function upsertUsageItems(prev: Row[], next: Row[]) {
  const prevByKey = new Map(prev.map((r) => [itemKey(r), JSON.stringify(r)]))
  const changed = next.filter((r) => prevByKey.get(itemKey(r)) !== JSON.stringify(r))
  if (changed.length === 0) return
  const { error } = await from('usage_items').upsert(changed, {
    onConflict: 'usage_id,product_id',
  })
  if (error) throw new Error(`usage_items upsert: ${error.message}`)
}

async function removeUsageItems(prev: Row[], next: Row[]) {
  const nextKeys = new Set(next.map(itemKey))
  const removed = prev.filter((r) => !nextKeys.has(itemKey(r)))
  for (const r of removed) {
    const { error } = await from('usage_items')
      .delete()
      .eq('usage_id', r.usage_id as string)
      .eq('product_id', r.product_id as string)
    if (error) throw new Error(`usage_items delete: ${error.message}`)
  }
}

/** Persist the change from `prev` to `next` as a minimal set of writes. */
export async function syncState(
  clubId: string,
  prev: FundState,
  next: FundState,
): Promise<void> {
  const a = rowsFromState(prev, clubId)
  const b = rowsFromState(next, clubId)

  // Upserts: parents -> children
  await upsert('members', a.members, b.members)
  await upsert('products', a.products, b.products)
  await upsert('contributions', a.contributions, b.contributions)
  await upsert('purchases', a.purchases, b.purchases)
  await upsert('usage_entries', a.usageEntries, b.usageEntries)
  await upsert('expenses', a.expenses, b.expenses)
  await upsertUsageItems(a.usageItems, b.usageItems)

  // Deletes: children -> parents
  await remove('contributions', a.contributions, b.contributions)
  await removeUsageItems(a.usageItems, b.usageItems)
  await remove('purchases', a.purchases, b.purchases)
  await remove('usage_entries', a.usageEntries, b.usageEntries)
  await remove('expenses', a.expenses, b.expenses)
  await remove('products', a.products, b.products)
  await remove('members', a.members, b.members)
}
