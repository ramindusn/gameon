import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addCash as rAddCash,
  addExpense as rAddExpense,
  addMember as rAddMember,
  addProduct as rAddProduct,
  holderForUser,
  deleteProduct as rDeleteProduct,
  deleteTransaction as rDeleteTransaction,
  emptyFundState,
  updateBatchPrice as rUpdateBatchPrice,
  updateProduct as rUpdateProduct,
  type FundState,
  type NewProductInput,
  type ProductDetails,
  type StockHolder,
  type TxRef,
} from '@gameon/domain'
import { isSupabaseConfigured } from '@gameon/supabase'
import {
  deleteHolding,
  loadFund,
  saveStockChange,
  transferStock,
  type FundData,
  type StockChangeInput,
  type TransferInput,
} from './api'
import { restoreUsageHoldings } from './usageApi'
import { syncState } from './sync'

const FUND_KEY = ['fund'] as const

/**
 * Fund/inventory state + actions for the admin dashboard. Reads via TanStack
 * Query (ADR 0006); each action applies a pure @gameon/domain reducer, updates
 * the cache optimistically, then persists the diff to Supabase and refetches.
 */
export function useFund() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: FUND_KEY, queryFn: loadFund })
  const data = query.data ?? null
  const cloudBacked = isSupabaseConfigured
  const loggedBy = data?.loggerLabel

  async function apply(mutate: (s: FundState) => FundState): Promise<FundState> {
    const current = qc.getQueryData<FundData | null>(FUND_KEY) ?? data
    const baseline = current?.state ?? emptyFundState()
    const clubId = current?.clubId
    const next = mutate(baseline)

    qc.setQueryData<FundData | null>(FUND_KEY, (prev) =>
      prev ? { ...prev, state: next } : prev,
    )
    if (clubId && cloudBacked) {
      try {
        await syncState(clubId, baseline, next)
      } finally {
        void qc.invalidateQueries({ queryKey: FUND_KEY })
      }
    }
    return next
  }

  const state = data?.state ?? emptyFundState()

  /**
   * Apply a stock change. Unlike the reducers above this does not go through the
   * state diff: the change must also append an audit entry naming the admin who
   * made it, so it is written directly and the cache refetched.
   */
  async function changeStock(
    input: Omit<StockChangeInput, 'clubId' | 'actorUserId' | 'actorName'>,
  ): Promise<void> {
    const clubId = data?.clubId
    if (!clubId || !cloudBacked) return
    try {
      await saveStockChange({
        ...input,
        clubId,
        actorUserId: data?.userId,
        actorName: loggedBy,
      })
    } finally {
      void qc.invalidateQueries({ queryKey: FUND_KEY })
    }
  }

  return {
    state,
    clubId: data?.clubId,
    playerCount: data?.playerCount ?? 0,
    hasClub: !!data,
    /** The matchmaker the signed-in user holds stock as, if any. */
    myHolder: holderForUser(state, data?.userId),
    cloudBacked,
    isLoading: query.isLoading,
    isError: query.isError,
    // actions (mirror the prototype's AppContext API). The signed-in admin's
    // label is stamped onto each new transaction automatically.
    /**
     * Add stock. The matchmaker who will keep it is required: every barrel
     * belongs to someone, so the purchase and the allocation happen together
     * rather than as two steps an admin could forget to finish.
     */
    addProduct: async (
      input: NewProductInput & { looseShuttles?: number },
      holder: StockHolder,
    ) => {
      const next = await apply((s) => rAddProduct(s, { ...input, loggedBy }))
      const clubId = data?.clubId
      // addProduct appends, so the new product is the last one.
      const product = next.products[next.products.length - 1]
      if (!product || !clubId || !cloudBacked) return
      try {
        await saveStockChange({
          clubId,
          actorUserId: data?.userId,
          actorName: loggedBy,
          holder,
          product,
          barrels: input.barrels,
          looseShuttles: input.looseShuttles ?? 0,
          prevBarrels: 0,
          prevLooseShuttles: 0,
          action: 'allocate',
          note: `New stock kept by ${holder.name}`,
        })
      } catch (err) {
        // Allocation is mandatory, so the two writes have to stand or fall
        // together: if the stock could not be handed to anyone, undo the
        // product (and its purchase) rather than leave it unallocated.
        await apply((s) => rDeleteProduct(s, product.id))
        throw err
      } finally {
        void qc.invalidateQueries({ queryKey: FUND_KEY })
      }
    },
    updateProduct: (id: string, details: ProductDetails) =>
      apply((s) => rUpdateProduct(s, id, details)),
    deleteProduct: (id: string) => apply((s) => rDeleteProduct(s, id)),
    updateBatchPrice: (id: string, price: number) =>
      apply((s) => rUpdateBatchPrice(s, id, price)),
    addMember: (name: string, cash: number, when?: string, email?: string) =>
      apply((s) => rAddMember(s, name, cash, when, loggedBy, email)),
    addCash: (memberId: string, amount: number, when?: string) =>
      apply((s) => rAddCash(s, memberId, amount, when, loggedBy)),
    addExpense: (description: string, amount: number, when?: string) =>
      apply((s) => rAddExpense(s, description, amount, when, loggedBy)),
    /**
     * Deleting usage has to give the shuttles back to the matchmaker they came
     * out of, which lives in `holdings` — the reducer only drops the entry.
     * The credit goes first: if it fails, the entry stays and the numbers stay
     * consistent rather than the stock silently going missing.
     */
    deleteTransaction: async (ref: TxRef) => {
      if (ref.kind === 'usage' && cloudBacked) {
        await restoreUsageHoldings(ref.id)
      }
      const next = await apply((s) => rDeleteTransaction(s, ref))
      if (ref.kind === 'usage' && cloudBacked) {
        // Stock totals and the audit log are read through their own queries.
        void qc.invalidateQueries({ queryKey: FUND_KEY })
        void qc.invalidateQueries({ queryKey: ['my-stock'] })
        void qc.invalidateQueries({ queryKey: ['stock-context'] })
        void qc.invalidateQueries({ queryKey: ['inventory-log'] })
      }
      return next
    },
    // Stock (TASK-69): written directly so each change is audited.
    changeStock,
    /** Remove a matchmaker's stock record for one product (audited). */
    removeHolding: async (
      input: Parameters<typeof deleteHolding>[0] extends infer T
        ? T extends { clubId: string }
          ? Omit<T, 'clubId' | 'actorUserId' | 'actorName'>
          : never
        : never,
    ) => {
      const clubId = data?.clubId
      if (!clubId || !cloudBacked) return
      try {
        await deleteHolding({
          ...input,
          clubId,
          actorUserId: data?.userId,
          actorName: loggedBy,
        })
      } finally {
        void qc.invalidateQueries({ queryKey: FUND_KEY })
      }
    },
    /** Hand barrels from one matchmaker to another (both sides audited). */
    transfer: async (
      input: Omit<TransferInput, 'clubId' | 'actorUserId' | 'actorName'>,
    ) => {
      const clubId = data?.clubId
      if (!clubId || !cloudBacked) return
      try {
        await transferStock({
          ...input,
          clubId,
          actorUserId: data?.userId,
          actorName: loggedBy,
        })
      } finally {
        void qc.invalidateQueries({ queryKey: FUND_KEY })
      }
    },
  }
}
