import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addCash as rAddCash,
  addExpense as rAddExpense,
  addMember as rAddMember,
  addProduct as rAddProduct,
  deleteProduct as rDeleteProduct,
  deleteTransaction as rDeleteTransaction,
  emptyFundState,
  recordUsage as rRecordUsage,
  updateBatchPrice as rUpdateBatchPrice,
  updateProduct as rUpdateProduct,
  type FundState,
  type NewProductInput,
  type ProductDetails,
  type TxRef,
} from '@gameon/domain'
import { isSupabaseConfigured } from '@gameon/supabase'
import { loadFund, type FundData } from './api'
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

  async function apply(mutate: (s: FundState) => FundState) {
    const current = qc.getQueryData<FundData | null>(FUND_KEY) ?? data
    const baseline = current?.state ?? emptyFundState()
    const clubId = current?.clubId
    const next = mutate(baseline)

    qc.setQueryData<FundData | null>(FUND_KEY, (prev) => (prev ? { ...prev, state: next } : prev))
    if (clubId && cloudBacked) {
      try {
        await syncState(clubId, baseline, next)
      } finally {
        void qc.invalidateQueries({ queryKey: FUND_KEY })
      }
    }
  }

  return {
    state: data?.state ?? emptyFundState(),
    clubId: data?.clubId,
    hasClub: !!data,
    cloudBacked,
    isLoading: query.isLoading,
    isError: query.isError,
    // actions (mirror the prototype's AppContext API)
    addProduct: (input: NewProductInput) => apply((s) => rAddProduct(s, input)),
    updateProduct: (id: string, details: ProductDetails) =>
      apply((s) => rUpdateProduct(s, id, details)),
    deleteProduct: (id: string) => apply((s) => rDeleteProduct(s, id)),
    updateBatchPrice: (id: string, price: number) =>
      apply((s) => rUpdateBatchPrice(s, id, price)),
    recordUsage: (date: string, items: { productId: string; shuttlesUsed: number }[]) =>
      apply((s) => rRecordUsage(s, date, items)),
    addMember: (name: string, cash: number, when?: string) =>
      apply((s) => rAddMember(s, name, cash, when)),
    addCash: (memberId: string, amount: number, when?: string) =>
      apply((s) => rAddCash(s, memberId, amount, when)),
    addExpense: (description: string, amount: number, when?: string) =>
      apply((s) => rAddExpense(s, description, amount, when)),
    deleteTransaction: (ref: TxRef) => apply((s) => rDeleteTransaction(s, ref)),
  }
}
