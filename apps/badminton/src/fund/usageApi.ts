// Game-day shuttle usage (TASK-69.8). A matchmaker records how many shuttles a
// game day used, per brand, and that count is drawn out of a matchmaker's held
// stock — their own by default, or someone else's when the barrels were shared.
//
// This is a matchmaker-facing path, so it deliberately does not go through
// loadFund (which starts from the admins table and returns null for them). RLS
// backs each read; every write goes through an audited database function so the
// stock change and its log entry cannot come apart (TASK-79).

import type { Product, StockHolder } from '@gameon/domain'
import { supabase } from '@gameon/supabase'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export interface StockContext {
  clubId: string
  products: Product[]
  holders: StockHolder[]
  holdings: { productId: string; holderId: string; barrels: number; looseShuttles: number }[]
  /** The signed-in user's own holder row, when they are a matchmaker. */
  myHolderId?: string
  myName?: string
  userId?: string
  /** Admins record on other people's behalf, so nothing is preselected for them. */
  isAdmin?: boolean
  /**
   * What one shuttle of each product costs, by product id.
   *
   * Comes from product_shuttle_costs(), not from `purchases` — that table is
   * admin-only on purpose, being the club's whole spending history, and a
   * matchmaker only needs the unit cost (TASK-85). Empty when the call is not
   * permitted, which just means the card shows counts and no money.
   */
  costPerShuttle: Record<string, number>
}

/** Products, holders and holdings as a matchmaker is allowed to see them. */
export async function loadStockContext(): Promise<StockContext | null> {
  const db = client()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return null

  const { data: me } = await db
    .from('player_profiles')
    .select('id, nickname, club_id, is_matchmaker')
    .eq('user_id', user.id)
    .maybeSingle()

  // An admin need not be on the roster at all, so fall back to the admins table
  // for their club — they record usage on other people's behalf (TASK-72).
  const { data: admin } = await db.from('admins').select('club_id').limit(1).maybeSingle()
  const clubId = me?.club_id ?? admin?.club_id
  if (!clubId) return null

  const [{ data: products }, { data: holdings }, { data: holders }, { data: costs }] =
    await Promise.all([
      db.from('products').select('*'),
      db.from('holdings').select('*'),
      db
        .from('player_profiles')
        .select('id, nickname, user_id')
        .eq('club_id', clubId)
        .eq('is_matchmaker', true),
      db.rpc('product_shuttle_costs'),
    ])

  return {
    clubId,
    products: (products ?? []).map((p) => ({
      id: p.id,
      brand: p.brand,
      model: p.model,
      shuttlesPerBarrel: p.shuttles_per_barrel,
    })),
    holders: (holders ?? [])
      .map((h) => ({ id: h.id, name: h.nickname, userId: h.user_id ?? undefined }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    holdings: (holdings ?? []).map((h) => ({
      productId: h.product_id,
      holderId: h.holder_id,
      barrels: h.barrels,
      looseShuttles: h.loose_shuttles,
    })),
    costPerShuttle: Object.fromEntries(
      ((costs ?? []) as { product_id: string; cost_per_shuttle: number | string }[]).map((c) => [
        c.product_id,
        Number(c.cost_per_shuttle) || 0,
      ]),
    ),
    myHolderId: me?.is_matchmaker ? me.id : undefined,
    myName: me?.nickname,
    userId: user.id,
    isAdmin: !!admin,
  }
}

export interface UsageLine {
  product: Product
  /** Whose barrels this came out of — defaults to the recorder, overridable. */
  holder: StockHolder
  shuttlesUsed: number
}

export interface RecordedUsage {
  entryId: string
  sessionId: string
  occurredAt: string
  /** Who keyed it in — the entry's logged_by, kept as text at write time. */
  loggedBy?: string
  recordedBy?: string
  items: {
    productId: string
    brand: string
    shuttlesUsed: number
    holderId?: string
    holderName?: string
  }[]
}

/** Usage already recorded against a game day, newest first. */
export async function loadSessionUsage(sessionId: string): Promise<RecordedUsage[]> {
  const db = client()
  const { data: entries, error } = await db
    .from('usage_entries')
    .select('*')
    .eq('session_id', sessionId)
    .order('occurred_at', { ascending: false })
  if (error) throw error
  if (!entries?.length) return []

  const [{ data: items }, { data: products }, { data: profiles }] = await Promise.all([
    db
      .from('usage_items')
      .select('*')
      .in(
        'usage_id',
        entries.map((e) => e.id),
      ),
    db.from('products').select('id, brand'),
    db.from('player_profiles').select('id, nickname'),
  ])
  const brandOf = new Map((products ?? []).map((p) => [p.id, p.brand]))
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.nickname]))

  return entries.map((e) => ({
    entryId: e.id,
    sessionId,
    occurredAt: e.occurred_at,
    loggedBy: e.logged_by ?? undefined,
    recordedBy: e.recorded_by ?? undefined,
    items: (items ?? [])
      .filter((i) => i.usage_id === e.id)
      .map((i) => ({
        productId: i.product_id,
        brand: brandOf.get(i.product_id) ?? 'Unknown',
        shuttlesUsed: i.shuttles_used,
        holderId: i.holder_id ?? undefined,
        holderName: i.holder_id ? nameOf.get(i.holder_id) : undefined,
      })),
  }))
}

/** What one game day used, per brand — biggest first. */
export interface SessionUsageTotal {
  brand: string
  shuttles: number
}

/**
 * Shuttles used per game day, keyed by session id.
 *
 * One query for every day rather than one per row: the history list shows a
 * dozen game days, and asking separately for each would be a dozen round trips
 * to render a single card.
 *
 * Days with nothing recorded are simply absent, as are entries with no session
 * (the two June ones predate game-day linking).
 */
