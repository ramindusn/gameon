// Game-day shuttle usage (TASK-69.8). A matchmaker records how many shuttles a
// game day used, per brand, and that count is drawn out of a matchmaker's held
// stock — their own by default, or someone else's when the barrels were shared.
//
// This is a matchmaker-facing path, so it deliberately does not go through
// loadFund (which starts from the admins table and returns null for them). RLS
// backs each read: matchmakers may SELECT products/holdings and write usage.

import { deductUsage, type Product, type StockHolder } from '@gameon/domain'
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

  const [{ data: products }, { data: holdings }, { data: holders }] = await Promise.all([
    db.from('products').select('*'),
    db.from('holdings').select('*'),
    db
      .from('player_profiles')
      .select('id, nickname, user_id')
      .eq('club_id', clubId)
      .eq('is_matchmaker', true),
  ])

  return {
    clubId,
    products: (products ?? []).map((p) => ({
      id: p.id,
      brand: p.brand,
      model: p.model,
      shuttlesPerBarrel: p.shuttles_per_barrel,
      barrels: p.barrels,
      looseShuttles: p.loose_shuttles,
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

/**
 * Record a game day's usage: one entry, its per-brand items, and the stock
 * deduction for each line plus an audit entry naming who recorded it.
 *
 * Stock is checked against what the holder actually has before anything is
 * written, so a line that would take someone below zero fails the whole record
 * rather than leaving a half-applied deduction behind.
 */
export async function recordGameDayUsage(input: {
  ctx: StockContext
  sessionId: string
  lines: UsageLine[]
  occurredAt?: string
  /**
   * "No club stock was used" — some days are played on shuttles brought from
   * outside. Writes the entry with no items, so the day counts as answered and
   * drops off the missing-usage list, while nothing is deducted or costed.
   */
  none?: boolean
}): Promise<void> {
  const db = client()
  const { ctx, sessionId } = input
  const lines = input.none ? [] : input.lines.filter((l) => l.shuttlesUsed > 0)
  if (lines.length === 0 && !input.none) return

  // Work out every deduction first — if any is impossible, write nothing.
  const deductions = lines.map((line) => {
    const held = ctx.holdings.find(
      (h) => h.productId === line.product.id && h.holderId === line.holder.id,
    ) ?? { barrels: 0, looseShuttles: 0 }
    const next = deductUsage(line.product, held, line.shuttlesUsed)
    if (!next) {
      throw new Error(
        `${line.holder.name} does not have ${line.shuttlesUsed} ${line.product.brand} shuttles.`,
      )
    }
    return { line, held, next }
  })

  const { data: entry, error: eErr } = await db
    .from('usage_entries')
    .insert({
      club_id: ctx.clubId,
      session_id: sessionId,
      recorded_by: ctx.userId ?? null,
      logged_by: ctx.myName ?? null,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
    })
    .select()
    .single()
  if (eErr) throw eErr

  if (deductions.length === 0) return // "none from stock": the entry alone says it

  const { error: iErr } = await db.from('usage_items').insert(
    deductions.map(({ line }) => ({
      club_id: ctx.clubId,
      usage_id: entry.id,
      product_id: line.product.id,
      shuttles_used: line.shuttlesUsed,
      holder_id: line.holder.id,
    })),
  )
  if (iErr) throw iErr

  for (const { line, held, next } of deductions) {
    const { error: hErr } = await db
      .from('holdings')
      .update({
        barrels: next.barrels,
        loose_shuttles: next.looseShuttles,
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', line.product.id)
      .eq('holder_id', line.holder.id)
    if (hErr) throw hErr

    const { error: lErr } = await db.from('inventory_log').insert({
      club_id: ctx.clubId,
      actor_user_id: ctx.userId ?? null,
      actor_name: ctx.myName ?? null,
      holder_id: line.holder.id,
      product_id: line.product.id,
      holder_name: line.holder.name,
      product_label: `${line.product.brand} ${line.product.model}`.trim(),
      action: 'usage',
      barrels_delta: next.barrels - held.barrels,
      loose_delta: next.looseShuttles - held.looseShuttles,
      barrels_after: next.barrels,
      loose_after: next.looseShuttles,
      note: `${line.shuttlesUsed} shuttles used on a game day`,
    })
    if (lErr) throw lErr
  }
}

/** Session ids that already have usage recorded (including a "none" marker). */
export async function loadSessionsWithUsage(): Promise<string[]> {
  const db = client()
  const { data, error } = await db.from('usage_entries').select('session_id')
  if (error) throw error
  return [...new Set((data ?? []).map((r) => r.session_id).filter((id): id is string => !!id))]
}
