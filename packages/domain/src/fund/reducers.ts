// Pure fund/inventory state transitions (E06). Ported from the prototype's
// AppContext reducers as FundState -> FundState functions so the UI layer can
// stay thin and the reversal logic (delete a transaction, restore stock) is
// unit-testable. Every function returns a new state and never mutates input.

import { nowLocalInput, uid } from './format'
import type { FundState, Product } from './types'

export interface NewProductInput {
  brand: string
  model: string
  shuttlesPerBarrel: number
  pricePerBarrel: number
  barrels: number
  note?: string
  when?: string
  loggedBy?: string
}

/**
 * Editable fields of a product: what it is, not how much of it there is.
 * Correcting a count is Adjust on the matchmaker holding it (TASK-82) — stock
 * belongs to people now, so a product-level count would be correcting nobody's.
 */
export type ProductDetails = Pick<Product, 'brand' | 'model' | 'shuttlesPerBarrel'>

/** Identifies a single deletable transaction in the fund log. */
export type TxRef =
  | { kind: 'contribution'; memberId: string; id: string }
  | { kind: 'purchase'; id: string }
  | { kind: 'expense'; id: string }
  | { kind: 'usage'; id: string }

const now = () => nowLocalInput()

/** Add a product as an opening purchase batch (the fund drops by barrels × price). */
export function addProduct(s: FundState, input: NewProductInput): FundState {
  const product: Product = {
    id: uid(),
    brand: input.brand.trim(),
    model: input.model.trim(),
    shuttlesPerBarrel: input.shuttlesPerBarrel,
  }
  const purchase = {
    id: uid(),
    productId: product.id,
    barrels: input.barrels,
    pricePerBarrel: input.pricePerBarrel,
    date: input.when || now(),
    note: input.note?.trim() || 'New product stock',
    loggedBy: input.loggedBy,
  }
  return {
    ...s,
    products: [...s.products, product],
    purchases: input.barrels > 0 ? [...s.purchases, purchase] : s.purchases,
  }
}

/** Manual stock/description correction (does not change the fund). */
export function updateProduct(
  s: FundState,
  id: string,
  details: ProductDetails,
): FundState {
  return {
    ...s,
    products: s.products.map((p) =>
      p.id === id
        ? {
            ...p,
            brand: details.brand.trim(),
            model: details.model.trim(),
            shuttlesPerBarrel: details.shuttlesPerBarrel,
          }
        : p,
    ),
  }
}

/** Change the fixed price of an existing purchase batch. */
export function updateBatchPrice(
  s: FundState,
  purchaseId: string,
  pricePerBarrel: number,
): FundState {
  if (pricePerBarrel < 0) return s
  return {
    ...s,
    purchases: s.purchases.map((p) =>
      p.id === purchaseId ? { ...p, pricePerBarrel } : p,
    ),
  }
}

export function deleteProduct(s: FundState, id: string): FundState {
  return {
    ...s,
    products: s.products.filter((p) => p.id !== id),
    purchases: s.purchases.filter((p) => p.productId !== id),
    usage: s.usage
      .map((u) => ({ ...u, items: u.items.filter((i) => i.productId !== id) }))
      .filter((u) => u.items.length > 0),
  }
}

// recordUsage() is gone with the pool it wrote (TASK-83). Usage is recorded by
// record_game_day_usage() in the database, which draws down the holder's stock
// and audits it; nothing in the app had called this since.

export function addMember(
  s: FundState,
  name: string,
  initialCash: number,
  when?: string,
  loggedBy?: string,
  email?: string,
): FundState {
  return {
    ...s,
    members: [
      ...s.members,
      {
        id: uid(),
        name: name.trim(),
        email: email?.trim() || undefined,
        contributions:
          initialCash > 0
            ? [{ id: uid(), amount: initialCash, date: when || now(), loggedBy }]
            : [],
      },
    ],
  }
}

export function addCash(
  s: FundState,
  memberId: string,
  amount: number,
  when?: string,
  loggedBy?: string,
): FundState {
  if (amount <= 0) return s
  return {
    ...s,
    members: s.members.map((m) =>
      m.id === memberId
        ? {
            ...m,
            contributions: [
              ...m.contributions,
              { id: uid(), amount, date: when || now(), loggedBy },
            ],
          }
        : m,
    ),
  }
}

export function addExpense(
  s: FundState,
  description: string,
  amount: number,
  when?: string,
  loggedBy?: string,
): FundState {
  if (amount <= 0) return s
  return {
    ...s,
    expenses: [
      ...s.expenses,
      {
        id: uid(),
        description: description.trim(),
        amount,
        date: when || now(),
        loggedBy,
      },
    ],
  }
}

/**
 * Delete any single transaction and reverse its effect so the fund and
 * inventory stay consistent:
 *  - contribution → removes the member's cash (fund down)
 *  - expense      → removes the expense (fund up)
 *  - purchase     → removes the batch and its barrels from stock; if it was the
 *                   product's last batch, the product row is removed entirely
 *  - usage        → removes the usage and returns those shuttles to stock
 */
export function deleteTransaction(s: FundState, ref: TxRef): FundState {
  switch (ref.kind) {
    case 'contribution':
      return {
        ...s,
        members: s.members.map((m) =>
          m.id === ref.memberId
            ? { ...m, contributions: m.contributions.filter((c) => c.id !== ref.id) }
            : m,
        ),
      }
    case 'expense':
      return { ...s, expenses: s.expenses.filter((e) => e.id !== ref.id) }
    case 'purchase': {
      const purchase = s.purchases.find((p) => p.id === ref.id)
      const purchases = s.purchases.filter((p) => p.id !== ref.id)
      if (!purchase) return { ...s, purchases }
      const hasRemainingBatch = purchases.some((p) => p.productId === purchase.productId)
      if (!hasRemainingBatch) {
        return {
          ...s,
          purchases,
          products: s.products.filter((p) => p.id !== purchase.productId),
          usage: s.usage
            .map((u) => ({
              ...u,
              items: u.items.filter((i) => i.productId !== purchase.productId),
            }))
            .filter((u) => u.items.length > 0),
        }
      }
      // Only the cost. A purchase names no holder, so nothing can know whose
      // stock to reduce — and stock is not a property of the product any more.
      // Putting the barrels back is an explicit Adjust on whoever has them.
      return { ...s, purchases }
    }
    case 'usage': {
      // Only drops the entry. The shuttles go back to the matchmaker they came
      // out of, which restoreUsageHoldings() does in the database — this
      // reducer has no holder to credit and, since TASK-83, no pool to credit
      // either. Crediting that pool is what lost them in the first place.
      return { ...s, usage: s.usage.filter((u) => u.id !== ref.id) }
    }
  }
}

/** An empty fund state — the starting point before hydration. */
export function emptyFundState(): FundState {
  return {
    members: [],
    products: [],
    purchases: [],
    usage: [],
    expenses: [],
    holders: [],
    holdings: [],
  }
}