export async function loadUsageBySession(): Promise<Record<string, SessionUsageTotal[]>> {
  const db = client()
  const [{ data: entries }, { data: items }, { data: products }] = await Promise.all([
    db.from('usage_entries').select('id, session_id'),
    db.from('usage_items').select('usage_id, product_id, shuttles_used'),
    db.from('products').select('id, brand'),
  ])

  const sessionOf = new Map(
    (entries ?? []).filter((e) => e.session_id).map((e) => [e.id, e.session_id as string]),
  )
  const brandOf = new Map((products ?? []).map((p) => [p.id, p.brand]))

  // session -> brand -> shuttles. A day can be recorded more than once, and a
  // brand can appear in several of those entries, so both have to sum.
  const bySession = new Map<string, Map<string, number>>()
  for (const i of items ?? []) {
    const sessionId = sessionOf.get(i.usage_id)
    if (!sessionId) continue
    const brand = brandOf.get(i.product_id) ?? 'Unknown'
    const perBrand = bySession.get(sessionId) ?? new Map<string, number>()
    perBrand.set(brand, (perBrand.get(brand) ?? 0) + i.shuttles_used)
    bySession.set(sessionId, perBrand)
  }

  const out: Record<string, SessionUsageTotal[]> = {}
  for (const [sessionId, perBrand] of bySession) {
    out[sessionId] = [...perBrand.entries()]
      .map(([brand, shuttles]) => ({ brand, shuttles }))
      .sort((a, b) => b.shuttles - a.shuttles || a.brand.localeCompare(b.brand))
  }
  return out
}

/**
 * Record a game day's shuttle usage.
 *
 * The entry, its items, the drawdown from each holder and the audit rows all
 * happen inside record_game_day_usage() (TASK-79). As separate client calls the
 * stock could be deducted with nothing recording it, or an entry could be left
 * behind with no drawdown; the database now does the lot or none of it, and
 * checks the caller is a matchmaker or an admin.
 *
 * `none: true` — some days are played on shuttles brought from outside. Writes
 * the entry with no items, so the day counts as answered and drops off the
 * missing-usage list, while nothing is deducted or costed.
 */
export async function recordGameDayUsage(input: {
  ctx: StockContext
  sessionId: string
  lines: UsageLine[]
  occurredAt?: string
  none?: boolean
}): Promise<void> {
  const db = client()
  const lines = input.none ? [] : input.lines.filter((l) => l.shuttlesUsed > 0)
  if (lines.length === 0 && !input.none) return

  const { error } = await db.rpc('record_game_day_usage', {
    p_session_id: input.sessionId,
    p_lines: lines.map((l) => ({
      product_id: l.product.id,
      holder_id: l.holder.id,
      shuttles_used: l.shuttlesUsed,
    })),
    p_occurred_at: input.occurredAt ?? new Date().toISOString(),
  })
  if (error) throw error
}

/**
 * Record shuttles used on an evening with no game day behind it (TASK-95).
 *
 * Shuttles get used whether or not a game day row survives to hold the record —
 * most sharply when a day is deleted after being played, which is what left a
 * holder short with no way to say so on 2026-08-26. The club is passed rather
 * than inferred, because there is no game day to take it from.
 *
 * Admin-only, and enforced in record_standalone_usage() rather than here: an
 * entry attached to nothing is a correction, and corrections belong with the
 * admin. A matchmaker records against the day they just played.
 */
export async function recordStandaloneUsage(input: {
  ctx: StockContext
  lines: UsageLine[]
  occurredAt: string
  note?: string
}): Promise<void> {
  const db = client()
  const lines = input.lines.filter((l) => l.shuttlesUsed > 0)
  if (lines.length === 0) return

  const { error } = await db.rpc('record_standalone_usage', {
    p_club_id: input.ctx.clubId,
    p_lines: lines.map((l) => ({
      product_id: l.product.id,
      holder_id: l.holder.id,
      shuttles_used: l.shuttlesUsed,
    })),
    p_occurred_at: input.occurredAt,
    p_note: input.note?.trim() || undefined,
  })
  if (error) throw error
}

/** Session ids that already have usage recorded (including a "none" marker). */
export async function loadSessionsWithUsage(): Promise<string[]> {
  const db = client()
  const { data, error } = await db.from('usage_entries').select('session_id')
  if (error) throw error
  return [...new Set((data ?? []).map((r) => r.session_id).filter((id): id is string => !!id))]
}

/**
 * Give a deleted usage entry's shuttles back to whoever they came out of.
 *
 * Recording usage deducts from `holdings` (the authoritative store since
 * TASK-69) and logs it. Deleting used to credit `products.barrels` instead —
 * the deprecated club-wide pool, which nothing displays — so the shuttles
 * vanished from every total and the holder never got them back, while the
 * audit trail still showed the deduction standing.
 *
 * The work happens in restore_usage_holdings() rather than here (TASK-78): as
 * three client-side writes the audit entry was advisory, and nothing made a
 * caller write it. In the database the credit and its log entry are one
 * transaction that cannot be half-done or skipped, it checks the caller owned
 * the entry, and it is the only route by which a matchmaker may increase a
 * holding — direct increases are refused by a trigger.
 *
 * Entries predating per-holder stock have no holder, so nothing is credited and
 * this returns 0.
 *
 * Call this BEFORE removing the entry: if the credit fails, the entry stays and
 * the numbers stay consistent.
 *
 * @returns how many holdings were credited.
 */
export async function restoreUsageHoldings(usageId: string): Promise<number> {
  const db = client()
  const { data, error } = await db.rpc('restore_usage_holdings', { p_usage_id: usageId })
  if (error) throw error
  return typeof data === 'number' ? data : 0
}
