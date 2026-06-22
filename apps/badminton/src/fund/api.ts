// Fund/inventory data access (E06). Reads assemble a domain FundState from the
// admin-scoped tables (RLS already limits rows to the caller's club); writes are
// discrete inserts/updates. All money/date mapping mirrors the DB column shapes.

import type { FundState } from '@gameon/domain'
import { supabase } from '@gameon/supabase'

export interface FundData {
  clubId: string
  state: FundState
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

/** Naive wall-clock strings round-trip through timestamptz unchanged. */
const fromDb = (iso: string) => iso.slice(0, 16)

/** Load the admin's club id + full fund state. Null when not an admin. */
export async function loadFund(): Promise<FundData | null> {
  const db = client()

  const { data: admin } = await db.from('admins').select('club_id').limit(1).maybeSingle()
  if (!admin) return null
  const clubId = admin.club_id

  const [
    members,
    contributions,
    products,
    purchases,
    usageEntries,
    usageItems,
    expenses,
  ] = await Promise.all([
    db.from('members').select('*'),
    db.from('contributions').select('*'),
    db.from('products').select('*'),
    db.from('purchases').select('*'),
    db.from('usage_entries').select('*'),
    db.from('usage_items').select('*'),
    db.from('expenses').select('*'),
  ])

  const contribByMember = new Map<string, NonNullable<typeof contributions.data>>()
  for (const c of contributions.data ?? []) {
    const list = contribByMember.get(c.member_id) ?? []
    list.push(c)
    contribByMember.set(c.member_id, list)
  }
  const itemsByUsage = new Map<string, NonNullable<typeof usageItems.data>>()
  for (const i of usageItems.data ?? []) {
    const list = itemsByUsage.get(i.usage_id) ?? []
    list.push(i)
    itemsByUsage.set(i.usage_id, list)
  }

  const state: FundState = {
    members: (members.data ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      contributions: (contribByMember.get(m.id) ?? []).map((c) => ({
        id: c.id,
        amount: Number(c.amount),
        date: fromDb(c.occurred_at),
      })),
    })),
    products: (products.data ?? []).map((p) => ({
      id: p.id,
      brand: p.brand,
      model: p.model,
      shuttlesPerBarrel: p.shuttles_per_barrel,
      barrels: p.barrels,
      looseShuttles: p.loose_shuttles,
    })),
    purchases: (purchases.data ?? []).map((p) => ({
      id: p.id,
      productId: p.product_id,
      barrels: p.barrels,
      pricePerBarrel: Number(p.price_per_barrel),
      date: fromDb(p.occurred_at),
      note: p.note ?? undefined,
    })),
    usage: (usageEntries.data ?? []).map((u) => ({
      id: u.id,
      date: fromDb(u.occurred_at),
      items: (itemsByUsage.get(u.id) ?? []).map((i) => ({
        productId: i.product_id,
        shuttlesUsed: i.shuttles_used,
      })),
    })),
    expenses: (expenses.data ?? []).map((e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      date: fromDb(e.occurred_at),
    })),
  }

  return { clubId, state }
}

// ---- writes ----------------------------------------------------------------

export async function addMember(clubId: string, name: string) {
  const { error } = await client().from('members').insert({ club_id: clubId, name })
  if (error) throw error
}

export async function addContribution(clubId: string, memberId: string, amount: number) {
  const { error } = await client()
    .from('contributions')
    .insert({ club_id: clubId, member_id: memberId, amount })
  if (error) throw error
}

export async function addProduct(
  clubId: string,
  p: { brand: string; model: string; shuttlesPerBarrel: number },
) {
  const { error } = await client().from('products').insert({
    club_id: clubId,
    brand: p.brand,
    model: p.model,
    shuttles_per_barrel: p.shuttlesPerBarrel,
  })
  if (error) throw error
}

/** Record a barrel purchase and add the barrels to stock. */
export async function addPurchase(
  clubId: string,
  p: {
    productId: string
    barrels: number
    pricePerBarrel: number
    currentBarrels: number
  },
) {
  const db = client()
  const { error } = await db.from('purchases').insert({
    club_id: clubId,
    product_id: p.productId,
    barrels: p.barrels,
    price_per_barrel: p.pricePerBarrel,
  })
  if (error) throw error
  const { error: stockErr } = await db
    .from('products')
    .update({ barrels: p.currentBarrels + p.barrels })
    .eq('id', p.productId)
  if (stockErr) throw stockErr
}

export async function addExpense(clubId: string, description: string, amount: number) {
  const { error } = await client()
    .from('expenses')
    .insert({ club_id: clubId, description, amount })
  if (error) throw error
}

/** Log a game day's usage for a single product (one entry + one item). */
export async function logUsage(clubId: string, productId: string, shuttlesUsed: number) {
  const db = client()
  const { data: entry, error } = await db
    .from('usage_entries')
    .insert({ club_id: clubId })
    .select('id')
    .single()
  if (error) throw error
  const { error: itemErr } = await db
    .from('usage_items')
    .insert({
      club_id: clubId,
      usage_id: entry.id,
      product_id: productId,
      shuttles_used: shuttlesUsed,
    })
  if (itemErr) throw itemErr
}
