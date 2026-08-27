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
      note: u.note ?? undefined,
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
 * Apply a stock change. The holding write and its audit row happen inside
 * change_stock() so they cannot come apart (TASK-79) — as two client calls the
 * stock could move with nothing recording it. Labels are derived in the
 * database, so the history cannot disagree with the rows it describes.
 */
export async function saveStockChange(input: StockChangeInput): Promise<void> {
  const db = client()
  const { error } = await db.rpc('change_stock', {
    p_holder_id: input.holder.id,
    p_product_id: input.product.id,
    p_barrels: input.barrels,
    p_loose: input.looseShuttles,
    p_action: input.action === 'allocate' ? 'allocate' : 'adjust',
    p_note: input.note ?? undefined,
  })
  if (error) throw error
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
 * Hand barrels from one matchmaker to another. Both sides move in a single
 * transaction inside transfer_stock(): as two separate saves the giver could be
 * debited without the receiver being credited (TASK-79).
 */
export async function transferStock(input: TransferInput): Promise<void> {
  const db = client()
  const { error } = await db.rpc('transfer_stock', {
    p_product_id: input.product.id,
    p_from_id: input.from.id,
    p_to_id: input.to.id,
    p_barrels: input.barrels,
    p_loose: input.looseShuttles,
    p_note: input.note ?? undefined,
  })
  if (error) throw error
}

/**
 * Remove a matchmaker's stock record for one product. The holding row goes, but
 * an audit entry stays: the log is the history of what happened, so a removal
 * has to be recorded rather than vanish. Both happen inside delete_holding().
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
  const { error } = await db.rpc('delete_holding', {
    p_holder_id: input.holder.id,
    p_product_id: input.product.id,
    p_note: input.note ?? undefined,
  })
  if (error) throw error
}

export interface InventoryLogEntry {
  id: string
  /** Lets the log convert barrels+loose into the shuttle count people think in. */
  productId?: string
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
    productId: r.product_id ?? undefined,
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

/** One matchmaker's row within a brand's section. */
export interface ClubStockHolder {
  holderId: string
  name: string
  barrels: number
  looseShuttles: number
  shuttles: number
}

/** A brand's stock across the whole club, and who is holding it. */
export interface ClubStockItem {
  productId: string
  brand: string
  model: string
  barrels: number
  looseShuttles: number
  shuttles: number
  /** Only the people actually holding this brand, most first. */
  holders: ClubStockHolder[]
}

export interface MyStock {
  holderName: string
  items: MyStockItem[]
  totalShuttles: number
  /**
   * The club picture — but only when somebody else is holding some of it.
   * A matchmaker who holds everything the club owns would otherwise get a
   * second card repeating their own figures back at them, which is what the
   * per-row "club" line used to do.
   */
  club: {
    /** One section per brand the club holds, each listing its holders. */
    items: ClubStockItem[]
    totalShuttles: number
  } | null
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

  // Every holding, not just this matchmaker's: the club card covers the whole
  // club, and a matchmaker may read them all (holdings_matchmaker_read). The
  // names come with it so the club table can say who holds what.
  const [{ data: holdings }, { data: products }, { data: people }] = await Promise.all([
    db.from('holdings').select('*'),
    db.from('products').select('*'),
    db.from('player_profiles').select('id, nickname'),
  ])
  const nameOf = new Map((people ?? []).map((p) => [p.id, p.nickname]))

  const byId = new Map((products ?? []).map((p) => [p.id, p]))
  const shuttlesOf = (h: { product_id: string; barrels: number; loose_shuttles: number }) => {
    const p = byId.get(h.product_id)
    return p ? h.barrels * p.shuttles_per_barrel + h.loose_shuttles : 0
  }
  const clubTotalShuttles = (holdings ?? []).reduce((s, h) => s + shuttlesOf(h), 0)
  const clubByProduct = new Map<string, { barrels: number; loose: number }>()
  for (const h of holdings ?? []) {
    const c = clubByProduct.get(h.product_id) ?? { barrels: 0, loose: 0 }
    c.barrels += h.barrels
    c.loose += h.loose_shuttles
    clubByProduct.set(h.product_id, c)
  }

  const items: MyStockItem[] = []
  for (const h of (holdings ?? []).filter((h) => h.holder_id === profile.id)) {
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
  const totalShuttles = items.reduce((s, i) => s + i.shuttles, 0)

  // Who holds each brand. Grouped by product rather than by person, because
  // the card is a section per brand — that way brands grow downward instead of
  // widening the table, and nobody needs a dash for a brand they never had.
  const holdersOfProduct = new Map<string, ClubStockHolder[]>()
  for (const h of holdings ?? []) {
    if (h.barrels === 0 && h.loose_shuttles === 0) continue
    const list = holdersOfProduct.get(h.product_id) ?? []
    list.push({
      holderId: h.holder_id,
      name: nameOf.get(h.holder_id) ?? 'Unknown',
      barrels: h.barrels,
      looseShuttles: h.loose_shuttles,
      shuttles: shuttlesOf(h),
    })
    holdersOfProduct.set(h.product_id, list)
  }
  for (const list of holdersOfProduct.values()) {
    list.sort((a, b) => b.shuttles - a.shuttles || a.name.localeCompare(b.name))
  }

  // Every brand the club is holding, including ones this matchmaker has none
  // of — the club card is the club's picture, not a second column on theirs.
  const clubItems: ClubStockItem[] = []
  for (const [productId, c] of clubByProduct) {
    const p = byId.get(productId)
    if (!p) continue
    if (c.barrels === 0 && c.loose === 0) continue
    clubItems.push({
      productId,
      brand: p.brand,
      model: p.model,
      barrels: c.barrels,
      looseShuttles: c.loose,
      shuttles: c.barrels * p.shuttles_per_barrel + c.loose,
      holders: holdersOfProduct.get(productId) ?? [],
    })
  }
  clubItems.sort((a, b) => a.brand.localeCompare(b.brand))

  return {
    holderName: profile.nickname,
    items,
    totalShuttles,
    // Nobody else holding anything means the club card would just be this one
    // again, so there is nothing to compare and no card to show.
    club:
      clubTotalShuttles > totalShuttles
        ? { items: clubItems, totalShuttles: clubTotalShuttles }
        : null,
  }
}
