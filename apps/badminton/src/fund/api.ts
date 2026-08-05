// Fund/inventory data access (E06). Reads assemble a domain FundState from the
// admin-scoped tables (RLS already limits rows to the caller's club); writes are
// discrete inserts/updates. All money/date mapping mirrors the DB column shapes.

import type { FundState, Product, StockHolder } from '@gameon/domain'
import { supabase } from '@gameon/supabase'

export interface FundData {
  clubId: string
  state: FundState
  /** Identity of the signed-in admin, stamped onto new transactions. */
  loggerLabel?: string
  /** Auth id of the signed-in user — resolves which matchmaker is "me". */
  userId?: string
  /** Roster size (player_profiles) for this club. */
  playerCount: number
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

  const [
    members,
    contributions,
    products,
    purchases,
    usageEntries,
    usageItems,
    expenses,
    holders,
    holdings,
    players,
  ] = await Promise.all([
    db.from('members').select('*'),
    db.from('contributions').select('*'),
    db.from('products').select('*'),
    db.from('purchases').select('*'),
    db.from('usage_entries').select('*'),
    db.from('usage_items').select('*'),
    db.from('expenses').select('*'),
    db
      .from('player_profiles')
      .select('id, nickname, user_id')
      .eq('club_id', clubId)
      .eq('is_matchmaker', true),
    db.from('holdings').select('*'),
    db
      .from('player_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId),
  ])
  const playerCount = players.count ?? 0

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

  // Resolve the signed-in admin to their member name (falls back to email).
  const email = user?.email
  const me = email
    ? (members.data ?? []).find((m) => m.email?.toLowerCase() === email.toLowerCase())
    : undefined
  const loggerLabel = me?.name ?? email ?? undefined

  const state: FundState = {
    members: (members.data ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email ?? undefined,
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
    // Barrels live with the matchmakers who run game days (TASK-69).
    holders: (holders.data ?? [])
      .map((h) => ({
        id: h.id,
        name: h.nickname,
        userId: h.user_id ?? undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    holdings: (holdings.data ?? []).map((h) => ({
      productId: h.product_id,
      holderId: h.holder_id,
      barrels: h.barrels,
      looseShuttles: h.loose_shuttles,
    })),
  }

  return { clubId, state, loggerLabel, userId: user?.id, playerCount }
}

// ---------------------------------------------------------------------------
// Stock writes. These bypass the whole-state diff in sync.ts: a stock change
// must also append an audit entry recording who made it, which a state diff
// cannot express (it sees only the before/after counts, not the actor). Each
// change is therefore written directly here.
// ---------------------------------------------------------------------------

export type InventoryAction = 'allocate' | 'adjust' | 'transfer' | 'usage'

export interface StockChangeInput {
  clubId: string
  actorUserId?: string
  /** Display label of the admin making the change, for a readable audit trail. */
  actorName?: string
  holder: StockHolder
  product: Product
  /** Counts this matchmaker holds after the change. */
  barrels: number
  looseShuttles: number
  /** Counts before the change — recorded as the delta in the audit log. */
  prevBarrels: number
  prevLooseShuttles: number
  action: InventoryAction
  note?: string
}

/**
 * Pure mapping from a stock change to the two rows it writes: the updated
 * holding and its audit-log entry. Kept separate from the I/O so the mapping
 * (especially the deltas and the denormalised names) is unit-testable.
 */
export function buildStockChange(input: StockChangeInput) {
  const holding = {
    club_id: input.clubId,
    product_id: input.product.id,
    holder_id: input.holder.id,
    barrels: input.barrels,
    loose_shuttles: input.looseShuttles,
    updated_at: new Date().toISOString(),
  }
  const log = {
    club_id: input.clubId,
    actor_user_id: input.actorUserId ?? null,
    actor_name: input.actorName ?? null,
    holder_id: input.holder.id,
    product_id: input.product.id,
    // Denormalised so the history still reads correctly if the holder or
    // product is later removed.
    holder_name: input.holder.name,
    product_label: `${input.product.brand} ${input.product.model}`.trim(),
    action: input.action,
    barrels_delta: input.barrels - input.prevBarrels,
    loose_delta: input.looseShuttles - input.prevLooseShuttles,
    barrels_after: input.barrels,
    loose_after: input.looseShuttles,
    note: input.note ?? null,
  }
  return { holding, log }
}

/** Apply a stock change: upsert the holding, then append the audit entry. */
export async function saveStockChange(input: StockChangeInput): Promise<void> {
  const db = client()
  const { holding, log } = buildStockChange(input)

  const { error: hErr } = await db
    .from('holdings')
    .upsert(holding, { onConflict: 'product_id,holder_id' })
  if (hErr) throw hErr

  // The log is append-only and never blocks the stock change itself, but a
  // failure here means an unaudited change — surface it rather than swallow it.
  const { error: lErr } = await db.from('inventory_log').insert(log)
  if (lErr) throw lErr
}

export interface TransferInput {
  clubId: string
  actorUserId?: string
  actorName?: string
  product: Product
  from: StockHolder
  to: StockHolder
  /** Counts moving from one matchmaker to the other. */
  barrels: number
  looseShuttles: number
  fromBarrels: number
  fromLooseShuttles: number
  toBarrels: number
  toLooseShuttles: number
  note?: string
}

/**
 * Hand barrels from one matchmaker to another. Written as two stock changes so
 * both sides of the move are audited: the giver's holding goes down and the
 * receiver's goes up by the same amount.
 */
export async function transferStock(input: TransferInput): Promise<void> {
  const common = {
    clubId: input.clubId,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    product: input.product,
    action: 'transfer' as const,
  }
  const note = input.note ?? `Transferred to ${input.to.name}`

  await saveStockChange({
    ...common,
    holder: input.from,
    barrels: input.fromBarrels - input.barrels,
    looseShuttles: input.fromLooseShuttles - input.looseShuttles,
    prevBarrels: input.fromBarrels,
    prevLooseShuttles: input.fromLooseShuttles,
    note,
  })
  await saveStockChange({
    ...common,
    holder: input.to,
    barrels: input.toBarrels + input.barrels,
    looseShuttles: input.toLooseShuttles + input.looseShuttles,
    prevBarrels: input.toBarrels,
    prevLooseShuttles: input.toLooseShuttles,
    note: `Received from ${input.from.name}`,
  })
}

/**
 * Remove a matchmaker's stock record for one product. The holding row goes, but
 * an audit entry stays: the log is the history of what happened, so a removal
 * has to be recorded rather than vanish.
 */
export async function deleteHolding(input: {
  clubId: string
  actorUserId?: string
  actorName?: string
  holder: StockHolder
  product: Product
  prevBarrels: number
  prevLooseShuttles: number
  note?: string
}): Promise<void> {
  const db = client()

  const { error: lErr } = await db.from('inventory_log').insert({
    club_id: input.clubId,
    actor_user_id: input.actorUserId ?? null,
    actor_name: input.actorName ?? null,
    holder_id: input.holder.id,
    product_id: input.product.id,
    holder_name: input.holder.name,
    product_label: `${input.product.brand} ${input.product.model}`.trim(),
    action: 'adjust',
    barrels_delta: -input.prevBarrels,
    loose_delta: -input.prevLooseShuttles,
    barrels_after: 0,
    loose_after: 0,
    note: input.note ?? 'Removed the stock record',
  })
  if (lErr) throw lErr

  const { error } = await db
    .from('holdings')
    .delete()
    .eq('product_id', input.product.id)
    .eq('holder_id', input.holder.id)
  if (error) throw error
}

export interface InventoryLogEntry {
  id: string
  holderName: string
  productLabel: string
  action: string
  barrelsDelta: number
  looseDelta: number
  note?: string
  occurredAt: string
  actorUserId?: string
  actorName?: string
}

/** Recent stock changes, newest first, for the audit-log view. */
export async function loadInventoryLog(limit = 20): Promise<InventoryLogEntry[]> {
  const db = client()
  const { data, error } = await db
    .from('inventory_log')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    holderName: r.holder_name,
    productLabel: r.product_label,
    action: r.action,
    barrelsDelta: r.barrels_delta,
    looseDelta: r.loose_delta,
    note: r.note ?? undefined,
    occurredAt: r.occurred_at,
    actorUserId: r.actor_user_id ?? undefined,
    actorName: r.actor_name ?? undefined,
  }))
}

// ---------------------------------------------------------------------------
// Matchmaker view. loadFund() is admin-gated (it starts from the admins table),
// so a matchmaker needs their own narrow read: just the stock in their hands.
// RLS backs this up — matchmakers may SELECT holdings and products, nothing more.
// ---------------------------------------------------------------------------

export interface MyStockItem {
  productId: string
  brand: string
  model: string
  barrels: number
  looseShuttles: number
  shuttles: number
}

export interface MyStock {
  holderName: string
  items: MyStockItem[]
  totalShuttles: number
}

/** The signed-in matchmaker's own stock. Null when they hold none / aren't one. */
export async function loadMyStock(): Promise<MyStock | null> {
  const db = client()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return null

  const { data: profile } = await db
    .from('player_profiles')
    .select('id, nickname, is_matchmaker')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_matchmaker) return null

  const [{ data: holdings }, { data: products }] = await Promise.all([
    db.from('holdings').select('*').eq('holder_id', profile.id),
    db.from('products').select('*'),
  ])

  const byId = new Map((products ?? []).map((p) => [p.id, p]))
  const items: MyStockItem[] = []
  for (const h of holdings ?? []) {
    const p = byId.get(h.product_id)
    if (!p) continue
    if (h.barrels === 0 && h.loose_shuttles === 0) continue
    items.push({
      productId: p.id,
      brand: p.brand,
      model: p.model,
      barrels: h.barrels,
      looseShuttles: h.loose_shuttles,
      shuttles: h.barrels * p.shuttles_per_barrel + h.loose_shuttles,
    })
  }
  items.sort((a, b) => a.brand.localeCompare(b.brand))

  return {
    holderName: profile.nickname,
    items,
    totalShuttles: items.reduce((s, i) => s + i.shuttles, 0),
  }
}
