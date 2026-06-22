import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addContribution,
  addExpense,
  addMember,
  addProduct,
  addPurchase,
  loadFund,
  logUsage,
} from './api'

const FUND_KEY = ['fund'] as const

/** Load the admin's club id + fund state. */
export function useFund() {
  return useQuery({ queryKey: FUND_KEY, queryFn: loadFund })
}

/** Mutations that write fund data and refresh the dashboard on success. */
export function useFundMutations(clubId: string | undefined) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: FUND_KEY })
  const club = () => {
    if (!clubId) throw new Error('No club loaded')
    return clubId
  }

  return {
    addMember: useMutation({
      mutationFn: (name: string) => addMember(club(), name),
      onSuccess: invalidate,
    }),
    addContribution: useMutation({
      mutationFn: (v: { memberId: string; amount: number }) =>
        addContribution(club(), v.memberId, v.amount),
      onSuccess: invalidate,
    }),
    addProduct: useMutation({
      mutationFn: (v: { brand: string; model: string; shuttlesPerBarrel: number }) =>
        addProduct(club(), v),
      onSuccess: invalidate,
    }),
    addPurchase: useMutation({
      mutationFn: (v: {
        productId: string
        barrels: number
        pricePerBarrel: number
        currentBarrels: number
      }) => addPurchase(club(), v),
      onSuccess: invalidate,
    }),
    addExpense: useMutation({
      mutationFn: (v: { description: string; amount: number }) =>
        addExpense(club(), v.description, v.amount),
      onSuccess: invalidate,
    }),
    logUsage: useMutation({
      mutationFn: (v: { productId: string; shuttlesUsed: number }) =>
        logUsage(club(), v.productId, v.shuttlesUsed),
      onSuccess: invalidate,
    }),
  }
}
