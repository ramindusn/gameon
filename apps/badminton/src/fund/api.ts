// Fund/inventory data access (E06). Reads assemble a domain FundState from the
// admin-scoped tables (RLS already limits rows to the caller's club); writes are
// discrete inserts/updates. All money/date mapping mirrors the DB column shapes.

import type { FundState } from '@gameon/domain'
import { supabase } from '@gameon/supabase'

export interface FundData {
  clubId: string
  state: FundState
  /** Identity of the signed-in admin, stamped onto new transactions. */
  loggerLabel?: string
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

  const {
    data: { user },
  } = await db.auth.getUser()
  const loggerLabel = user?.email ?? undefined

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
        loggedBy: c.logged_by ?? undefined,
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
      loggedBy: p.logged_by ?? undefined,
    })),
    usage: (usageEntries.data ?? []).map((u) => ({
      id: u.id,
      date: fromDb(u.occurred_at),
      loggedBy: u.logged_by ?? undefined,
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
      loggedBy: e.logged_by ?? undefined,
    })),
  }

  return { clubId, state, loggerLabel }
}
