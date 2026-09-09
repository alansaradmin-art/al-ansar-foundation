import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as expensesService from '@/services/expenses'
import type { ExpenseFilters } from '@/services/expenses'
import type { ExpenseFormValues } from '@/schemas/expense.schema'
import type { ApprovalAction, FinancialRoleCode } from '@/types'

export function useExpenses(filters: ExpenseFilters) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: () => expensesService.listExpenses(getToken, filters),
    placeholderData: (prev) => prev,
  })
}

function invalidateExpenses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['expenses'] })
  // A Paid/Cancelled transition changes fund balances (§G) — see
  // supabase/migrations/0042's fund_balances_summary().
  queryClient.invalidateQueries({ queryKey: queryKeys.funds.balances })
}

export function useCreateExpense() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ExpenseFormValues) => expensesService.createExpense(getToken, values),
    onSuccess: () => invalidateExpenses(queryClient),
  })
}

export function useUpdateExpense() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ExpenseFormValues }) => expensesService.updateExpense(getToken, id, values),
    onSuccess: () => invalidateExpenses(queryClient),
  })
}

export function useSubmitExpense() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesService.submitExpense(getToken, id),
    onSuccess: () => invalidateExpenses(queryClient),
  })
}

export function useSignExpense() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      roleCode,
      decision,
      comment,
    }: {
      id: string
      roleCode: FinancialRoleCode
      decision: ApprovalAction
      comment?: string
    }) => expensesService.signExpense(getToken, id, roleCode, decision, comment),
    onSuccess: () => invalidateExpenses(queryClient),
  })
}

export function useOverrideApproveExpense() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => expensesService.overrideApproveExpense(getToken, id, reason),
    onSuccess: () => invalidateExpenses(queryClient),
  })
}

export function useReopenExpense() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesService.reopenExpense(getToken, id),
    onSuccess: () => invalidateExpenses(queryClient),
  })
}

export function useMarkExpensePaid() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paymentMethodId, transactionReference }: { id: string; paymentMethodId: string; transactionReference?: string }) =>
      expensesService.markExpensePaid(getToken, id, paymentMethodId, transactionReference),
    onSuccess: () => invalidateExpenses(queryClient),
  })
}

export function useCancelExpense() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => expensesService.cancelExpense(getToken, id, reason),
    onSuccess: () => invalidateExpenses(queryClient),
  })
}
